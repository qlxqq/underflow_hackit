-- ============================================================
-- Whole database for the app (Supabase / Postgres), including the island.
-- Paste into the Supabase SQL Editor and run. Safe to run again:
-- tables and columns are skipped, policies and functions are replaced.
-- Sections: profiles, journey_progress, vocabulary, album_cards, daily_quests,
-- user_badges, add_rewards, composition_questions, pronunciation_questions,
-- typing_questions, island_progress, island_earn / island_spend.
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
-- COMPOSITION: predefined sentence-building challenges
-- ============================================================

CREATE TABLE IF NOT EXISTS public.composition_questions (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    zone INTEGER NOT NULL DEFAULT 1,
    level INTEGER NOT NULL DEFAULT 3,
    topic TEXT NOT NULL DEFAULT 'neighbourhood',
    language VARCHAR(10) NOT NULL DEFAULT 'zh-CN',
    prompt TEXT NOT NULL,
    tiles JSONB NOT NULL,
    accepted_answers JSONB NOT NULL,
    explanation TEXT,
    xp INTEGER NOT NULL DEFAULT 10,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT composition_tiles_array
        CHECK (jsonb_typeof(tiles) = 'array'),

    CONSTRAINT composition_answers_array
        CHECK (jsonb_typeof(accepted_answers) = 'array')
);

ALTER TABLE public.composition_questions
ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read composition questions"
ON public.composition_questions;

CREATE POLICY "Anyone can read composition questions"
ON public.composition_questions
FOR SELECT
TO anon, authenticated
USING (true);

-- Composition questions are loaded by composition_seed.sql (not here), so running this file never adds old sample rows.

-- ============================================================
-- PRONUNCIATION: question bank for the Pronunciation game of every zone
-- ============================================================
-- One row per phrase, in Chinese (zh), Malay (ms) and Tamil (ta), using the same language codes
-- as journey_progress and island_progress. There are no levels: each run asks random phrases from the
-- zone's bank. The phrases are added by database/pronunciation_questions.sql (run that after this file;
-- it also upgrades an older table that still has a "level" column).
-- Same for every player: anyone can read them, nobody can change them from the app.

CREATE TABLE IF NOT EXISTS public.pronunciation_questions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    zone INTEGER NOT NULL,
    topic TEXT NOT NULL,
    language VARCHAR(10) NOT NULL,
    phrase TEXT NOT NULL,          -- what the player says
    romanization TEXT,             -- pinyin / Tamil romanization (empty for Malay)
    meaning TEXT NOT NULL,         -- English meaning
    context TEXT,                  -- where you'd say it, e.g. 'At the void deck'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_pronunciation_phrase
        UNIQUE (zone, language, phrase)
);

ALTER TABLE public.pronunciation_questions
ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read pronunciation questions"
ON public.pronunciation_questions;

CREATE POLICY "Anyone can read pronunciation questions"
ON public.pronunciation_questions
FOR SELECT
TO anon, authenticated
USING (true);

-- ============================================================
-- TYPING: sentence bank for the Typing game of every zone
-- ============================================================
-- One row per sentence the player types (three times, with less help each time), in Chinese (zh) so far.
-- Malay (ms) and Tamil (ta) rows can be added the same way. There are no levels: each run asks random
-- sentences from the zone's bank. The sentences are added by database/typing_questions.sql (run that after
-- this file). words = the island's zone words used in the sentence (they can win cards).
-- Same for every player: anyone can read them, nobody can change them from the app.

CREATE TABLE IF NOT EXISTS public.typing_questions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    zone INTEGER NOT NULL,
    topic TEXT NOT NULL,
    language VARCHAR(10) NOT NULL,
    target TEXT NOT NULL,                      -- the sentence the player types
    romanization TEXT NOT NULL DEFAULT '',     -- pinyin, one syllable per typed character
    english TEXT NOT NULL,                     -- what it means
    words TEXT[] NOT NULL DEFAULT '{}',        -- zone words used in the sentence
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT unique_typing_sentence
        UNIQUE (zone, language, target)
);

ALTER TABLE public.typing_questions
ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read typing questions"
ON public.typing_questions;

CREATE POLICY "Anyone can read typing questions"
ON public.typing_questions
FOR SELECT
TO anon, authenticated
USING (true);

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
-- ============================================================
-- Island content (read-only for players; filled by the island_*_seed.sql files)
-- ============================================================
create table if not exists island_zone_words (
  language text not null, zone text not null, sort integer not null default 0,
  word text not null, romanization text not null default '', meaning text not null,
  primary key (language, zone, word)
);
create table if not exists island_role_words (
  language text not null, album text not null, npc_id text not null, npc_label text not null,
  npc_sort integer not null default 0, sort integer not null default 0,
  word text not null, romanization text not null default '', meaning text not null,
  primary key (language, album, npc_id, word)
);
create table if not exists island_sentences (
  word text primary key, sentence text not null, reading text not null default '',
  english text not null default '', wrong text[] not null default '{}'
);
create table if not exists island_zones (id text primary key, name text not null, sort integer not null default 0);
create table if not exists island_levels (
  level integer primary key, zone text not null, name text not null, sub text not null default ''
);
create table if not exists island_npcs (
  id text primary key, zone text not null, name text not null, role text not null default '',
  kind text not null, greeting text not null default '', sort integer not null default 0
);
create table if not exists island_shop_categories (id text primary key, name text not null, sort integer not null default 0);
create table if not exists island_shop_items (
  id text primary key, name text not null, cat text not null, price integer not null check (price >= 0), sort integer not null default 0
);

do $$
declare t text;
begin
  foreach t in array array['island_zone_words','island_role_words','island_sentences','island_zones','island_levels','island_npcs','island_shop_categories','island_shop_items']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('grant select on %I to anon, authenticated', t);
    execute format('drop policy if exists "%s_read" on %I', t, t);
    execute format('create policy "%s_read" on %I for select using (true)', t, t);
  end loop;
end $$;
-- ============================================================
-- App content (read-only for players; filled by rewards_seed.sql, cards_seed.sql, capture_seed.sql, profile_seed.sql)
-- ============================================================
create table if not exists rarity_tiers (id text primary key, label text not null, xp integer not null check (xp >= 0), sort integer not null default 0);
create table if not exists rarity_cutoffs (language text not null, tier text not null, last_rank integer not null check (last_rank > 0), primary key (language, tier));
create table if not exists reward_config (id text primary key, xp integer not null default 0 check (xp >= 0), coins integer not null default 0 check (coins >= 0));
create table if not exists quest_defs (
  id text primary key, title text not null, event text not null, target integer not null check (target > 0),
  xp integer not null default 0, coins integer not null default 0, soon boolean not null default false, sort integer not null default 0
);
create table if not exists album_defs (id text primary key, name text not null, sort integer not null default 0);
create table if not exists evolution_stages (stage integer primary key, label text not null, min_uses integer not null default 0);
create table if not exists theme_categories (theme text primary key, category text not null);
create table if not exists filler_words (language text not null, word text not null, primary key (language, word));
create table if not exists avatar_defs (id text primary key, label text not null, sort integer not null default 0);

do $$
declare t text;
begin
  foreach t in array array['rarity_tiers','rarity_cutoffs','reward_config','quest_defs','album_defs','evolution_stages','theme_categories','filler_words','avatar_defs']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('grant select on %I to anon, authenticated', t);
    execute format('drop policy if exists "%s_read" on %I', t, t);
    execute format('create policy "%s_read" on %I for select using (true)', t, t);
  end loop;
end $$;
-- ============================================================
-- FESTIVAL TREASURE HUNTS
-- ============================================================
-- A hunt is live between its start and end dates (Singapore time). The player captures words from
-- the event's list; each find pays points = the word's stroke count, as coins and XP. Finding every
-- word pays the event's bonus once. The words themselves are in database/festival_seed.sql.

create table if not exists festival_events (
  id          text primary key,                          -- e.g. 'halloween', 'cny2027'
  language    varchar(10) not null default 'zh' check (language in ('zh', 'ms', 'ta')),
  name        text not null,                             -- English name
  name_native text not null default '',                  -- name in the language (shown beside it)
  blurb       text not null default '',
  icon        text not null default 'pumpkin',           -- pumpkin | lantern | boat | moon
  starts_on   date not null,
  ends_on     date not null,
  bonus       integer not null default 50 check (bonus >= 0),   -- coins and XP for finding every word
  check (ends_on >= starts_on)
);

create table if not exists festival_words (
  event_id text not null references festival_events (id) on delete cascade,
  word     text not null,
  pinyin   text not null default '',
  meaning  text not null,
  chars    jsonb not null default '[]'::jsonb,           -- [{ "c": "南", "py": "nán", "m": "south", "s": 9 }, ...]
  strokes  integer not null check (strokes > 0),         -- total strokes = the points for finding it
  sort     integer not null default 0,
  primary key (event_id, word)
);

create table if not exists festival_finds (
  user_id  uuid not null references auth.users (id) on delete cascade,
  event_id text not null,
  word     text not null,
  points   integer not null,
  found_at timestamptz not null default now(),
  primary key (user_id, event_id, word),
  foreign key (event_id, word) references festival_words (event_id, word) on delete cascade
);

create table if not exists festival_spotted (
  user_id    uuid not null references auth.users (id) on delete cascade,
  event_id   text not null,
  word       text not null,
  spotted_at timestamptz not null default now(),
  primary key (user_id, event_id, word),
  foreign key (event_id, word) references festival_words (event_id, word) on delete cascade
);
-- A word is "spotted" when its photo passed the check. It is only "found" (festival_finds, points paid)
-- once the player also gives its Chinese word. Spotted rows are written by the festival-verify function only.

alter table festival_events enable row level security;
alter table festival_words  enable row level security;
alter table festival_finds  enable row level security;
alter table festival_spotted enable row level security;

drop policy if exists "festival events readable" on festival_events;
drop policy if exists "festival words readable"  on festival_words;
drop policy if exists "festival finds select own" on festival_finds;
drop policy if exists "festival spotted select own" on festival_spotted;
create policy "festival events readable" on festival_events for select to authenticated using (true);
create policy "festival words readable"  on festival_words  for select to authenticated using (true);
create policy "festival finds select own" on festival_finds for select to authenticated using (auth.uid() = user_id);
create policy "festival spotted select own" on festival_spotted for select to authenticated using (auth.uid() = user_id);
-- there is no insert policy on festival_finds: finds are only made by festival_claim() below, which checks the dates and the word list.

-- festival_claim(user, event, words): the festival-verify Edge Function calls this AFTER Claude has checked a photo.
-- Players cannot call it themselves (only the service role can), so a word can only be claimed with a photo.
-- Returns what was new and what it paid:  { found: [{ word, points }], points, bonus, total_found, total_words }
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

-- ============================================================
-- CARD BATTLE: fight a boss with your word cards (separate from duels)
-- Run AFTER schema.sql (it uses album_cards, evolution_stages, island_zone_words,
-- composition_questions and profiles).
-- Paste into the Supabase SQL Editor (New query) and run.
-- Safe to run again: tables are skipped, policies and functions are replaced.
--
-- How a battle works
--   0. Bosses are LOCKED until you own enough Chinese word cards: boss 1 needs 20,
--      boss 2 needs 30, boss 3 needs 45 (change them in _battle_zone_min_cards() below).
--   1. Pick a boss (zone 1-3). Your deck is your Chinese word cards (album_cards).
--   2. Every round you are dealt 3 cards. Pick one to play.
--   3. The game asks a composition question that CONTAINS that card's word. Build the
--      sentence to attack. You get 2 tries.
--   4. Damage = card power x bonuses:
--        first try x1.0, second try x0.6
--        answered within 10 seconds x1.25, within 20 seconds x1.1
--        combo: +10% for each perfect round in a row (up to +50%)
--        word not actually in the question (rare fallback) x0.5
--   5. The boss hits back every round: half damage if you were perfect, full if you
--      needed a retry, 1.5x if you missed.
--   6. A card that lands a hit gets +1 use and EVOLVES when it reaches the next stage in
--      evolution_stages. Evolved cards hit harder, so practising a word makes it stronger.
--   7. Win = 30 XP (+ up to 10 for HP left). Lose = 5 XP.
-- The database decides everything (answers, damage, HP, rewards), so editing the page
-- cannot cheat.
-- ============================================================

create table if not exists public.battles (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  zone                integer not null check (zone between 1 and 3),
  status              text not null default 'active'
                      check (status in ('active', 'won', 'lost', 'abandoned')),
  round               integer not null default 1,
  phase               text not null default 'pick' check (phase in ('pick', 'answer')),
  boss_name           text not null,
  boss_hp             integer not null,
  boss_max            integer not null,
  boss_attack         integer not null,
  player_hp           integer not null default 100,
  player_max          integer not null default 100,
  combo               integer not null default 0,
  hand                bigint[] not null default '{}',      -- album_cards.card_id of the 3 cards dealt
  card_id             bigint,                              -- the card being played
  question_id         bigint,
  question_started_at timestamptz,
  tries               integer not null default 0,
  on_theme            boolean not null default true,       -- false: no question contained the word
  used_questions      bigint[] not null default '{}',
  last_event          jsonb,                               -- what happened in the last round
  evolutions          jsonb not null default '[]'::jsonb,  -- cards that evolved in this battle
  xp_gained           integer not null default 0,
  created_at          timestamptz not null default now(),
  finished_at         timestamptz
);

create index if not exists battles_user_idx on public.battles (user_id, status);

alter table public.battles enable row level security;

-- Players can only READ their own battles. Only the functions below change anything.
drop policy if exists "battles select own" on public.battles;
create policy "battles select own" on public.battles
  for select to authenticated
  using (auth.uid() = user_id);

revoke all on public.battles from anon, authenticated;
grant select on public.battles to authenticated;

-- ---------- internal: rarity bonus (plug your real rarity in here) ----------
-- Returns extra card power for a rare word. It is 0 for now. When you know how a word's
-- rarity is worked out, return e.g. 2 for uncommon, 4 for rare, 6 for epic, 10 for legendary.
create or replace function public._card_rarity_bonus(p_language text, p_word text)
returns integer
language sql immutable as $$ select 0 $$;

-- ---------- internal: evolution stage for a number of uses ----------
-- Uses your evolution_stages table; if it is empty: 3, 8 and 15 uses give stages 1, 2, 3.
create or replace function public._card_stage_for(p_uses integer)
returns integer
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select max(stage) from public.evolution_stages where min_uses <= p_uses),
    case when p_uses >= 15 then 3 when p_uses >= 8 then 2 when p_uses >= 3 then 1 else 0 end);
$$;

-- ---------- internal: card power ----------
-- 10 base, +4 per evolution stage, +1 for every 3 uses (up to 10), +2 per extra character
-- of the word (up to 3 extra), plus the rarity bonus.
create or replace function public._card_power(p_language text, p_word text, p_stage integer, p_uses integer)
returns integer
language sql stable security definer set search_path = public as $$
  select 10 + 4 * greatest(p_stage, 0)
            + least(greatest(p_uses, 0), 30) / 3
            + least(greatest(char_length(p_word) - 1, 0), 3) * 2
            + public._card_rarity_bonus(p_language, p_word);
$$;

-- ---------- internal: one card as JSON (for the page) ----------
create or replace function public._battle_card_json(p_card_id bigint)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'card_id',      ac.card_id,
    'word',         ac.word,
    'stage',        ac.evolution_stage,
    'stage_label',  coalesce((select es.label from public.evolution_stages es where es.stage = ac.evolution_stage),
                             'Stage ' || ac.evolution_stage),
    'uses',         ac.usage_count,
    'power',        public._card_power(ac.language, ac.word, ac.evolution_stage, ac.usage_count),
    'romanization', (select iz.romanization from public.island_zone_words iz
                      where iz.language = ac.language and iz.word = ac.word limit 1),
    'meaning',      (select iz.meaning from public.island_zone_words iz
                      where iz.language = ac.language and iz.word = ac.word limit 1))
  from public.album_cards ac
  where ac.card_id = p_card_id;
$$;

-- ---------- internal: deal 3 random cards from the player's deck ----------
create or replace function public._battle_deal(p_user uuid)
returns bigint[]
language sql volatile security definer set search_path = public as $$
  select coalesce(array_agg(card_id), '{}')
    from (select card_id from public.album_cards
           where user_id = p_user and language = 'zh'
           order by random() limit 3) d;
$$;

-- ---------- internal: the whole battle as JSON ----------
create or replace function public._battle_json(p_id uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id',         b.id,
    'status',     b.status,
    'zone',       b.zone,
    'round',      b.round,
    'phase',      b.phase,
    'boss',       jsonb_build_object('name', b.boss_name, 'hp', b.boss_hp, 'max', b.boss_max, 'attack', b.boss_attack),
    'player',     jsonb_build_object('hp', b.player_hp, 'max', b.player_max),
    'combo',      b.combo,
    'tries',      b.tries,
    'on_theme',   b.on_theme,
    'hand',       coalesce((select jsonb_agg(public._battle_card_json(h.id) order by h.ord)
                              from unnest(b.hand) with ordinality as h(id, ord)), '[]'::jsonb),
    'card',       case when b.card_id is null then null else public._battle_card_json(b.card_id) end,
    'question',   case when b.phase = 'answer' and b.question_id is not null then
                    (select jsonb_build_object('id', q.id, 'prompt', q.prompt, 'tiles', q.tiles, 'topic', q.topic)
                       from public.composition_questions q where q.id = b.question_id)
                  else null end,
    'question_started_at', b.question_started_at,
    'last_event', b.last_event,
    'evolutions', b.evolutions,
    'xp_gained',  b.xp_gained,
    'server_now', now())
  from public.battles b
  where b.id = p_id;
$$;

-- ---------- battle_deck: my cards, strongest first (for the start screen) ----------
create or replace function public.battle_deck()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;

  return coalesce((
    select jsonb_agg(public._battle_card_json(c.card_id)
             order by public._card_power(c.language, c.word, c.evolution_stage, c.usage_count) desc, c.word)
      from public.album_cards c
     where c.user_id = auth.uid() and c.language = 'zh'), '[]'::jsonb);
end $$;

-- ---------- each boss unlocks after this many word cards ----------
-- Change the numbers here to make a boss easier or harder to unlock.
-- (To add a boss later, add a line here and a boss in the page.)
create or replace function public._battle_zone_min_cards(p_zone integer)
returns integer
language sql immutable as $$
  select case p_zone
           when 1 then 20
           when 2 then 30
           when 3 then 45
           else 45
         end
$$;

-- the cards needed for the very first boss (kept for the old page)
create or replace function public._battle_min_cards()
returns integer
language sql immutable as $$ select public._battle_zone_min_cards(1) $$;

-- ---------- battle_requirements: what the start screen needs to show the lock ----------
-- have = my Chinese word cards, min_cards = cards for the first boss,
-- zones = cards needed per boss, e.g. {"1":20,"2":30,"3":45}, total_words = words that exist on the island.
create or replace function public.battle_requirements()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;

  return jsonb_build_object(
    'min_cards',   public._battle_min_cards(),
    'zones',       jsonb_build_object('1', public._battle_zone_min_cards(1),
                                      '2', public._battle_zone_min_cards(2),
                                      '3', public._battle_zone_min_cards(3)),
    'have',        (select count(*) from public.album_cards where user_id = auth.uid() and language = 'zh'),
    'total_words', (select count(distinct word) from public.island_zone_words where language = 'zh'));
end $$;

-- ---------- battle_start: begin a battle against a zone boss ----------
-- Returns the new battle id. Any battle you left unfinished is closed first.
create or replace function public.battle_start(p_zone integer)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_hand bigint[];
  v_id   uuid;
  v_have integer;
begin
  if v_uid is null then raise exception 'not signed in'; end if;
  if p_zone not between 1 and 3 then raise exception 'pick a boss'; end if;

  -- each boss unlocks once the player has collected enough word cards
  select count(*) into v_have from public.album_cards where user_id = v_uid and language = 'zh';

  if v_have < public._battle_zone_min_cards(p_zone) then
    raise exception 'this boss unlocks at % word cards, you have %', public._battle_zone_min_cards(p_zone), v_have;
  end if;

  v_hand := public._battle_deal(v_uid);

  if coalesce(array_length(v_hand, 1), 0) < 3 then
    raise exception 'you need at least 3 cards to battle, win some on the island first';
  end if;

  if not exists (select 1 from public.composition_questions where zone = p_zone and language = 'zh-CN') then
    raise exception 'this boss has no questions yet';
  end if;

  update public.battles set status = 'abandoned', finished_at = now()
   where user_id = v_uid and status = 'active';

  insert into public.battles (user_id, zone, boss_name, boss_hp, boss_max, boss_attack, hand)
  values (v_uid, p_zone,
          case p_zone when 1 then 'Lift Gremlin' when 2 then 'Hawker Pigeon' else 'Rush Hour Crowd' end,
          case p_zone when 1 then 60 when 2 then 80 else 100 end,
          case p_zone when 1 then 60 when 2 then 80 else 100 end,
          case p_zone when 1 then 8 when 2 then 10 else 12 end,
          v_hand)
  returning id into v_id;

  return v_id;
end $$;

-- ---------- battle_my_active: the battle I can resume (or null) ----------
create or replace function public.battle_my_active()
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;

  update public.battles set status = 'abandoned', finished_at = now()
   where user_id = auth.uid() and status = 'active' and created_at < now() - interval '6 hours';

  select id into v_id from public.battles
   where user_id = auth.uid() and status = 'active'
   order by created_at desc limit 1;

  return v_id;
end $$;

-- ---------- battle_state: read a battle (no changes made) ----------
create or replace function public.battle_state(p_battle uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;

  if not exists (select 1 from public.battles where id = p_battle and user_id = auth.uid()) then
    raise exception 'battle not found';
  end if;

  return public._battle_json(p_battle);
end $$;

-- ---------- battle_play: choose a card from your hand ----------
-- Picks a question that contains the card's word (preferring this boss's zone).
create or replace function public.battle_play(p_battle uuid, p_card_id bigint)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  b       public.battles%rowtype;
  v_word  text;
  v_q     bigint;
  v_theme boolean := true;
begin
  if v_uid is null then raise exception 'not signed in'; end if;

  select * into b from public.battles where id = p_battle and user_id = v_uid for update;
  if not found then raise exception 'battle not found'; end if;
  if b.status <> 'active' then raise exception 'this battle is over'; end if;
  if b.phase <> 'pick' then raise exception 'you already played a card this round'; end if;
  if not (p_card_id = any (b.hand)) then raise exception 'that card is not in your hand'; end if;

  select word into v_word from public.album_cards where card_id = p_card_id and user_id = v_uid;
  if v_word is null then raise exception 'card not found'; end if;

  -- 1. a question with the word, not used yet in this battle, this zone first
  select id into v_q from public.composition_questions
   where language = 'zh-CN' and tiles @> to_jsonb(array[v_word]) and not (id = any (b.used_questions))
   order by (zone = b.zone) desc, random() limit 1;

  -- 2. same, allowing a repeat
  if v_q is null then
    select id into v_q from public.composition_questions
     where language = 'zh-CN' and tiles @> to_jsonb(array[v_word])
     order by (zone = b.zone) desc, random() limit 1;
  end if;

  -- 3. no question has this word: any question from the zone, weaker attack
  if v_q is null then
    v_theme := false;
    select id into v_q from public.composition_questions
     where language = 'zh-CN' and zone = b.zone
     order by (id = any (b.used_questions)), random() limit 1;
  end if;

  update public.battles
     set phase = 'answer', card_id = p_card_id, question_id = v_q, question_started_at = now(),
         tries = 0, on_theme = v_theme, used_questions = array_append(used_questions, v_q)
   where id = p_battle;

  return public._battle_json(p_battle);
end $$;

-- ---------- battle_answer: build the sentence, attack ----------
create or replace function public.battle_answer(p_battle uuid, p_answer text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_uid     uuid := auth.uid();
  b         public.battles%rowtype;
  c         public.album_cards%rowtype;
  q         public.composition_questions%rowtype;
  v_clean   text := regexp_replace(coalesce(p_answer, ''), '\s', '', 'g');
  v_ok      boolean;
  v_tries   integer;
  v_power   integer;
  v_elapsed numeric;
  m_speed   numeric := 1.0;
  m_retry   numeric := 1.0;
  m_theme   numeric := 1.0;
  m_combo   numeric := 1.0;
  v_damage  integer := 0;
  v_boss_dmg integer := 0;
  v_perfect boolean := false;
  v_hit     boolean := false;
  v_new_uses integer;
  v_new_stage integer;
  v_evolved jsonb := null;
  v_status  text := 'active';
  v_xp      integer := 0;
  v_hand    bigint[];
  v_event   jsonb;
begin
  if v_uid is null then raise exception 'not signed in'; end if;

  select * into b from public.battles where id = p_battle and user_id = v_uid for update;
  if not found then raise exception 'battle not found'; end if;
  if b.status <> 'active' then raise exception 'this battle is over'; end if;
  if b.phase <> 'answer' then raise exception 'play a card first'; end if;
  if v_clean = '' then raise exception 'build your sentence first'; end if;

  select * into q from public.composition_questions where id = b.question_id;
  select * into c from public.album_cards where card_id = b.card_id;

  select exists (select 1 from jsonb_array_elements_text(q.accepted_answers) a
                  where regexp_replace(a, '\s', '', 'g') = v_clean)
    into v_ok;

  v_tries := b.tries + 1;

  -- wrong, but there is still a second try
  if not v_ok and v_tries < 2 then
    update public.battles
       set tries = v_tries,
           last_event = jsonb_build_object('result', 'wrong', 'tries_left', 2 - v_tries,
                                           'sentence', left(p_answer, 200), 'round', b.round)
     where id = p_battle;
    return public._battle_json(p_battle);
  end if;

  v_elapsed := extract(epoch from (now() - b.question_started_at));
  v_power   := public._card_power(c.language, c.word, c.evolution_stage, c.usage_count);

  if v_ok then
    v_hit     := true;
    v_perfect := (b.tries = 0);
    m_retry   := case when v_perfect then 1.0 else 0.6 end;
    m_speed   := case when v_elapsed <= 10 then 1.25 when v_elapsed <= 20 then 1.1 else 1.0 end;
    m_theme   := case when b.on_theme then 1.0 else 0.5 end;
    m_combo   := 1 + 0.1 * least(b.combo, 5);
    v_damage  := greatest(1, round(v_power * m_speed * m_retry * m_theme * m_combo));

    -- the card grows each time it lands a hit
    v_new_uses  := c.usage_count + 1;
    v_new_stage := greatest(c.evolution_stage, public._card_stage_for(v_new_uses));
    update public.album_cards
       set usage_count = v_new_uses, evolution_stage = v_new_stage
     where card_id = c.card_id;

    if v_new_stage > c.evolution_stage then
      v_evolved := jsonb_build_object('word', c.word, 'stage', v_new_stage,
        'label', coalesce((select label from public.evolution_stages where stage = v_new_stage), 'Stage ' || v_new_stage));
    end if;
  end if;

  -- boss HP
  b.boss_hp := greatest(0, b.boss_hp - v_damage);

  if b.boss_hp = 0 then
    v_status := 'won';
    v_xp := 30 + least(b.player_hp / 10, 10);
  else
    -- the boss hits back
    v_boss_dmg := case when v_hit and v_perfect then round(b.boss_attack / 2.0)
                       when v_hit then b.boss_attack
                       else round(b.boss_attack * 1.5) end;
    b.player_hp := greatest(0, b.player_hp - v_boss_dmg);

    if b.player_hp = 0 then
      v_status := 'lost';
      v_xp := 5;
    end if;
  end if;

  v_event := jsonb_build_object(
    'result',      case when v_hit then 'hit' else 'miss' end,
    'word',        c.word,
    'power',       v_power,
    'damage',      v_damage,
    'boss_damage', v_boss_dmg,
    'perfect',     v_perfect,
    'tries',       v_tries,
    'elapsed',     round(v_elapsed, 1),
    'mult',        jsonb_build_object('speed', m_speed, 'retry', m_retry, 'theme', m_theme, 'combo', m_combo),
    'combo_after', case when v_hit and v_perfect then b.combo + 1 else 0 end,
    'evolved',     v_evolved,
    'answer',      q.accepted_answers ->> 0,
    'sentence',    left(p_answer, 200),
    'explanation', q.explanation,
    'round',       b.round);

  if v_status = 'active' then
    v_hand := public._battle_deal(v_uid);

    update public.battles
       set boss_hp = b.boss_hp, player_hp = b.player_hp, round = round + 1, phase = 'pick',
           combo = case when v_hit and v_perfect then combo + 1 else 0 end,
           card_id = null, question_id = null, question_started_at = null, tries = 0,
           hand = v_hand, last_event = v_event,
           evolutions = case when v_evolved is null then evolutions else evolutions || jsonb_build_array(v_evolved) end
     where id = p_battle;
  else
    update public.battles
       set boss_hp = b.boss_hp, player_hp = b.player_hp, status = v_status, finished_at = now(),
           combo = case when v_hit and v_perfect then combo + 1 else 0 end,
           phase = 'pick', card_id = null, question_id = null, question_started_at = null, tries = 0,
           xp_gained = v_xp, last_event = v_event,
           evolutions = case when v_evolved is null then evolutions else evolutions || jsonb_build_array(v_evolved) end
     where id = p_battle;

    update public.profiles set xp = xp + v_xp where user_id = v_uid;
  end if;

  return public._battle_json(p_battle);
end $$;

-- ---------- battle_forfeit: give up (no XP) ----------
create or replace function public.battle_forfeit(p_battle uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;

  update public.battles set status = 'abandoned', finished_at = now()
   where id = p_battle and user_id = auth.uid() and status = 'active';
end $$;

-- Only signed-in players can call these.
revoke all on function public._card_rarity_bonus(text, text) from public, anon, authenticated;
revoke all on function public._card_stage_for(integer) from public, anon, authenticated;
revoke all on function public._card_power(text, text, integer, integer) from public, anon, authenticated;
revoke all on function public._battle_card_json(bigint) from public, anon, authenticated;
revoke all on function public._battle_deal(uuid) from public, anon, authenticated;
revoke all on function public._battle_json(uuid) from public, anon, authenticated;
revoke all on function public._battle_min_cards() from public, anon, authenticated;
revoke all on function public._battle_zone_min_cards(integer) from public, anon, authenticated;
revoke all on function public.battle_requirements() from public, anon;
revoke all on function public.battle_deck() from public, anon;
revoke all on function public.battle_start(integer) from public, anon;
revoke all on function public.battle_my_active() from public, anon;
revoke all on function public.battle_state(uuid) from public, anon;
revoke all on function public.battle_play(uuid, bigint) from public, anon;
revoke all on function public.battle_answer(uuid, text) from public, anon;
revoke all on function public.battle_forfeit(uuid) from public, anon;

grant execute on function public.battle_requirements() to authenticated;
grant execute on function public.battle_deck() to authenticated;
grant execute on function public.battle_start(integer) to authenticated;
grant execute on function public.battle_my_active() to authenticated;
grant execute on function public.battle_state(uuid) to authenticated;
grant execute on function public.battle_play(uuid, bigint) to authenticated;
grant execute on function public.battle_answer(uuid, text) to authenticated;
grant execute on function public.battle_forfeit(uuid) to authenticated;

-- ============================================================
-- CARD GIFTS (spares on album cards, gifts between friends). Same as database/gifts.sql.
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
