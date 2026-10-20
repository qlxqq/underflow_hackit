-- A friend's small profile (opened by tapping their picture on the Friends page).
-- Other players' cards are private, so this function (which runs with extra rights) hands over ONLY what the
-- profile card shows: name, picture, XP, streak, badges and the (up to 3) favourite cards. Friends only.
-- Run once in the Supabase SQL editor. It also adds the last_seen column (online dots) if that is not there yet.

alter table profiles add column if not exists last_seen timestamptz;

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
  k text;
  v vocabulary%rowtype;
  a album_cards%rowtype;
begin
  if me is null then raise exception 'not signed in'; end if;
  if not exists (select 1 from my_friendships() f where f.friend_id = p_friend_id and f.state = 'accepted') then
    raise exception 'you can only view the profile of a friend';
  end if;

  select * into p from profiles where user_id = p_friend_id;
  if not found then raise exception 'player not found'; end if;

  -- favourite_cards holds keys like "v:12" (a captured word) or "a:7" (an island album card)
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
    end if;
  end loop;

  return jsonb_build_object(
    'username', p.username,
    'avatar', p.avatar,
    'xp', coalesce(p.xp, 0),
    'streak', coalesce(p.current_streak, 0),
    'last_seen', p.last_seen,
    'badges', coalesce((select jsonb_agg(badge_id order by earned_at) from user_badges where user_id = p_friend_id), '[]'::jsonb),
    'favourites', favs
  );
end;
$$;

revoke all on function friend_profile(uuid) from public;
grant execute on function friend_profile(uuid) to authenticated;