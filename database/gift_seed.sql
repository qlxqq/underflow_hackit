-- ============================================================
-- Card gifts: a player sends a SPARE copy of an island card to a friend.
--
--  * A spare comes from a duplicate: when a mini-game or NPC hands out a card the player already owns, the
--    duplicate still pays coins and XP, and also adds one spare to that card (album_cards.spares, at most 5).
--  * Sending a gift uses one spare, so the sender always keeps the card itself.
--  * The gift arrives LOCKED. The friend opens it on pages/gift/gift.html: type the word from its English
--    meaning, say it, write a sentence with it. Only then is the card added to their collection (gift_claim).
--  * Limits: friends only, 3 gifts a day (Singapore time), 3 waiting gifts per friend, a friend who already
--    owns the card cannot be sent it, and a gift nobody opens expires after 7 days. A cancelled, declined or
--    expired gift gives the spare back.
--  * Both players earn XP when a gift is opened: 15 for the friend, 10 for the sender (change below).
--
-- Run once in the Supabase SQL editor. Safe to run again.
-- Needs the friends functions (my_friendships) that friends.js already uses.
-- ============================================================

-- ---------- spares on album cards ----------
alter table public.album_cards add column if not exists spares integer not null default 0;
alter table public.album_cards drop constraint if exists album_cards_spares_range;
alter table public.album_cards add constraint album_cards_spares_range check (spares between 0 and 5);

-- ---------- the gifts ----------
create table if not exists public.card_gifts (
  gift_id      uuid primary key default gen_random_uuid(),
  sender_id    uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  album_id     varchar(40)  not null,
  language     varchar(10)  not null,
  word         varchar(255) not null,
  meaning      text,                       -- shown to the friend (the sender's app fills these in)
  romanization text,
  status       text not null default 'pending'
               check (status in ('pending', 'claimed', 'cancelled', 'declined', 'expired')),
  sentence     text,                       -- the friend's own sentence, saved when they open it
  created_at   timestamptz not null default now(),
  claimed_at   timestamptz,
  constraint gift_not_self check (sender_id <> recipient_id)
);
create index if not exists card_gifts_recipient_idx on public.card_gifts (recipient_id, status);
create index if not exists card_gifts_sender_idx on public.card_gifts (sender_id, created_at);

alter table public.card_gifts enable row level security;
drop policy if exists "gifts select own" on public.card_gifts;
create policy "gifts select own" on public.card_gifts for select to authenticated
  using (auth.uid() = sender_id or auth.uid() = recipient_id);
-- no insert / update / delete policies: everything goes through the functions below

-- ---------- a duplicate adds a spare ----------
create or replace function public.card_spare_add(p_album text, p_language text, p_word text)
returns integer language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  update album_cards set spares = least(spares + 1, 5)
   where user_id = auth.uid() and album_id = p_album and language = p_language and word = p_word
  returning spares into n;
  return coalesce(n, 0);
end $$;

-- ---------- expired gifts give their spare back (runs whenever gifts are listed) ----------
create or replace function public.gift_sweep() returns void
language plpgsql security definer set search_path = public as $$
begin
  with gone as (
    update card_gifts set status = 'expired'
     where status = 'pending' and created_at < now() - interval '7 days'
    returning sender_id, album_id, language, word
  )
  update album_cards c set spares = least(c.spares + 1, 5)
    from gone g
   where c.user_id = g.sender_id and c.album_id = g.album_id and c.language = g.language and c.word = g.word;
end $$;

-- ---------- send ----------
create or replace function public.gift_send(
  p_friend_id uuid, p_album text, p_language text, p_word text, p_meaning text, p_roman text
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  today_start timestamptz := (date_trunc('day', now() at time zone 'Asia/Singapore') at time zone 'Asia/Singapore');
  new_id uuid;
begin
  if me is null then raise exception 'not signed in'; end if;
  perform gift_sweep();

  if not exists (select 1 from my_friendships() f where f.friend_id = p_friend_id and f.state = 'accepted') then
    raise exception 'you can only send gifts to friends';
  end if;
  if (select count(*) from card_gifts where sender_id = me and created_at >= today_start) >= 3 then
    raise exception 'you can send 3 gifts a day. Try again tomorrow';
  end if;
  if (select count(*) from card_gifts where sender_id = me and recipient_id = p_friend_id and status = 'pending') >= 3 then
    raise exception 'this friend already has 3 gifts waiting for them';
  end if;
  if exists (select 1 from album_cards where user_id = p_friend_id and album_id = p_album and language = p_language and word = p_word) then
    raise exception 'your friend already has this card';
  end if;
  if exists (select 1 from card_gifts where sender_id = me and recipient_id = p_friend_id and album_id = p_album
                and language = p_language and word = p_word and status = 'pending') then
    raise exception 'you already sent this card to this friend';
  end if;

  -- take one spare (this is also the check that the player really has one)
  update album_cards set spares = spares - 1
   where user_id = me and album_id = p_album and language = p_language and word = p_word and spares > 0;
  if not found then raise exception 'you have no spare copy of this card'; end if;

  insert into card_gifts (sender_id, recipient_id, album_id, language, word, meaning, romanization)
  values (me, p_friend_id, p_album, p_language, p_word, left(p_meaning, 200), left(p_roman, 100))
  returning gift_id into new_id;
  return new_id;
end $$;

-- ---------- waiting gifts, both directions ----------
create or replace function public.gift_my_open()
returns table (gift_id uuid, other_username text, is_incoming boolean, album_id text, language text, word text,
               meaning text, romanization text, created_at timestamptz, expires_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'not signed in'; end if;
  perform gift_sweep();
  return query
    select g.gift_id,
           (select p.username::text from profiles p where p.user_id = case when g.recipient_id = me then g.sender_id else g.recipient_id end),
           (g.recipient_id = me),
           g.album_id::text, g.language::text, g.word::text, g.meaning, g.romanization, g.created_at,
           g.created_at + interval '7 days'
      from card_gifts g
     where g.status = 'pending' and (g.sender_id = me or g.recipient_id = me)
     order by g.created_at desc;
end $$;

-- ---------- the sender takes a gift back ----------
create or replace function public.gift_cancel(p_gift uuid) returns void
language plpgsql security definer set search_path = public as $$
declare g card_gifts;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  update card_gifts set status = 'cancelled' where gift_id = p_gift and sender_id = auth.uid() and status = 'pending' returning * into g;
  if not found then raise exception 'this gift is no longer waiting'; end if;
  update album_cards set spares = least(spares + 1, 5)
   where user_id = g.sender_id and album_id = g.album_id and language = g.language and word = g.word;
end $$;

-- ---------- the friend says no thanks ----------
create or replace function public.gift_decline(p_gift uuid) returns void
language plpgsql security definer set search_path = public as $$
declare g card_gifts;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  update card_gifts set status = 'declined' where gift_id = p_gift and recipient_id = auth.uid() and status = 'pending' returning * into g;
  if not found then raise exception 'this gift is no longer waiting'; end if;
  update album_cards set spares = least(spares + 1, 5)
   where user_id = g.sender_id and album_id = g.album_id and language = g.language and word = g.word;
end $$;

-- ---------- the friend opens it (after typing, saying and writing) ----------
-- The page checks the three steps; the sentence is checked here as well (it must contain the word).
create or replace function public.gift_claim(p_gift uuid, p_sentence text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  g card_gifts;
  added integer := 0;
  RECIPIENT_XP constant integer := 15;   -- XP for the friend who opens the gift
  SENDER_XP    constant integer := 10;   -- XP for the sender when it is opened
begin
  if me is null then raise exception 'not signed in'; end if;
  select * into g from card_gifts where gift_id = p_gift and recipient_id = me and status = 'pending' for update;
  if not found then raise exception 'this gift is no longer waiting'; end if;
  if char_length(trim(coalesce(p_sentence, ''))) < 2 or char_length(p_sentence) > 200 then
    raise exception 'write a short sentence first';
  end if;

  insert into album_cards (user_id, album_id, language, word, source)
  values (me, g.album_id, g.language, g.word, 'gift')
  on conflict (user_id, album_id, language, word) do nothing;
  get diagnostics added = row_count;

  update card_gifts set status = 'claimed', claimed_at = now(), sentence = trim(p_sentence) where gift_id = g.gift_id;
  update profiles set xp = xp + RECIPIENT_XP where user_id = me;
  update profiles set xp = xp + SENDER_XP where user_id = g.sender_id;

  return jsonb_build_object('added', added = 1, 'xp', RECIPIENT_XP, 'word', g.word, 'album', g.album_id, 'language', g.language);
end $$;

revoke all on function public.card_spare_add(text, text, text) from public, anon;
revoke all on function public.gift_sweep() from public, anon, authenticated;
revoke all on function public.gift_send(uuid, text, text, text, text, text) from public, anon;
revoke all on function public.gift_my_open() from public, anon;
revoke all on function public.gift_cancel(uuid) from public, anon;
revoke all on function public.gift_decline(uuid) from public, anon;
revoke all on function public.gift_claim(uuid, text) from public, anon;
grant execute on function public.card_spare_add(text, text, text) to authenticated;
grant execute on function public.gift_send(uuid, text, text, text, text, text) to authenticated;
grant execute on function public.gift_my_open() to authenticated;
grant execute on function public.gift_cancel(uuid) to authenticated;
grant execute on function public.gift_decline(uuid) to authenticated;
grant execute on function public.gift_claim(uuid, text) to authenticated;