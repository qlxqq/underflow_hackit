-- ============================================================
-- STREAKS: daily visits, personal streaks, shared streaks with friends
-- Run friends.sql first. Paste into the Supabase SQL Editor (New query) and run.
-- Safe to run again: the table is skipped, functions are replaced, and the
-- one-time backfill at the bottom skips days that already exist.
-- ============================================================

-- ---------- daily_visits: one row per player per day they opened the app ----------
-- Days use Singapore time. There are no policies and no direct access on purpose:
-- only record_visit() can add a row, and the date comes from the server, so a player
-- cannot fake a streak by changing the clock on their device.
create table if not exists public.daily_visits (
  user_id uuid not null references auth.users(id) on delete cascade,
  day     date not null,
  primary key (user_id, day)
);
alter table public.daily_visits enable row level security;
revoke all on public.daily_visits from anon, authenticated;

-- ---------- visit_streak: days in a row a player has opened the app ----------
-- A streak is still alive if the player visited today OR yesterday (they have until
-- the end of today to keep it going), and ends at the first missed day.
-- Helper only: players cannot call it directly (see the revokes below).
create or replace function public.visit_streak(p_user uuid)
returns integer
language sql stable set search_path = public as $$
  with t as (select (now() at time zone 'Asia/Singapore')::date as today),
  v as (
    -- consecutive days (newest first) share the same value of day + row number
    select day, day + (row_number() over (order by day desc))::int as grp
      from public.daily_visits
     where user_id = p_user
  ),
  s as (select max(day) as start from v where day >= (select today from t) - 1)
  select coalesce(
    (select count(*)::int from v
      where grp = (select grp from v where day = (select start from s))),
    0);
$$;

-- ---------- shared_streak: days in a row BOTH players opened the app ----------
create or replace function public.shared_streak(p_a uuid, p_b uuid)
returns integer
language sql stable set search_path = public as $$
  with t as (select (now() at time zone 'Asia/Singapore')::date as today),
  v as (
    select x.day, x.day + (row_number() over (order by x.day desc))::int as grp
      from public.daily_visits x
      join public.daily_visits y on y.day = x.day and y.user_id = p_b
     where x.user_id = p_a
  ),
  s as (select max(day) as start from v where day >= (select today from t) - 1)
  select coalesce(
    (select count(*)::int from v
      where grp = (select grp from v where day = (select start from s))),
    0);
$$;

-- ---------- record_visit: call once when a signed-in player opens the app ----------
-- Safe to call many times a day. Returns the player's current streak.
create or replace function public.record_visit()
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Singapore')::date;
begin
  if v_uid is null then raise exception 'not signed in'; end if;

  insert into public.daily_visits (user_id, day) values (v_uid, v_today)
  on conflict do nothing;

  return public.visit_streak(v_uid);
end $$;

-- ---------- my_friendships: now also returns streaks (replaces the old version) ----------
-- friend_streak       the friend's own streak, worked out from daily_visits
-- shared_streak       days in a row you and this friend both opened the app (friends only)
-- friend_visited_today  has the friend opened the app today?
drop function if exists public.my_friendships();
create function public.my_friendships()
returns table (
  friendship_id        bigint,
  friend_id            uuid,
  friend_username      varchar,
  friend_avatar        text,
  friend_streak        integer,
  friend_xp            integer,
  shared_streak        integer,
  friend_visited_today boolean,
  state                text,
  is_incoming          boolean
)
language sql stable security definer set search_path = public as $$
  select f.id,
         p.user_id,
         p.username,
         p.avatar,
         public.visit_streak(p.user_id),
         p.xp,
         case when f.status = 'accepted' then public.shared_streak(auth.uid(), p.user_id) else 0 end,
         exists (select 1 from public.daily_visits d
                  where d.user_id = p.user_id
                    and d.day = (now() at time zone 'Asia/Singapore')::date),
         f.status,
         (f.addressee_id = auth.uid())
    from public.friendships f
    join public.profiles p
      on p.user_id = case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
   where auth.uid() in (f.requester_id, f.addressee_id)
   order by (f.status = 'accepted') desc, p.username;
$$;

-- ---------- friends_leaderboard: you and your friends, ranked by streak ----------
create or replace function public.friends_leaderboard()
returns table (
  lb_user_id  uuid,
  lb_username varchar,
  lb_streak   integer,
  lb_is_me    boolean
)
language sql stable security definer set search_path = public as $$
  select p.user_id,
         p.username,
         public.visit_streak(p.user_id),
         (p.user_id = auth.uid())
    from public.profiles p
   where p.user_id = auth.uid()
      or exists (
           select 1 from public.friendships f
            where f.status = 'accepted'
              and ((f.requester_id = auth.uid() and f.addressee_id = p.user_id)
                or (f.addressee_id = auth.uid() and f.requester_id = p.user_id)))
   order by 3 desc, 2;
$$;

-- ---------- who can call what ----------
-- The two helpers read other players' visits, so players cannot call them directly.
revoke all on function public.visit_streak(uuid) from public, anon, authenticated;
revoke all on function public.shared_streak(uuid, uuid) from public, anon, authenticated;

revoke all on function public.record_visit() from public, anon;
revoke all on function public.my_friendships() from public, anon;
revoke all on function public.friends_leaderboard() from public, anon;

grant execute on function public.record_visit() to authenticated;
grant execute on function public.my_friendships() to authenticated;
grant execute on function public.friends_leaderboard() to authenticated;

-- ---------- one-time backfill from the old streak columns ----------
-- Existing players keep the streak they already have: it becomes one visit for each
-- day of their current streak, ending on their last active day.
insert into public.daily_visits (user_id, day)
select p.user_id, p.last_active_date - g
  from public.profiles p
  cross join lateral generate_series(0, greatest(p.current_streak, 1) - 1) as g
 where p.last_active_date is not null
on conflict do nothing;