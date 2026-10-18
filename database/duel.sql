-- ============================================================
-- DUELS: 1v1 live composition race between two friends
-- Run AFTER friends.sql (it uses the friendships table).
-- Paste into the Supabase SQL Editor (New query) and run.
-- Safe to run again: tables are skipped, policies and functions are replaced.
--
-- How a duel works
--   1. A player challenges a friend and picks a topic (zone). The database picks
--      5 random questions from that zone, so both players get the SAME questions in the same order.
--   2. The friend has 5 minutes to accept, otherwise the challenge expires.
--   3. After accepting there is a 3 second countdown, then both race at once.
--   4. A wrong sentence locks that player for 3 seconds. The opponent sees it live.
--   5. First player to finish all questions wins. The database decides, using its own
--      clock, so a player cannot fake their time or skip the 3 second lock.
--   6. If a player is gone for 30 seconds, the other player wins.
--   7. Winner gets 30 XP, loser gets 10 XP (nothing for walking away).
-- ============================================================

-- ---------- tables ----------
create table if not exists public.duels (
  id            uuid primary key default gen_random_uuid(),
  challenger_id uuid not null references auth.users(id) on delete cascade,
  opponent_id   uuid not null references auth.users(id) on delete cascade,
  zone          integer not null,
  level         integer,                     -- no longer used (levels are gone), kept so old rows still load
  question_ids  bigint[] not null,
  status        text not null default 'pending'
                check (status in ('pending', 'active', 'finished', 'declined', 'cancelled', 'expired')),
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null default now() + interval '5 minutes',
  started_at    timestamptz,                 -- when the race begins (after the countdown)
  finished_at   timestamptz,
  winner_id     uuid references auth.users(id) on delete set null,
  end_reason    text check (end_reason in ('finished', 'forfeit')),
  xp_awarded    boolean not null default false,
  constraint duels_not_self check (challenger_id <> opponent_id)
);

create index if not exists duels_challenger_idx on public.duels (challenger_id, status);
create index if not exists duels_opponent_idx   on public.duels (opponent_id, status);

-- One row per player per duel: their live progress.
create table if not exists public.duel_players (
  duel_id       uuid not null references public.duels(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  idx           integer not null default 0,        -- questions finished so far
  wrong         integer not null default 0,        -- wrong sentences so far
  placed        integer not null default 0,        -- tiles currently in the answer box
  lock_until    timestamptz,                       -- locked out until this time (after a wrong sentence)
  last_wrong    text,                              -- the last wrong sentence (shown to the opponent)
  last_wrong_at timestamptz,
  finished_at   timestamptz,
  seen_at       timestamptz not null default now(),-- last sign of life
  primary key (duel_id, user_id)
);

-- already ran an older version of this file? this makes the old NOT NULL level column optional
alter table public.duels alter column level drop not null;

alter table public.duels        enable row level security;
alter table public.duel_players enable row level security;

-- Helper: is the signed-in player part of this duel? (security definer so the
-- policies below do not loop back into themselves)
create or replace function public.is_duel_member(p_duel uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.duels d
                  where d.id = p_duel
                    and auth.uid() in (d.challenger_id, d.opponent_id));
$$;

-- Players can only READ their own duels. Only the functions below can change anything.
drop policy if exists "duels select own" on public.duels;
create policy "duels select own" on public.duels
  for select to authenticated
  using (auth.uid() in (challenger_id, opponent_id));

drop policy if exists "duel_players select own duel" on public.duel_players;
create policy "duel_players select own duel" on public.duel_players
  for select to authenticated
  using (public.is_duel_member(duel_id));

revoke all on public.duels, public.duel_players from anon, authenticated;
grant select on public.duels, public.duel_players to authenticated;

-- Live updates: let Supabase Realtime broadcast changes to these two tables.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.duels;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.duel_players;
    exception when duplicate_object then null;
    end;
  end if;
end $$;

-- ---------- internal: tidy up old duels ----------
create or replace function public._duel_cleanup()
returns void
language plpgsql security definer set search_path = public as $$
begin
  -- challenges nobody answered in time
  update public.duels set status = 'expired'
   where status = 'pending' and expires_at < now();
  -- races that were abandoned long ago
  update public.duels set status = 'expired'
   where status = 'active' and started_at < now() - interval '20 minutes';
end $$;

-- ---------- internal: the whole duel as one JSON object (what the page draws) ----------
create or replace function public._duel_json(p_id uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id',            d.id,
    'status',        d.status,
    'zone',          d.zone,
    'level',         d.level,
    'question_ids',  to_jsonb(d.question_ids),
    'challenger_id', d.challenger_id,
    'opponent_id',   d.opponent_id,
    'created_at',    d.created_at,
    'expires_at',    d.expires_at,
    'started_at',    d.started_at,
    'finished_at',   d.finished_at,
    'winner_id',     d.winner_id,
    'end_reason',    d.end_reason,
    'server_now',    now(),
    'players', coalesce((
      select jsonb_agg(jsonb_build_object(
               'user_id',       dp.user_id,
               'username',      pr.username,
               'avatar',        pr.avatar,
               'idx',           dp.idx,
               'wrong',         dp.wrong,
               'placed',        dp.placed,
               'lock_until',    dp.lock_until,
               'last_wrong',    dp.last_wrong,
               'last_wrong_at', dp.last_wrong_at,
               'finished_at',   dp.finished_at)
             order by (dp.user_id = d.challenger_id) desc)
        from public.duel_players dp
        left join public.profiles pr on pr.user_id = dp.user_id
       where dp.duel_id = d.id), '[]'::jsonb)
  )
  from public.duels d
  where d.id = p_id;
$$;

-- ---------- internal: end a duel and hand out XP ----------
create or replace function public._duel_end(p_id uuid, p_winner uuid, p_reason text)
returns void
language plpgsql security definer set search_path = public as $$
declare
  d public.duels%rowtype;
  v_loser uuid;
begin
  select * into d from public.duels where id = p_id for update;
  if d.status <> 'active' then return; end if;

  v_loser := case when p_winner = d.challenger_id then d.opponent_id else d.challenger_id end;

  update public.duels
     set status = 'finished', winner_id = p_winner, end_reason = p_reason,
         finished_at = now(), xp_awarded = true
   where id = p_id and xp_awarded = false;

  if found then
    update public.profiles set xp = xp + 30 where user_id = p_winner;
    if p_reason = 'finished' then
      update public.profiles set xp = xp + 10 where user_id = v_loser;
    end if;
  end if;
end $$;

-- ---------- duel_challenge: challenge a friend ----------
-- Returns the new duel id. p_zone: 1 neighbourhood, 2 hawker centre, 3 public transport.
-- (Replaces the older version that also took a level.)
drop function if exists public.duel_challenge(uuid, integer, integer);
create or replace function public.duel_challenge(p_friend_id uuid, p_zone integer)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_ids bigint[];
  v_id  uuid;
begin
  if v_uid is null then raise exception 'not signed in'; end if;
  if p_friend_id is null or p_friend_id = v_uid then raise exception 'pick a friend to challenge'; end if;
  if p_zone not between 1 and 3 then raise exception 'pick a topic'; end if;

  if not exists (select 1 from public.friendships f
                  where f.status = 'accepted'
                    and ((f.requester_id = v_uid and f.addressee_id = p_friend_id)
                      or (f.requester_id = p_friend_id and f.addressee_id = v_uid))) then
    raise exception 'you can only challenge friends';
  end if;

  perform public._duel_cleanup();

  if exists (select 1 from public.duels
              where status in ('pending', 'active') and v_uid in (challenger_id, opponent_id)) then
    raise exception 'you already have a duel open';
  end if;
  if exists (select 1 from public.duels
              where status in ('pending', 'active') and p_friend_id in (challenger_id, opponent_id)) then
    raise exception 'that friend already has a duel open';
  end if;

  -- 5 random questions from the whole zone (all difficulties mixed)
  select array_agg(id) into v_ids
    from (select id from public.composition_questions
           where zone = p_zone and language = 'zh-CN'
           order by random() limit 5) q;

  if v_ids is null or array_length(v_ids, 1) < 3 then
    raise exception 'not enough questions for that topic yet';
  end if;

  insert into public.duels (challenger_id, opponent_id, zone, question_ids)
  values (v_uid, p_friend_id, p_zone, v_ids)
  returning id into v_id;

  insert into public.duel_players (duel_id, user_id) values (v_id, v_uid), (v_id, p_friend_id);

  return v_id;
end $$;

-- ---------- duel_respond: accept or decline a challenge sent to you ----------
create or replace function public.duel_respond(p_duel uuid, p_accept boolean)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  d public.duels%rowtype;
begin
  if v_uid is null then raise exception 'not signed in'; end if;

  select * into d from public.duels where id = p_duel for update;
  if not found or d.opponent_id <> v_uid then raise exception 'challenge not found'; end if;
  if d.status <> 'pending' then raise exception 'this challenge is no longer open'; end if;
  if d.expires_at < now() then
    update public.duels set status = 'expired' where id = p_duel;
    raise exception 'this challenge has expired';
  end if;

  if p_accept then
    -- 3 second countdown so both phones are ready before the race begins
    update public.duels set status = 'active', started_at = now() + interval '3 seconds'
     where id = p_duel;
    update public.duel_players set seen_at = now() where duel_id = p_duel;
  else
    update public.duels set status = 'declined' where id = p_duel;
  end if;
end $$;

-- ---------- duel_cancel: take back a challenge you sent (before it is accepted) ----------
create or replace function public.duel_cancel(p_duel uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;

  update public.duels set status = 'cancelled'
   where id = p_duel and challenger_id = auth.uid() and status = 'pending';

  if not found then raise exception 'challenge not found'; end if;
end $$;

-- ---------- duel_state: read the duel (no changes made) ----------
create or replace function public.duel_state(p_duel uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if not public.is_duel_member(p_duel) then raise exception 'duel not found'; end if;
  return public._duel_json(p_duel);
end $$;

-- ---------- duel_ping: "I am still here" + housekeeping + latest state ----------
-- Pages call this every few seconds. It also expires old challenges and gives the win
-- to the player who stayed if the other has been gone for more than 30 seconds.
create or replace function public.duel_ping(p_duel uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  d public.duels%rowtype;
  v_other uuid;
  v_other_seen timestamptz;
begin
  if v_uid is null then raise exception 'not signed in'; end if;
  if not public.is_duel_member(p_duel) then raise exception 'duel not found'; end if;

  perform public._duel_cleanup();

  update public.duel_players set seen_at = now()
   where duel_id = p_duel and user_id = v_uid and seen_at < now() - interval '2 seconds';

  select * into d from public.duels where id = p_duel;

  if d.status = 'active' then
    v_other := case when v_uid = d.challenger_id then d.opponent_id else d.challenger_id end;
    select seen_at into v_other_seen from public.duel_players
     where duel_id = p_duel and user_id = v_other;

    if v_other_seen < now() - interval '30 seconds' then
      perform public._duel_end(p_duel, v_uid, 'forfeit');
    end if;
  end if;

  return public._duel_json(p_duel);
end $$;

-- ---------- duel_progress: how many tiles are in my answer box (for the opponent's screen) ----------
-- Only the NUMBER is shared, never which words, so nobody can copy the answer.
create or replace function public.duel_progress(p_duel uuid, p_placed integer)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;

  update public.duel_players dp
     set placed = least(greatest(coalesce(p_placed, 0), 0), 30)
    from public.duels d
   where dp.duel_id = p_duel and dp.user_id = auth.uid()
     and d.id = dp.duel_id and d.status = 'active'
     and dp.finished_at is null
     and dp.placed is distinct from least(greatest(coalesce(p_placed, 0), 0), 30);
end $$;

-- ---------- duel_submit: check a finished sentence ----------
-- p_idx is the question number you think you are on (0 for the first), which makes a
-- double tap harmless. Returns json with result:
--   correct | wrong | locked | stale | early | over | done
create or replace function public.duel_submit(p_duel uuid, p_idx integer, p_answer text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  d       public.duels%rowtype;
  me      public.duel_players%rowtype;
  v_answers jsonb;
  v_ok    boolean;
  v_clean text := regexp_replace(coalesce(p_answer, ''), '\s', '', 'g');
  v_lock  timestamptz;
begin
  if v_uid is null then raise exception 'not signed in'; end if;

  select * into d from public.duels where id = p_duel for update;
  if not found or v_uid not in (d.challenger_id, d.opponent_id) then
    raise exception 'duel not found';
  end if;

  if d.status <> 'active' then return jsonb_build_object('result', 'over'); end if;
  if now() < d.started_at then return jsonb_build_object('result', 'early'); end if;

  select * into me from public.duel_players
   where duel_id = p_duel and user_id = v_uid for update;

  if me.finished_at is not null then return jsonb_build_object('result', 'done'); end if;
  if me.idx <> p_idx then
    return jsonb_build_object('result', 'stale', 'idx', me.idx);
  end if;
  if me.lock_until is not null and me.lock_until > now() then
    return jsonb_build_object('result', 'locked', 'lock_until', me.lock_until);
  end if;

  select accepted_answers into v_answers
    from public.composition_questions where id = d.question_ids[me.idx + 1];

  select exists (select 1 from jsonb_array_elements_text(v_answers) a
                  where regexp_replace(a, '\s', '', 'g') = v_clean)
    into v_ok;

  if not v_ok then
    v_lock := now() + interval '3 seconds';
    update public.duel_players
       set wrong = wrong + 1, placed = 0, lock_until = v_lock,
           last_wrong = left(coalesce(p_answer, ''), 200), last_wrong_at = now()
     where duel_id = p_duel and user_id = v_uid;
    return jsonb_build_object('result', 'wrong', 'lock_until', v_lock);
  end if;

  update public.duel_players
     set idx = idx + 1, placed = 0, lock_until = null
   where duel_id = p_duel and user_id = v_uid
  returning * into me;

  if me.idx >= array_length(d.question_ids, 1) then
    update public.duel_players set finished_at = now()
     where duel_id = p_duel and user_id = v_uid;
    -- the row lock above means the first to get here is the winner
    perform public._duel_end(p_duel, v_uid, 'finished');
    return jsonb_build_object('result', 'correct', 'idx', me.idx, 'finished', true);
  end if;

  return jsonb_build_object('result', 'correct', 'idx', me.idx, 'finished', false);
end $$;

-- ---------- duel_forfeit: give up (the other player wins) ----------
create or replace function public.duel_forfeit(p_duel uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  d public.duels%rowtype;
begin
  if v_uid is null then raise exception 'not signed in'; end if;

  select * into d from public.duels where id = p_duel;
  if not found or v_uid not in (d.challenger_id, d.opponent_id) then
    raise exception 'duel not found';
  end if;

  if d.status = 'active' then
    perform public._duel_end(p_duel,
      case when v_uid = d.challenger_id then d.opponent_id else d.challenger_id end,
      'forfeit');
  elsif d.status = 'pending' then
    update public.duels set status = case when v_uid = d.challenger_id then 'cancelled' else 'declined' end
     where id = p_duel;
  end if;
end $$;

-- ---------- duel_my_open: my open challenges and races (for the Friends page) ----------
create or replace function public.duel_my_open()
returns table (
  duel_id        uuid,
  status         text,
  is_incoming    boolean,
  other_id       uuid,
  other_username varchar,
  zone           integer,
  level          integer,
  expires_at     timestamptz
)
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;

  perform public._duel_cleanup();

  return query
  select d.id, d.status, (d.opponent_id = auth.uid()), p.user_id, p.username,
         d.zone, d.level, d.expires_at
    from public.duels d
    join public.profiles p
      on p.user_id = case when d.challenger_id = auth.uid() then d.opponent_id else d.challenger_id end
   where auth.uid() in (d.challenger_id, d.opponent_id)
     and d.status in ('pending', 'active')
   order by d.created_at desc;
end $$;

-- Only signed-in players can call these.
revoke all on function public._duel_cleanup() from public, anon, authenticated;
revoke all on function public._duel_json(uuid) from public, anon, authenticated;
revoke all on function public._duel_end(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.is_duel_member(uuid) from public, anon;
revoke all on function public.duel_challenge(uuid, integer) from public, anon;
revoke all on function public.duel_respond(uuid, boolean) from public, anon;
revoke all on function public.duel_cancel(uuid) from public, anon;
revoke all on function public.duel_state(uuid) from public, anon;
revoke all on function public.duel_ping(uuid) from public, anon;
revoke all on function public.duel_progress(uuid, integer) from public, anon;
revoke all on function public.duel_submit(uuid, integer, text) from public, anon;
revoke all on function public.duel_forfeit(uuid) from public, anon;
revoke all on function public.duel_my_open() from public, anon;

grant execute on function public.is_duel_member(uuid) to authenticated;
grant execute on function public.duel_challenge(uuid, integer) to authenticated;
grant execute on function public.duel_respond(uuid, boolean) to authenticated;
grant execute on function public.duel_cancel(uuid) to authenticated;
grant execute on function public.duel_state(uuid) to authenticated;
grant execute on function public.duel_ping(uuid) to authenticated;
grant execute on function public.duel_progress(uuid, integer) to authenticated;
grant execute on function public.duel_submit(uuid, integer, text) to authenticated;
grant execute on function public.duel_forfeit(uuid) to authenticated;
grant execute on function public.duel_my_open() to authenticated;