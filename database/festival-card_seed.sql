-- ============================================================
-- FESTIVAL CARDS: one card per word found on a treasure hunt.
-- Paste into the Supabase SQL Editor and run. Safe to run again.
--
--   * festival_cards is its own table, NOT album_cards, so a hunt card can never be gifted, used by the gift functions,
--     dealt in card battles or mixed with captured/island cards. Players can only READ their own rows.
--   * festival_claim (called by the festival-verify function) now also creates the card when a word is found.
--   * festival_card_practise: the player types the word (Chinese or pinyin) for a card they own: +1 use.
--       1 use = Trained, 3 uses = Mastered (evolution_stage 1 and 2).
-- ============================================================

create table if not exists public.festival_cards (
  user_id         uuid not null references auth.users (id) on delete cascade,
  event_id        text not null,
  word            text not null,
  usage_count     integer  not null default 0,
  evolution_stage smallint not null default 0,
  earned_at       timestamptz not null default now(),
  primary key (user_id, event_id, word),
  foreign key (event_id, word) references public.festival_words (event_id, word) on delete cascade
);
alter table public.festival_cards enable row level security;
drop policy if exists "festival cards select own" on public.festival_cards;
create policy "festival cards select own" on public.festival_cards for select to authenticated using (auth.uid() = user_id);
revoke all on public.festival_cards from anon, authenticated;
grant select on public.festival_cards to authenticated;

-- words already found before this table existed get their card now
insert into public.festival_cards (user_id, event_id, word, earned_at)
select user_id, event_id, word, found_at from public.festival_finds
on conflict do nothing;

-- ---------- festival_claim: same as before, plus the card ----------
drop function if exists festival_claim(text, text[]);
create or replace function festival_claim(p_user uuid, p_event text, p_words text[])
returns jsonb
language plpgsql security definer set search_path = public as $$
declare ev festival_events%rowtype;
        today date;
        w record;
        finds jsonb := '[]'::jsonb;
        pts integer := 0;
        bonus_paid integer := 0;
        paid integer;
        n_before integer; n_after integer; n_total integer;
        inserted integer;
begin
  if p_user is null then raise exception 'no user'; end if;
  select * into ev from festival_events where id = p_event;
  if not found then raise exception 'unknown event'; end if;
  today := (now() at time zone 'Asia/Singapore')::date;
  if today < ev.starts_on or today > ev.ends_on then raise exception 'event is not live'; end if;
  if coalesce(array_length(p_words, 1), 0) > 60 then raise exception 'too many words'; end if;

  select count(*) into n_total  from festival_words where event_id = p_event;
  select count(*) into n_before from festival_finds  where user_id = p_user and event_id = p_event;

  for w in select fw.word, fw.strokes from festival_words fw
            where fw.event_id = p_event and fw.word = any (coalesce(p_words, '{}'::text[])) order by fw.sort loop
    insert into festival_finds (user_id, event_id, word, points) values (p_user, p_event, w.word, w.strokes)
    on conflict do nothing;
    get diagnostics inserted = row_count;
    if inserted > 0 then
      finds := finds || jsonb_build_array(jsonb_build_object('word', w.word, 'points', w.strokes));
      pts := pts + w.strokes;
      insert into festival_cards (user_id, event_id, word) values (p_user, p_event, w.word) on conflict do nothing;
    end if;
  end loop;

  select count(*) into n_after from festival_finds where user_id = p_user and event_id = p_event;
  if n_total > 0 and n_before < n_total and n_after >= n_total then bonus_paid := ev.bonus; end if;

  paid := least(pts + bonus_paid, 500);   -- same cap as add_rewards; paid as XP and as island coins for the event's language
  if paid > 0 then
    update profiles set xp = xp + paid where user_id = p_user;
    insert into island_progress (user_id, language, coins) values (p_user, ev.language, paid)
    on conflict (user_id, language) do update set coins = island_progress.coins + paid;
  end if;
  return jsonb_build_object('found', finds, 'points', pts, 'bonus', bonus_paid, 'total_found', n_after, 'total_words', n_total);
end $$;
revoke all on function festival_claim(uuid, text, text[]) from public, anon, authenticated;
grant execute on function festival_claim(uuid, text, text[]) to service_role;

-- ---------- pinyin without tones, spaces or punctuation ("shuǐ píng" -> "shuiping") ----------
create or replace function public._festival_plain(p text) returns text
language sql immutable as $$
  select regexp_replace(
    translate(replace(lower(normalize(coalesce(p, ''), NFC)), 'v', 'u'),
              'āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü',
              'aaaaeeeeiiiioooouuuuuuuuu'),
    '[^a-z]', '', 'g')
$$;

-- ---------- practise a hunt card: the player did the three steps (type, say, write); this adds one use ----------
-- Hunt cards have their own count: nothing here touches vocabulary or album_cards. The sentence must use the word (or its pinyin).
-- A card can be practised at most once every 20 seconds, which no real player will notice but stops a script from spamming it.
alter table public.festival_cards add column if not exists last_practised_at timestamptz;

drop function if exists public.festival_card_practise(text, text, text);
create or replace function public.festival_card_practise(p_event text, p_word text, p_sentence text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
        fw festival_words%rowtype;
        c festival_cards%rowtype;
        s text := trim(coalesce(p_sentence, ''));
        n integer; st integer;
begin
  if me is null then raise exception 'not signed in'; end if;
  if char_length(s) < 2 or char_length(s) > 200 then raise exception 'write a short sentence first'; end if;
  select * into fw from festival_words where event_id = p_event and word = p_word;
  if not found then raise exception 'unknown word'; end if;
  select * into c from festival_cards where user_id = me and event_id = p_event and word = p_word for update;
  if not found then raise exception 'you have not found this card'; end if;
  if c.last_practised_at is not null and c.last_practised_at > now() - interval '20 seconds' then
    raise exception 'slow down a little, then try again';
  end if;
  if position(fw.word in s) = 0
     and not (_festival_plain(fw.pinyin) <> '' and position(_festival_plain(fw.pinyin) in _festival_plain(s)) > 0) then
    raise exception 'the sentence must use the word';
  end if;
  update festival_cards
     set usage_count = usage_count + 1,
         evolution_stage = case when usage_count + 1 >= 3 then 2 else 1 end,
         last_practised_at = now()
   where user_id = me and event_id = p_event and word = p_word
  returning usage_count, evolution_stage into n, st;
  return jsonb_build_object('usage_count', n, 'stage', st);
end $$;
revoke all on function public._festival_plain(text) from public, anon, authenticated;
revoke all on function public.festival_card_practise(text, text, text) from public, anon;
grant execute on function public.festival_card_practise(text, text, text) to authenticated;

-- make the API see the new function straight away
notify pgrst, 'reload schema';