-- database/festival_seed.sql
-- Content for the festival treasure hunts (festival_events, festival_words). Run schema.sql first.
-- Safe to run again: it updates what is already there.
-- Add a new festival: add one row to festival_events and its words to festival_words.
-- (The game's other words, such as NPC and zone words, stay in the JS files and are not in the database.)
-- Check the dates before each year: festivals that follow the lunar calendar move.

insert into festival_events (id, language, name, name_native, blurb, icon, starts_on, ends_on, bonus) values
  ('halloween', 'zh', 'Halloween Treasure Hunt', '万圣节寻宝', 'Spot Halloween words around you, capture them and learn how each character is written.', 'pumpkin', '2026-10-17', '2026-11-01', 50),
  ('cny2027', 'zh', 'Chinese New Year Treasure Hunt', '春节寻宝', 'Find the words of Chinese New Year: red packets, lanterns, dumplings and more.', 'lantern', '2027-01-30', '2027-02-21', 50),
  ('dragonboat2027', 'zh', 'Dragon Boat Festival', '端午节寻宝', 'Zongzi, dragon boats and more. The words arrive nearer the day.', 'boat', '2027-06-02', '2027-06-16', 50),
  ('midautumn2027', 'zh', 'Mid-Autumn Festival', '中秋节寻宝', 'Mooncakes, lanterns and the full moon. The words arrive nearer the day.', 'moon', '2027-09-08', '2027-09-22', 50)
on conflict (id) do update set language = excluded.language, name = excluded.name, name_native = excluded.name_native,
  blurb = excluded.blurb, icon = excluded.icon, starts_on = excluded.starts_on, ends_on = excluded.ends_on, bonus = excluded.bonus;

-- strokes = the total number of strokes in the word; a find is worth that many points. chars = each character with its pinyin, meaning and strokes.
insert into festival_words (event_id, word, pinyin, meaning, chars, strokes, sort) values
  ('halloween', '万圣节', 'wàn shèng jié', 'Halloween', '[{"c":"万","py":"wàn","m":"ten thousand","s":3},{"c":"圣","py":"shèng","m":"holy","s":5},{"c":"节","py":"jié","m":"festival","s":5}]'::jsonb, 13, 1),
  ('halloween', '南瓜', 'nán guā', 'pumpkin', '[{"c":"南","py":"nán","m":"south","s":9},{"c":"瓜","py":"guā","m":"melon / gourd","s":5}]'::jsonb, 14, 2),
  ('halloween', '鬼', 'guǐ', 'ghost', '[{"c":"鬼","py":"guǐ","m":"ghost","s":9}]'::jsonb, 9, 3),
  ('halloween', '糖果', 'táng guǒ', 'candy', '[{"c":"糖","py":"táng","m":"sugar","s":16},{"c":"果","py":"guǒ","m":"fruit","s":8}]'::jsonb, 24, 4),
  ('halloween', '蝙蝠', 'biān fú', 'bat', '[{"c":"蝙","py":"biān","m":"bat (only used with 蝠)","s":15},{"c":"蝠","py":"fú","m":"bat (only used with 蝙)","s":15}]'::jsonb, 30, 5),
  ('halloween', '蜘蛛', 'zhī zhū', 'spider', '[{"c":"蜘","py":"zhī","m":"spider (only used with 蛛)","s":14},{"c":"蛛","py":"zhū","m":"spider (only used with 蜘)","s":12}]'::jsonb, 26, 6),
  ('halloween', '女巫', 'nǚ wū', 'witch', '[{"c":"女","py":"nǚ","m":"woman","s":3},{"c":"巫","py":"wū","m":"sorcery","s":7}]'::jsonb, 10, 7),
  ('halloween', '骷髅', 'kū lóu', 'skeleton', '[{"c":"骷","py":"kū","m":"skull / dry bone","s":14},{"c":"髅","py":"lóu","m":"skull","s":18}]'::jsonb, 32, 8),
  ('halloween', '面具', 'miàn jù', 'mask', '[{"c":"面","py":"miàn","m":"face","s":9},{"c":"具","py":"jù","m":"tool / device","s":8}]'::jsonb, 17, 9),
  ('halloween', '扫帚', 'sào zhǒu', 'broom', '[{"c":"扫","py":"sào","m":"sweep","s":6},{"c":"帚","py":"zhǒu","m":"broom","s":8}]'::jsonb, 14, 10),
  ('halloween', '蜡烛', 'là zhú', 'candle', '[{"c":"蜡","py":"là","m":"wax","s":14},{"c":"烛","py":"zhú","m":"candle","s":10}]'::jsonb, 24, 11),
  ('halloween', '吸血鬼', 'xī xuè guǐ', 'vampire', '[{"c":"吸","py":"xī","m":"suck","s":6},{"c":"血","py":"xuè","m":"blood","s":6},{"c":"鬼","py":"guǐ","m":"ghost","s":9}]'::jsonb, 21, 12),
  ('cny2027', '春节', 'chūn jié', 'Spring Festival (Chinese New Year)', '[{"c":"春","py":"chūn","m":"spring","s":9},{"c":"节","py":"jié","m":"festival","s":5}]'::jsonb, 14, 1),
  ('cny2027', '红包', 'hóng bāo', 'red packet', '[{"c":"红","py":"hóng","m":"red","s":6},{"c":"包","py":"bāo","m":"packet / to wrap","s":5}]'::jsonb, 11, 2),
  ('cny2027', '灯笼', 'dēng lóng', 'lantern', '[{"c":"灯","py":"dēng","m":"lamp","s":6},{"c":"笼","py":"lóng","m":"basket / cage","s":11}]'::jsonb, 17, 3),
  ('cny2027', '鞭炮', 'biān pào', 'firecrackers', '[{"c":"鞭","py":"biān","m":"whip","s":18},{"c":"炮","py":"pào","m":"cannon","s":9}]'::jsonb, 27, 4),
  ('cny2027', '饺子', 'jiǎo zi', 'dumpling', '[{"c":"饺","py":"jiǎo","m":"dumpling","s":9},{"c":"子","py":"zi","m":"small thing / child","s":3}]'::jsonb, 12, 5),
  ('cny2027', '年糕', 'nián gāo', 'new year cake', '[{"c":"年","py":"nián","m":"year","s":6},{"c":"糕","py":"gāo","m":"cake","s":16}]'::jsonb, 22, 6),
  ('cny2027', '对联', 'duì lián', 'spring couplets', '[{"c":"对","py":"duì","m":"pair / to face","s":5},{"c":"联","py":"lián","m":"to join","s":12}]'::jsonb, 17, 7),
  ('cny2027', '舞狮', 'wǔ shī', 'lion dance', '[{"c":"舞","py":"wǔ","m":"dance","s":14},{"c":"狮","py":"shī","m":"lion","s":9}]'::jsonb, 23, 8),
  ('cny2027', '团圆', 'tuán yuán', 'family reunion', '[{"c":"团","py":"tuán","m":"group","s":6},{"c":"圆","py":"yuán","m":"round / whole","s":10}]'::jsonb, 16, 9),
  ('cny2027', '橘子', 'jú zi', 'mandarin orange', '[{"c":"橘","py":"jú","m":"tangerine","s":16},{"c":"子","py":"zi","m":"small thing / child","s":3}]'::jsonb, 19, 10),
  ('cny2027', '福', 'fú', 'blessing / good fortune', '[{"c":"福","py":"fú","m":"blessing / good fortune","s":13}]'::jsonb, 13, 11),
  ('cny2027', '恭喜发财', 'gōng xǐ fā cái', 'wishing you prosperity', '[{"c":"恭","py":"gōng","m":"respectful","s":10},{"c":"喜","py":"xǐ","m":"joy / congratulate","s":12},{"c":"发","py":"fā","m":"to get rich","s":5},{"c":"财","py":"cái","m":"wealth","s":7}]'::jsonb, 34, 12)
on conflict (event_id, word) do update set pinyin = excluded.pinyin, meaning = excluded.meaning, chars = excluded.chars, strokes = excluded.strokes, sort = excluded.sort;


-- ============================================================
-- TEST ONLY: adds a water bottle to the Halloween treasure hunt so it can be tried with any water bottle.
-- Run in the Supabase SQL editor. Safe to run again.
-- Remove it again with the "CLEAN UP" part at the bottom.
-- ============================================================

insert into festival_words (event_id, word, pinyin, meaning, chars, strokes, sort) values
  ('halloween', '水瓶', 'shuǐ píng', 'water bottle',
   '[{"c":"水","py":"shuǐ","m":"water","s":4},{"c":"瓶","py":"píng","m":"bottle","s":10}]'::jsonb, 14, 99)
on conflict (event_id, word) do update set pinyin = excluded.pinyin, meaning = excluded.meaning,
  chars = excluded.chars, strokes = excluded.strokes, sort = excluded.sort;

-- ------------------------------------------------------------
-- TRY IT AGAIN (so the water bottle counts as new for you again): run this, then repeat the photo.
-- It only clears YOUR water-bottle find. Replace the email with your login email if different.
-- delete from festival_finds
--  where event_id = 'halloween' and word = '水瓶'
--    and user_id = (select id from auth.users where email = 'qlixiiu07@gmail.com');
-- delete from festival_spotted
--  where event_id = 'halloween' and word = '水瓶'
--    and user_id = (select id from auth.users where email = 'qlixiiu07@gmail.com');

-- ------------------------------------------------------------
-- CLEAN UP when you are done testing (removes the word and anyone's finds of it):
-- delete from festival_words where event_id = 'halloween' and word = '水瓶';