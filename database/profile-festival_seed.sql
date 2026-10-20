-- ============================================================
-- Festival badges and hunt cards on the profile.
-- Run once in the Supabase SQL editor (after festival_cards.sql). Safe to run again.
--
--   1. profiles.favourite_badges: the up to 3 badges a player chooses to show (like favourite_cards).
--   2. The database gives the festival badges itself, whenever a hunt card is found or levelled up:
--        festival:<event>:<lang>          every card of the festival found      (Complete)
--        festival-master:<event>:<lang>   every card of the festival Mastered   (the shiny one)
--      Players already past those points get them now.
--   3. friend_profile now returns the friend's chosen badges and understands hunt cards in their favourites
--      (favourite_cards keys look like "f:halloween|水瓶").
-- ============================================================

alter table public.profiles add column if not exists favourite_badges jsonb not null default '[]'::jsonb;

-- ---------- festival badges ----------
create or replace function public._festival_badges() returns trigger
language plpgsql security definer set search_path = public as $$
declare lang text; total integer; have integer; mastered integer;
begin
  select language into lang from festival_events where id = new.event_id;
  if lang is null then return new; end if;
  select count(*) into total from festival_words where event_id = new.event_id;
  select count(*), count(*) filter (where evolution_stage >= 2) into have, mastered
    from festival_cards where user_id = new.user_id and event_id = new.event_id;
  if total > 0 and have >= total then
    insert into user_badges (user_id, badge_id) values (new.user_id, 'festival:' || new.event_id || ':' || lang) on conflict do nothing;
    if mastered >= total then
      insert into user_badges (user_id, badge_id) values (new.user_id, 'festival-master:' || new.event_id || ':' || lang) on conflict do nothing;
    end if;
  end if;
  return new;
end $$;
revoke all on function public._festival_badges() from public, anon, authenticated;

drop trigger if exists festival_cards_badges on public.festival_cards;
create trigger festival_cards_badges after insert or update of evolution_stage on public.festival_cards
  for each row execute function public._festival_badges();

-- players who already have every card (or have mastered them all)
insert into user_badges (user_id, badge_id)
select fc.user_id, 'festival:' || fc.event_id || ':' || e.language
  from festival_cards fc join festival_events e on e.id = fc.event_id
 group by fc.user_id, fc.event_id, e.language
having count(*) >= (select count(*) from festival_words w where w.event_id = fc.event_id)
on conflict do nothing;

insert into user_badges (user_id, badge_id)
select fc.user_id, 'festival-master:' || fc.event_id || ':' || e.language
  from festival_cards fc join festival_events e on e.id = fc.event_id
 group by fc.user_id, fc.event_id, e.language
having count(*) >= (select count(*) from festival_words w where w.event_id = fc.event_id)
   and count(*) filter (where fc.evolution_stage >= 2) >= (select count(*) from festival_words w where w.event_id = fc.event_id)
on conflict do nothing;

-- ---------- a friend's small profile ----------
create or replace function friend_profile(p_friend_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  p profiles%rowtype;
  favs jsonb := '[]'::jsonb;
  picked jsonb := '[]'::jsonb;
  k text;
  mk text;
  ev text;
  wd text;
  v vocabulary%rowtype;
  a album_cards%rowtype;
  fc festival_cards%rowtype;
  fw festival_words%rowtype;
begin
  if me is null then raise exception 'not signed in'; end if;
  if not exists (select 1 from my_friendships() f where f.friend_id = p_friend_id and f.state = 'accepted') then
    raise exception 'you can only view the profile of a friend';
  end if;

  select * into p from profiles where user_id = p_friend_id;
  if not found then raise exception 'player not found'; end if;

  -- favourite_cards holds keys like "v:12" (a captured word), "a:7" (an island album card) or "f:halloween|水瓶" (a hunt card)
  for k in select jsonb_array_elements_text(coalesce(p.favourite_cards, '[]'::jsonb)) limit 3 loop
    if k like 'v:%' and substr(k, 3) ~ '^[0-9]+$' then
      select * into v from vocabulary where vocab_id = substr(k, 3)::bigint and user_id = p_friend_id;
      if found then
        favs := favs || jsonb_build_array(jsonb_build_object(
          'kind', 'captured', 'word', v.word, 'language', v.language, 'romanization', v.romanization,
          'meaning', v.english_meaning, 'rarity', v.rarity, 'stage', coalesce(v.evolution_stage, 0)));
      end if;
    elsif k like 'a:%' and substr(k, 3) ~ '^[0-9]+$' then
      select * into a from album_cards where card_id = substr(k, 3)::bigint and user_id = p_friend_id;
      if found then
        favs := favs || jsonb_build_array(jsonb_build_object(
          'kind', 'island', 'word', a.word, 'language', a.language, 'album', a.album_id, 'stage', coalesce(a.evolution_stage, 0)));
      end if;
    elsif k like 'f:%' and position('|' in k) > 3 then
      ev := split_part(substr(k, 3), '|', 1);
      wd := substr(k, 3 + char_length(ev) + 1);
      select * into fc from festival_cards where user_id = p_friend_id and event_id = ev and word = wd;
      if found then
        select * into fw from festival_words where event_id = ev and word = wd;
        favs := favs || jsonb_build_array(jsonb_build_object(
          'kind', 'festival', 'word', wd, 'event', ev,
          'event_name', (select name from festival_events where id = ev),
          'romanization', fw.pinyin, 'meaning', fw.meaning, 'stage', coalesce(fc.evolution_stage, 0)));
      end if;
    end if;
  end loop;

  -- the badges they chose to show (only ones they really have); master = they also have the shiny one
  for k in select jsonb_array_elements_text(coalesce(p.favourite_badges, '[]'::jsonb)) limit 3 loop
    if exists (select 1 from user_badges where user_id = p_friend_id and badge_id = k) then
      mk := case when k like 'album:%' then 'album-master:' || substr(k, 7)
                 when k like 'festival:%' then 'festival-master:' || substr(k, 10)
                 else null end;
      picked := picked || jsonb_build_array(jsonb_build_object(
        'id', k,
        'master', mk is not null and exists (select 1 from user_badges where user_id = p_friend_id and badge_id = mk)));
    end if;
  end loop;

  return jsonb_build_object(
    'username', p.username,
    'avatar', p.avatar,
    'xp', coalesce(p.xp, 0),
    'streak', coalesce(p.current_streak, 0),
    'last_seen', p.last_seen,
    'badges', picked,
    'favourites', favs
  );
end;
$$;

revoke all on function friend_profile(uuid) from public;
grant execute on function friend_profile(uuid) to authenticated;

notify pgrst, 'reload schema';