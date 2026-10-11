-- ============================================================
-- Whole database for the app (Supabase / Postgres).
-- Run in the Supabase SQL Editor. Safe to run more than once, on a
-- brand-new project or on the live one: it creates what is missing,
-- adds missing columns, and replaces the access rules with the
-- current ones.
-- ============================================================


-- ------------------------------------------------------------
-- profiles: one row per player. Holds the public username, the
-- profile picture and the daily-login streak.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Added after the first version of the table (picture and streak).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS avatar TEXT NOT NULL DEFAULT 'merlion',
  ADD COLUMN IF NOT EXISTS current_streak INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_streak INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_active_date DATE;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;

CREATE POLICY "Anyone can view profiles" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- NOTE: this lets a player edit their own streak, so it can be faked.
-- Fine for now; before streaks or XP feed a leaderboard, move the
-- update into a server-side function.
CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);


-- ------------------------------------------------------------
-- journey_progress: one row per player, per language, per level.
-- A level is complete once slot_1_completed is true (each level is
-- one mini-game). slot_2 and slot_3 are unused leftovers from an
-- earlier three-slot design.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS journey_progress (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    language VARCHAR(10) NOT NULL,
    level_number INTEGER NOT NULL DEFAULT 1,
    slot_1_completed BOOLEAN NOT NULL DEFAULT false,
    slot_2_completed BOOLEAN NOT NULL DEFAULT false,
    slot_3_completed BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, language, level_number)
);

ALTER TABLE journey_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own progress" ON journey_progress;
DROP POLICY IF EXISTS "Users can insert their own progress" ON journey_progress;
DROP POLICY IF EXISTS "Users can update their own progress" ON journey_progress;

CREATE POLICY "Users can view their own progress" ON journey_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress" ON journey_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" ON journey_progress
  FOR UPDATE USING (auth.uid() = user_id);


-- ------------------------------------------------------------
-- vocabulary: the words each player has captured. Private to the
-- player, like the card collection it represents.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vocabulary (
    vocab_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    word VARCHAR(255) NOT NULL,
    language VARCHAR(10) NOT NULL,
    romanization VARCHAR(255),
    english_meaning VARCHAR(500),
    context_sentence VARCHAR(1000),
    source VARCHAR(20) NOT NULL DEFAULT 'text',
    rarity VARCHAR(20) DEFAULT 'common',
    evolution_stage SMALLINT DEFAULT 0,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Card pictures. "theme" is the name of a ready-made picture chosen by the
-- AI lookup; "art_svg" is a picture Claude drew for the word (SVG shapes).
ALTER TABLE vocabulary
  ADD COLUMN IF NOT EXISTS theme TEXT,
  ADD COLUMN IF NOT EXISTS art_svg TEXT;

-- A word can only appear once per player and language. The first version
-- of the table made it once per language across ALL players, which would
-- stop two players from capturing the same word. Replace that rule.
ALTER TABLE vocabulary DROP CONSTRAINT IF EXISTS unique_word_language;
ALTER TABLE vocabulary DROP CONSTRAINT IF EXISTS unique_user_word_language;
ALTER TABLE vocabulary
  ADD CONSTRAINT unique_user_word_language UNIQUE (user_id, word, language);

ALTER TABLE vocabulary ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read" ON vocabulary;
DROP POLICY IF EXISTS "Allow public insert" ON vocabulary;
DROP POLICY IF EXISTS "Allow public update" ON vocabulary;
DROP POLICY IF EXISTS "Allow public delete" ON vocabulary;
DROP POLICY IF EXISTS "Users can view their own vocabulary" ON vocabulary;
DROP POLICY IF EXISTS "Users can insert their own vocabulary" ON vocabulary;
DROP POLICY IF EXISTS "Users can update their own vocabulary" ON vocabulary;
DROP POLICY IF EXISTS "Users can delete their own vocabulary" ON vocabulary;

CREATE POLICY "Users can view their own vocabulary" ON vocabulary
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own vocabulary" ON vocabulary
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vocabulary" ON vocabulary
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vocabulary" ON vocabulary
  FOR DELETE USING (auth.uid() = user_id);


-- ------------------------------------------------------------
-- album_cards: the island album cards a player has earned from
-- mini-games (Hawker Centre, Family, ...). Kept apart from
-- "vocabulary" (captured words), so a word can be both a captured
-- card and an album card. Album cards cannot be captured.
--
-- A player can read, add and update their own rows. There is
-- deliberately NO delete policy: album cards cannot be removed,
-- only captured words can.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS album_cards (
    card_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    album_id VARCHAR(40) NOT NULL,
    language VARCHAR(10) NOT NULL,
    word VARCHAR(255) NOT NULL,
    source VARCHAR(40) NOT NULL DEFAULT 'island',
    evolution_stage SMALLINT NOT NULL DEFAULT 0,
    usage_count INTEGER NOT NULL DEFAULT 0,
    earned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One copy of each card per player, album and language.
ALTER TABLE album_cards DROP CONSTRAINT IF EXISTS unique_album_card;
ALTER TABLE album_cards
  ADD CONSTRAINT unique_album_card UNIQUE (user_id, album_id, language, word);

ALTER TABLE album_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own album cards" ON album_cards;
DROP POLICY IF EXISTS "Users can insert their own album cards" ON album_cards;
DROP POLICY IF EXISTS "Users can update their own album cards" ON album_cards;

CREATE POLICY "Users can view their own album cards" ON album_cards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own album cards" ON album_cards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own album cards" ON album_cards
  FOR UPDATE USING (auth.uid() = user_id);