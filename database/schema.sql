-- ============================================================
-- Whole database for the app (Supabase / Postgres).
-- Paste into the Supabase SQL Editor and run.
--
-- This is the clean version: every column lives in its table.
-- On a NEW project, run it as is.
-- On your LIVE project the tables already exist with these columns
-- (earlier runs added them), so re-running is harmless: tables and
-- columns are skipped, and the rules and the function are replaced.
-- ============================================================

-- ---------- profiles: one row per player ----------
create table if not exists profiles (
  user_id          uuid primary key references auth.users(id) on delete cascade,
  username         varchar(50) unique not null,
  avatar           text    not null default 'merlion',
  current_streak   integer not null default 0,
  longest_streak   integer not null default 0,
  last_active_date date,
  xp               integer not null default 0,
  coins            integer not null default 0,
  favourite_cards  jsonb   not null default '[]'::jsonb,   -- up to 3
  created_at       timestamptz not null default now()
);
alter table profiles enable row level security;
drop policy if exists "Anyone can view profiles" on profiles;
drop policy if exists "Users can insert their own profile" on profiles;
drop policy if exists "Users can update their own profile" on profiles;
create policy "Anyone can view profiles" on profiles for select using (true);
create policy "Users can insert their own profile" on profiles for insert with check (auth.uid() = user_id);
-- NOTE: players can edit their own row, so xp/coins/streak can be faked.
-- Before a leaderboard, move updates into server-side functions.
create policy "Users can update their own profile" on profiles for update using (auth.uid() = user_id);

-- ---------- journey_progress: one row per player, language, level ----------
-- A level is complete once slot_1_completed is true (one mini-game per level).
-- slot_2/slot_3 are still read by progress.js, so they stay.
create table if not exists journey_progress (
  user_id          uuid not null references auth.users(id) on delete cascade,
  language         varchar(10) not null,
  level_number     integer not null default 1,
  slot_1_completed boolean not null default false,
  slot_2_completed boolean not null default false,
  slot_3_completed boolean not null default false,
  updated_at       timestamptz not null default now(),
  primary key (user_id, language, level_number)
);
alter table journey_progress enable row level security;
drop policy if exists "Users can view their own progress" on journey_progress;
drop policy if exists "Users can insert their own progress" on journey_progress;
drop policy if exists "Users can update their own progress" on journey_progress;
create policy "Users can view their own progress" on journey_progress for select using (auth.uid() = user_id);
create policy "Users can insert their own progress" on journey_progress for insert with check (auth.uid() = user_id);
create policy "Users can update their own progress" on journey_progress for update using (auth.uid() = user_id);

-- ---------- vocabulary: words a player captured (private) ----------
create table if not exists vocabulary (
  vocab_id         bigint generated always as identity primary key,
  user_id          uuid not null references auth.users(id) on delete cascade,
  word             varchar(255) not null,
  language         varchar(10)  not null,
  romanization     varchar(255),
  english_meaning  varchar(500),
  context_sentence varchar(1000),
  source           varchar(20) not null default 'text',
  rarity           varchar(20) default 'common',
  evolution_stage  smallint default 0,
  usage_count      integer default 0,
  theme            text,   -- ready-made picture picked by the AI lookup
  art_svg          text,   -- picture Claude drew for the word
  created_at       timestamptz not null default now(),
  constraint unique_user_word_language unique (user_id, word, language)
);
alter table vocabulary enable row level security;
drop policy if exists "Users can view their own vocabulary" on vocabulary;
drop policy if exists "Users can insert their own vocabulary" on vocabulary;
drop policy if exists "Users can update their own vocabulary" on vocabulary;
drop policy if exists "Users can delete their own vocabulary" on vocabulary;
create policy "Users can view their own vocabulary" on vocabulary for select using (auth.uid() = user_id);
create policy "Users can insert their own vocabulary" on vocabulary for insert with check (auth.uid() = user_id);
create policy "Users can update their own vocabulary" on vocabulary for update using (auth.uid() = user_id);
create policy "Users can delete their own vocabulary" on vocabulary for delete using (auth.uid() = user_id);

-- ---------- album_cards: island cards won from mini-games ----------
-- No delete policy on purpose: album cards cannot be removed.
create table if not exists album_cards (
  card_id         bigint generated always as identity primary key,
  user_id         uuid not null references auth.users(id) on delete cascade,
  album_id        varchar(40)  not null,
  language        varchar(10)  not null,
  word            varchar(255) not null,
  source          varchar(40)  not null default 'island',
  evolution_stage smallint not null default 0,
  usage_count     integer  not null default 0,
  earned_at       timestamptz not null default now(),
  constraint unique_album_card unique (user_id, album_id, language, word)
);
alter table album_cards enable row level security;
drop policy if exists "Users can view their own album cards" on album_cards;
drop policy if exists "Users can insert their own album cards" on album_cards;
drop policy if exists "Users can update their own album cards" on album_cards;
create policy "Users can view their own album cards" on album_cards for select using (auth.uid() = user_id);
create policy "Users can insert their own album cards" on album_cards for insert with check (auth.uid() = user_id);
create policy "Users can update their own album cards" on album_cards for update using (auth.uid() = user_id);

-- ---------- daily_quests: one row per quest per day ----------
create table if not exists daily_quests (
  user_id    uuid not null references auth.users(id) on delete cascade,
  quest_date date not null,
  quest_id   text not null,
  progress   integer not null default 0,
  claimed    boolean not null default false,
  primary key (user_id, quest_date, quest_id)
);
alter table daily_quests enable row level security;
drop policy if exists "quests select own" on daily_quests;
drop policy if exists "quests insert own" on daily_quests;
drop policy if exists "quests update own" on daily_quests;
create policy "quests select own" on daily_quests for select to authenticated using (auth.uid() = user_id);
create policy "quests insert own" on daily_quests for insert to authenticated with check (auth.uid() = user_id);
create policy "quests update own" on daily_quests for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- user_badges: visible to all signed-in players ----------
create table if not exists user_badges (
  user_id   uuid not null references auth.users(id) on delete cascade,
  badge_id  text not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);
alter table user_badges enable row level security;
drop policy if exists "badges readable" on user_badges;
drop policy if exists "badges insert own" on user_badges;
create policy "badges readable" on user_badges for select to authenticated using (true);
create policy "badges insert own" on user_badges for insert to authenticated with check (auth.uid() = user_id);

-- ---------- add_rewards: give the signed-in player XP and coins ----------
-- Each call is capped at 500 of each.
create or replace function add_rewards(p_xp integer, p_coins integer)
returns table (new_xp integer, new_coins integer)
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  return query
  update profiles p
     set xp    = p.xp    + least(greatest(p_xp, 0), 500),
         coins = p.coins + least(greatest(p_coins, 0), 500)
   where p.user_id = auth.uid()
  returning p.xp, p.coins;
end $$;
revoke all on function add_rewards(integer, integer) from public;
grant execute on function add_rewards(integer, integer) to authenticated;