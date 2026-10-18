-- database/rewards_seed.sql
-- What players earn: XP per rarity, the rarity cut-offs, album and level-up rewards, and the daily quests.
-- (The server still caps each reward call at 500 XP / 500 coins inside add_rewards.)
-- Safe to run again: it updates what is already there. Run schema.sql first.

insert into rarity_tiers (id, label, xp, sort) values
  ('common', 'Common', 5, 1),
  ('uncommon', 'Uncommon', 8, 2),
  ('rare', 'Rare', 15, 3),
  ('epic', 'Epic', 30, 4),
  ('legendary', 'Legendary', 60, 5)
on conflict (id) do update set label = excluded.label, xp = excluded.xp, sort = excluded.sort;

-- The last frequency rank of each tier, per language. A word past the last number (or not in the list) is Legendary.
insert into rarity_cutoffs (language, tier, last_rank) values
  ('zh', 'common', 400),
  ('zh', 'uncommon', 1500),
  ('zh', 'rare', 4000),
  ('zh', 'epic', 8000),
  ('ms', 'common', 400),
  ('ms', 'uncommon', 1500),
  ('ms', 'rare', 4000),
  ('ms', 'epic', 8000),
  ('ta', 'common', 300),
  ('ta', 'uncommon', 1000),
  ('ta', 'rare', 2500),
  ('ta', 'epic', 6000)
on conflict (language, tier) do update set last_rank = excluded.last_rank;

insert into reward_config (id, xp, coins) values
  ('album_complete', 150, 100),
  ('album_master', 100, 60),
  ('level_up', 0, 20)
on conflict (id) do update set xp = excluded.xp, coins = excluded.coins;

insert into quest_defs (id, title, event, target, xp, coins, soon, sort) values
  ('capture3', 'Capture 3 words', 'capture_word', 3, 30, 10, false, 1),
  ('scan1', 'Scan a photo', 'photo_scan', 1, 15, 5, false, 2),
  ('practise2', 'Practise 2 cards', 'practise_card', 2, 20, 5, false, 3),
  ('minigame1', 'Win a mini-game', 'minigame_win', 1, 40, 15, true, 4)
on conflict (id) do update set title = excluded.title, event = excluded.event, target = excluded.target, xp = excluded.xp, coins = excluded.coins, soon = excluded.soon, sort = excluded.sort;