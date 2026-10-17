-- ============================================================
-- Whole database for the app (Supabase / Postgres), including the island.
-- Paste into the Supabase SQL Editor and run. Safe to run again:
-- tables and columns are skipped, policies and functions are replaced.
-- Sections: profiles, journey_progress, vocabulary, album_cards, daily_quests,
-- user_badges, add_rewards, island_progress, island_earn / island_spend.
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
-- XP is the player's and shared by every language. Coins are kept per language: pass
-- p_language ('zh', 'ms' or 'ta') and the coins go to that language's wallet
-- (island_progress.coins). Without p_language they go to profiles.coins (the old way).
-- Each call is capped at 500 of each.
drop function if exists add_rewards(integer, integer);
create or replace function add_rewards(p_xp integer, p_coins integer, p_language varchar default null)
returns table (new_xp integer, new_coins integer)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare uid uuid := auth.uid();
        xp_add integer := least(greatest(p_xp, 0), 500);
        coin_add integer := least(greatest(p_coins, 0), 500);
        total_xp integer; total_coins integer;
begin
  if uid is null then raise exception 'not signed in'; end if;
  if p_language is not null and p_language not in ('zh', 'ms', 'ta') then raise exception 'bad language'; end if;
  update profiles
     set xp    = xp + xp_add,
         coins = coins + case when p_language is null then coin_add else 0 end
   where user_id = uid
  returning xp, coins into total_xp, total_coins;
  if not found then raise exception 'no profile'; end if;
  if p_language is not null then
    insert into island_progress (user_id, language, coins) values (uid, p_language, coin_add)
    on conflict (user_id, language) do update set coins = island_progress.coins + coin_add
    returning coins into total_coins;
  end if;
  return query select total_xp, total_coins;
end $$;
revoke all on function add_rewards(integer, integer, varchar) from public;
grant execute on function add_rewards(integer, integer, varchar) to authenticated;
-- ============================================================
-- ISLAND
-- ============================================================

-- ---------- island_progress: one row per player and language (shop items, NPCs, levels, avatar) ----------

-- One row per player AND language: each language has its own island progress and its own coins.
-- XP is the player's and lives on profiles.
create table if not exists public.island_progress (
  user_id         uuid not null references auth.users (id) on delete cascade,
  language        varchar(10) not null default 'zh',
  coins           integer     not null default 0 check (coins >= 0),
  owned           text[]      not null default '{}',   -- shop items bought
  npcs_done       text[]      not null default '{}',   -- NPC challenges passed (each gave coins + a card)
  levels_done     integer[]   not null default '{}',   -- mystery island levels finished (1-9)
  zones_revealed  text[]      not null default '{}',   -- zones whose mist has lifted
  avatar          jsonb       not null default '{}'::jsonb, -- { "gender": "boy"|"girl", "outfit": "sunny" }
  stats           jsonb       not null default '{}'::jsonb, -- { "plays": { "npc:teacher": 3 }, "weak": ["word"] }
  updated_at      timestamptz not null default now(),
  primary key (user_id, language)
);

-- already created the table before? these bring it up to date (safe to run again):
alter table public.island_progress add column if not exists stats jsonb not null default '{}'::jsonb;
alter table public.island_progress add column if not exists language varchar(10) not null default 'zh';
do $$
begin
  -- the old table had one row per player; it now has one per player and language
  if exists (select 1 from information_schema.table_constraints
              where table_schema = 'public' and table_name = 'island_progress'
                and constraint_type = 'PRIMARY KEY' and constraint_name = 'island_progress_pkey')
     and not exists (select 1 from information_schema.key_column_usage
                      where table_schema = 'public' and table_name = 'island_progress'
                        and constraint_name = 'island_progress_pkey' and column_name = 'language') then
    alter table public.island_progress drop constraint island_progress_pkey;
    alter table public.island_progress add primary key (user_id, language);
  end if;
end $$;

alter table public.island_progress enable row level security;

drop policy if exists "island_progress select own" on public.island_progress;
drop policy if exists "island_progress insert own" on public.island_progress;
drop policy if exists "island_progress update own" on public.island_progress;

create policy "island_progress select own" on public.island_progress for select using (auth.uid() = user_id);
create policy "island_progress insert own" on public.island_progress for insert with check (auth.uid() = user_id);
create policy "island_progress update own" on public.island_progress for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.island_progress_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists island_progress_touch on public.island_progress;
create trigger island_progress_touch before update on public.island_progress
  for each row execute function public.island_progress_touch();

-- ---------- island coins: the island uses profiles.coins ----------
-- Daily limit for island rewards (no policies: only the functions below touch it).
create table if not exists island_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  day     date not null,
  coins   integer not null default 0,
  primary key (user_id, day)
);
alter table island_daily enable row level security;
revoke all on island_daily from anon, authenticated;

-- Island rewards (levels, NPC challenges). Coins go to the wallet of the language being played
-- (island_progress.coins). Limits: 100 per call, 1000 per day in total (Singapore time).
drop function if exists island_earn(integer);
create or replace function island_earn(p_amount integer, p_language varchar default 'zh')
returns integer
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare uid uuid := auth.uid(); today date := (now() at time zone 'Asia/Singapore')::date;
        used integer; amt integer; total integer;
        per_call constant integer := 100; daily_cap constant integer := 1000;
begin
  if uid is null then raise exception 'not signed in'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'bad amount'; end if;
  if p_language is null or p_language not in ('zh', 'ms', 'ta') then raise exception 'bad language'; end if;
  insert into island_daily (user_id, day) values (uid, today) on conflict do nothing;
  select coins into used from island_daily where user_id = uid and day = today for update;
  amt := least(p_amount, per_call, greatest(0, daily_cap - used));
  update island_daily set coins = used + amt where user_id = uid and day = today;
  insert into island_progress (user_id, language, coins) values (uid, p_language, amt)
  on conflict (user_id, language) do update set coins = island_progress.coins + amt
  returning coins into total;
  return total;
end $$;

-- Island Shop purchases, paid from the coins of the language being played. Fails if the player cannot afford it.
drop function if exists island_spend(integer);
create or replace function island_spend(p_amount integer, p_language varchar default 'zh')
returns integer
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare uid uuid := auth.uid(); total integer;
begin
  if uid is null then raise exception 'not signed in'; end if;
  if p_amount is null or p_amount <= 0 or p_amount > 10000 then raise exception 'bad amount'; end if;
  if p_language is null or p_language not in ('zh', 'ms', 'ta') then raise exception 'bad language'; end if;
  update island_progress set coins = coins - p_amount
   where user_id = uid and language = p_language and coins >= p_amount returning coins into total;
  if not found then raise exception 'not enough coins'; end if;
  return total;
end $$;

revoke all on function island_earn(integer, varchar), island_spend(integer, varchar) from public, anon;
grant execute on function island_earn(integer, varchar), island_spend(integer, varchar) to authenticated;

-- ---------- one-time move: coins used to be one shared balance on profiles ----------
-- The old shared balance becomes the Chinese wallet (the other languages start at 0). Safe to run
-- again: profiles.coins is emptied, so a second run finds nothing to move.
insert into island_progress (user_id, language, coins)
  select user_id, 'zh', coins from profiles where coins > 0
  on conflict (user_id, language) do update set coins = greatest(island_progress.coins, excluded.coins);
update profiles set coins = 0 where coins > 0;