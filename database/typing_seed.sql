-- Typing questions: the sentence bank for the Typing game of every zone.
-- Each row is one sentence the player types once, as one of the 5 questions of a run (less help the later it comes).
-- There are no levels: every run asks 5 random sentences from the zone's bank (sentences not asked
-- recently first, and sentences that use words the player captured come first). When the player has
-- captured enough words that fit the zone, one of the five is a bonus sentence built from them (see TYPING_BONUS_FRAMES in js/typing/typingData.js). Add more rows to grow the bank.
-- Only Chinese (zh) so far: add 'ms' and 'ta' rows the same way and list the language in js/island/miniGames.js.
--
-- Paste into the Supabase SQL Editor and run. Safe to run again: the table is created if it is missing and
-- the old sentences are removed before the new ones go in, so you never get duplicates.
--
-- language uses the same codes as journey_progress / island_progress: 'zh', 'ms', 'ta'.
-- words = the island's zone words (island_zone_words) that appear in the sentence. A player who answers the
-- question with no "Show me" can win those cards. Keep them in step with js/typing/typingData.js,
-- which the page falls back to if this table cannot be reached.
-- romanization has one syllable per typed character (tone marks and spaces are fine): the game lines them
-- up to mark each character right or wrong when someone types pinyin instead of Chinese.

create table if not exists public.typing_questions (
  id             bigint generated always as identity primary key,
  zone           integer      not null,
  topic          text         not null,
  language       varchar(10)  not null,
  target         text         not null,                     -- the sentence the player types
  romanization   text         not null default '',          -- pinyin (one syllable per character)
  english        text         not null,                     -- what it means
  words          text[]       not null default '{}',        -- zone words used in the sentence
  created_at     timestamptz  not null default now(),
  constraint unique_typing_sentence unique (zone, language, target)
);

alter table public.typing_questions enable row level security;

drop policy if exists "Anyone can read typing questions" on public.typing_questions;
create policy "Anyone can read typing questions"
  on public.typing_questions
  for select
  to anon, authenticated
  using (true);

delete from public.typing_questions;   -- the sentences below are loaded fresh

insert into public.typing_questions (zone, topic, language, target, romanization, english, words) values
  (1, 'neighbourhood', 'zh', '今天攀岩后我的手臂超级酸痛。', 'jīn tiān pān yán hòu wǒ de shǒu bì chāo jí suān tòng.', 'My arms are so sore after bouldering today.', ARRAY['今天', '攀岩', '手臂', '酸痛']::text[]),
  (1, 'neighbourhood', 'zh', '小孩在游乐场玩。', 'xiǎo hái zài yóu lè chǎng wán.', 'The kids are playing at the playground.', ARRAY['游乐场', '小孩', '玩']::text[]),
  (1, 'neighbourhood', 'zh', '阿姨，晚上好！你吃饭了吗？', 'ā yí, wǎn shang hǎo! nǐ chī fàn le ma?', 'Auntie, good evening! Have you eaten?', ARRAY['晚上', '阿姨', '吃饭']::text[]),
  (1, 'neighbourhood', 'zh', '我奶奶喜欢坐在这里聊天。', 'wǒ nǎi nai xǐ huan zuò zài zhè lǐ liáo tiān.', 'My grandma likes to sit here and chat.', ARRAY['奶奶', '喜欢', '聊天']::text[]),
  (1, 'neighbourhood', 'zh', '中午的滑梯很烫。', 'zhōng wǔ de huá tī hěn tàng.', 'The slide is very hot at noon.', ARRAY['中午', '滑梯', '烫']::text[]),
  (1, 'neighbourhood', 'zh', '吃完饭我们去公园散步吧。', 'chī wán fàn wǒ men qù gōng yuán sàn bù ba.', 'Let''s go for a walk in the park after dinner.', ARRAY['公园', '散步']::text[]),
  (1, 'neighbourhood', 'zh', '叔叔在楼下下棋。', 'shū shu zài lóu xià xià qí.', 'Uncle is playing chess downstairs.', ARRAY['楼下', '叔叔', '下棋']::text[]),
  (1, 'neighbourhood', 'zh', '记得跟邻居打招呼。', 'jì de gēn lín jū dǎ zhāo hu.', 'Remember to say hello to the neighbours.', ARRAY['邻居', '记得', '打招呼']::text[]),
  (1, 'neighbourhood', 'zh', '电梯又坏了，我们只好走楼梯。', 'diàn tī yòu huài le, wǒ men zhǐ hǎo zǒu lóu tī.', 'The lift is broken again, so we have to take the stairs.', ARRAY['电梯', '坏了', '楼梯', '走']::text[]),
  (2, 'hawker centre', 'zh', '老板，我要一包鸡饭，打包。', 'lǎo bǎn, wǒ yào yī bāo jī fàn, dǎ bāo.', 'Boss, I want one packet of chicken rice, take away.', ARRAY['鸡饭', '打包', '老板', '一包']::text[]),
  (2, 'hawker centre', 'zh', '请给我一杯咖啡，少糖。', 'qǐng gěi wǒ yī bēi kā fēi, shǎo táng.', 'One coffee, less sugar please.', ARRAY['咖啡', '糖', '一杯', '少糖']::text[]),
  (2, 'hawker centre', 'zh', '这个座位有人坐吗？', 'zhè ge zuò wèi yǒu rén zuò ma?', 'Is this seat taken?', ARRAY['有人']::text[]),
  (2, 'hawker centre', 'zh', '今天排队的人好多。', 'jīn tiān pái duì de rén hǎo duō.', 'The queue is so long today.', ARRAY['排队', '好多']::text[]),
  (2, 'hawker centre', 'zh', '请多加一点辣椒。', 'qǐng duō jiā yī diǎn là jiāo.', 'Please add a bit more chilli.', ARRAY['辣', '辣椒', '加', '一点']::text[]),
  (2, 'hawker centre', 'zh', '一共多少钱？', 'yī gòng duō shao qián?', 'How much is it altogether?', ARRAY['多少钱', '一共']::text[]),
  (2, 'hawker centre', 'zh', '好拥挤，我们先找位子吧。', 'hǎo yōng jǐ, wǒ men xiān zhǎo wèi zi ba.', 'It''s so crowded, let''s find a seat first.', ARRAY['位子', '拥挤', '找']::text[]),
  (2, 'hawker centre', 'zh', '我用手机付钱可以吗？', 'wǒ yòng shǒu jī fù qián kě yǐ ma?', 'Can I pay with my phone?', ARRAY['付钱', '手机', '可以']::text[]),
  (2, 'hawker centre', 'zh', '这家的鸡饭真好吃。', 'zhè jiā de jī fàn zhēn hǎo chī.', 'The chicken rice here is really tasty.', ARRAY['鸡饭', '好吃']::text[]),
  (3, 'public transport', 'zh', '师傅，请到乌节路。', 'shī fu, qǐng dào wū jié lù.', 'Driver, please go to Orchard Road.', ARRAY['乌节路', '师傅']::text[]),
  (3, 'public transport', 'zh', '车费是多少？', 'chē fèi shì duō shao?', 'How much is the fare?', ARRAY['车费']::text[]),
  (3, 'public transport', 'zh', '德士站的队很长。', 'dé shì zhàn de duì hěn cháng.', 'The taxi queue is very long.', ARRAY['德士', '德士站']::text[]),
  (3, 'public transport', 'zh', '我要在下一站转乘。', 'wǒ yào zài xià yī zhàn zhuǎn chéng.', 'I need to transfer at the next station.', ARRAY['下一站', '转乘']::text[]),
  (3, 'public transport', 'zh', '上巴士的时候请刷卡。', 'shàng bā shì de shí hou qǐng shuā kǎ.', 'Please tap your card when you board the bus.', ARRAY['巴士', '刷卡']::text[]),
  (3, 'public transport', 'zh', '地铁又延误了。', 'dì tiě yòu yán wù le.', 'The MRT is delayed again.', ARRAY['地铁', '延误']::text[]),
  (3, 'public transport', 'zh', '请问哪一路巴士去淡滨尼？', 'qǐng wèn nǎ yī lù bā shì qù dàn bīn ní?', 'Excuse me, which bus goes to Tampines?', ARRAY['巴士', '淡滨尼']::text[]),
  (3, 'public transport', 'zh', '请在这里停车，谢谢。', 'qǐng zài zhè lǐ tíng chē, xiè xie.', 'Please stop here, thank you.', ARRAY['停车', '谢谢']::text[]),
  (3, 'public transport', 'zh', '请给老人让座。', 'qǐng gěi lǎo rén ràng zuò.', 'Please give up your seat to the elderly.', ARRAY['让座']::text[]);