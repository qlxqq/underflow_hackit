-- Pronunciation questions: the phrase bank for the Pronunciation level of every zone,
-- in Chinese (zh), Malay (ms) and Tamil (ta). 10 phrases per language per zone = 90 rows.
-- Each run of a level picks 6 of them (plus phrases the player missed last time).
--
-- Paste into the Supabase SQL Editor and run. Safe to run again: the table is only created
-- if it's missing, and the old phrases are removed before the new ones go in, so you never
-- get duplicates.
--
-- language uses the same codes as journey_progress / island_progress: 'zh', 'ms', 'ta'.
-- level is the level inside the zone (Pronunciation is level 1 of each zone).
-- If this table can't be reached, the page falls back to js/pronunciation/lessons.js,
-- so keep the two in step when you change a phrase.

create table if not exists public.pronunciation_questions (
  id             bigint generated always as identity primary key,
  zone           integer      not null,
  level          integer      not null default 1,
  topic          text         not null,
  language       varchar(10)  not null,
  phrase         text         not null,   -- what the player says
  romanization   text,                    -- pinyin / Tamil romanization (empty for Malay)
  meaning        text         not null,   -- English meaning
  context        text,                    -- where you'd say it, e.g. 'At the void deck'
  created_at     timestamptz  not null default now(),
  constraint unique_pronunciation_phrase unique (zone, level, language, phrase)
);

-- Questions are the same for everyone: anyone can read them, nobody can change them from the app.
alter table public.pronunciation_questions enable row level security;
drop policy if exists "Anyone can read pronunciation questions" on public.pronunciation_questions;
create policy "Anyone can read pronunciation questions" on public.pronunciation_questions
  for select to anon, authenticated using (true);

DELETE FROM public.pronunciation_questions WHERE level = 1;

INSERT INTO public.pronunciation_questions
    (zone, level, topic, language, phrase, romanization, meaning, context)
VALUES
-- ===== Chinese, zone 1 (neighbourhood) =====
(1, 1, 'neighbourhood', 'zh', '楼下的咖啡店今天好像没开。',
  'lóu xià de kā fēi diàn jīn tiān hǎo xiàng méi kāi.', 'The coffee shop downstairs doesn''t seem to be open today.', 'At the void deck'),
(1, 1, 'neighbourhood', 'zh', '不好意思，请问附近有没有药房？',
  'bù hǎo yì si, qǐng wèn fù jìn yǒu méi yǒu yào fáng?', 'Excuse me, is there a pharmacy nearby?', 'Asking a neighbour'),
(1, 1, 'neighbourhood', 'zh', '阿嬷，你吃饱了没有？要不要我帮你打包？',
  'ā mā, nǐ chī bǎo le méi yǒu? yào bú yào wǒ bāng nǐ dǎ bāo?', 'Ah Ma, are you full? Want me to pack some for you?', 'At the kopitiam with Ah Ma'),
(1, 1, 'neighbourhood', 'zh', '我最近在追一部台剧，剧情超级好看！',
  'wǒ zuì jìn zài zhuī yí bù tái jù, jù qíng chāo jí hǎo kàn!', 'I''ve been binge-watching a Taiwanese drama lately, the plot is so good!', 'Chatting with a friend'),
(1, 1, 'neighbourhood', 'zh', '邻居说这栋组屋下个月要重新油漆。',
  'lín jū shuō zhè dòng zǔ wū xià gè yuè yào chóng xīn yóu qī.', 'The neighbour says this HDB block is getting repainted next month.', 'At the lift lobby'),
(1, 1, 'neighbourhood', 'zh', '我下个星期开始实习，有点紧张，但是也很期待。',
  'wǒ xià gè xīng qī kāi shǐ shí xí, yǒu diǎn jǐn zhāng, dàn shì yě hěn qī dài.', 'I start my internship next week. I''m a bit nervous, but also excited.', 'Telling Ah Ma your news'),
(1, 1, 'neighbourhood', 'zh', '你今天几点下班？我们一起去吃晚餐吧。',
  'nǐ jīn tiān jǐ diǎn xià bān? wǒ men yì qǐ qù chī wǎn cān ba.', 'What time do you finish work today? Let''s go for dinner together.', 'Texting a friend'),
(1, 1, 'neighbourhood', 'zh', '阿公，你的手机又没有声音了，我帮你看看。',
  'ā gōng, nǐ de shǒu jī yòu méi yǒu shēng yīn le, wǒ bāng nǐ kàn kan.', 'Ah Gong, your phone has no sound again. Let me take a look.', 'At Ah Gong''s flat'),
(1, 1, 'neighbourhood', 'zh', '楼上的邻居又在装修，吵到我没办法专心读书。',
  'lóu shàng de lín jū yòu zài zhuāng xiū, chǎo dào wǒ méi bàn fǎ zhuān xīn dú shū.', 'The upstairs neighbour is renovating again. It''s so noisy I can''t focus on studying.', 'Complaining to family'),
(1, 1, 'neighbourhood', 'zh', '这个周末社区中心有活动，你要不要一起去看看？',
  'zhè ge zhōu mò shè qū zhōng xīn yǒu huó dòng, nǐ yào bú yào yì qǐ qù kàn kan?', 'There''s an event at the community centre this weekend. Want to go check it out?', 'Chatting with a neighbour'),

-- ===== Chinese, zone 2 (hawker centre) =====
(2, 1, 'hawker centre', 'zh', '老板，一份鸡饭，饭少一点，辣椒多一点。',
  'lǎo bǎn, yí fèn jī fàn, fàn shǎo yì diǎn, là jiāo duō yì diǎn.', 'Boss, one chicken rice. Less rice, more chilli.', 'At the chicken rice stall'),
(2, 1, 'hawker centre', 'zh', '我要一杯咖啡，少糖，带走。',
  'wǒ yào yì bēi kā fēi, shǎo táng, dài zǒu.', 'One coffee, less sugar, takeaway.', 'At the drinks stall'),
(2, 1, 'hawker centre', 'zh', '这个位子有人坐吗？我们可以坐这里吗？',
  'zhè ge wèi zi yǒu rén zuò ma? wǒ men kě yǐ zuò zhè lǐ ma?', 'Is this seat taken? Can we sit here?', 'Looking for a table'),
(2, 1, 'hawker centre', 'zh', '阿姨，不好意思，我刚才点的是叉烧面，不是云吞面。',
  'ā yí, bù hǎo yì si, wǒ gāng cái diǎn de shì chā shāo miàn, bú shì yún tūn miàn.', 'Auntie, sorry, I ordered char siew noodles, not wanton noodles.', 'The wrong order arrived'),
(2, 1, 'hawker centre', 'zh', '这家鱼片汤要排队半个小时，真的值得吗？',
  'zhè jiā yú piàn tāng yào pái duì bàn gè xiǎo shí, zhēn de zhí dé ma?', 'This fish soup stall has a half-hour queue. Is it really worth it?', 'Joining a long queue'),
(2, 1, 'hawker centre', 'zh', '我们一起分这几道菜吧，等一下我用手机转账给你。',
  'wǒ men yì qǐ fēn zhè jǐ dào cài ba, děng yí xià wǒ yòng shǒu jī zhuǎn zhàng gěi nǐ.', 'Let''s share these dishes. I''ll transfer you the money on my phone later.', 'Splitting the bill with friends'),
(2, 1, 'hawker centre', 'zh', '老板，这碗面不要葱，汤可以多一点吗？',
  'lǎo bǎn, zhè wǎn miàn bú yào cōng, tāng kě yǐ duō yì diǎn ma?', 'Boss, no spring onions in this noodles. Can I have more soup?', 'At the noodle stall'),
(2, 1, 'hawker centre', 'zh', '你们这里可以用手机付款吗？我没有带现金。',
  'nǐ men zhè lǐ kě yǐ yòng shǒu jī fù kuǎn ma? wǒ méi yǒu dài xiàn jīn.', 'Can I pay by phone here? I didn''t bring cash.', 'Paying at the stall'),
(2, 1, 'hawker centre', 'zh', '这个太辣了，我吃不了，可以帮我换一个吗？',
  'zhè ge tài là le, wǒ chī bù liǎo, kě yǐ bāng wǒ huàn yí gè ma?', 'This is too spicy, I can''t eat it. Could you change it for me?', 'Asking for a change'),
(2, 1, 'hawker centre', 'zh', '我先去占位子，你们帮我买一碗粥，好不好？',
  'wǒ xiān qù zhàn wèi zi, nǐ men bāng wǒ mǎi yì wǎn zhōu, hǎo bù hǎo?', 'I''ll go chope a table first. Can you buy me a bowl of porridge?', 'Lunch with friends'),

-- ===== Chinese, zone 3 (public transport) =====
(3, 1, 'public transport', 'zh', '请问这辆巴士有经过碧山地铁站吗？',
  'qǐng wèn zhè liàng bā shì yǒu jīng guò bì shān dì tiě zhàn ma?', 'Excuse me, does this bus pass Bishan MRT station?', 'At the bus stop'),
(3, 1, 'public transport', 'zh', '不好意思，可以让一让吗？我下一站要下车。',
  'bù hǎo yì si, kě yǐ ràng yí ràng ma? wǒ xià yí zhàn yào xià chē.', 'Excuse me, could you let me through? I''m getting off at the next stop.', 'On a packed bus'),
(3, 1, 'public transport', 'zh', '阿伯，你坐这里吧，我站就可以了。',
  'ā bó, nǐ zuò zhè lǐ ba, wǒ zhàn jiù kě yǐ le.', 'Uncle, take this seat. I''m fine standing.', 'Offering your seat'),
(3, 1, 'public transport', 'zh', '地铁又故障了，我可能会晚一点到，你们先开始吧。',
  'dì tiě yòu gù zhàng le, wǒ kě néng huì wǎn yì diǎn dào, nǐ men xiān kāi shǐ ba.', 'The MRT broke down again. I might be a bit late, go ahead and start first.', 'Voice note to your group'),
(3, 1, 'public transport', 'zh', '司机，麻烦你在前面的路口停一下，谢谢。',
  'sī jī, má fan nǐ zài qián miàn de lù kǒu tíng yí xià, xiè xie.', 'Driver, please stop at the junction ahead. Thanks.', 'In a taxi'),
(3, 1, 'public transport', 'zh', '你在下一站转乘另一条线，会比较快到学校。',
  'nǐ zài xià yí zhàn zhuǎn chéng lìng yì tiáo xiàn, huì bǐ jiào kuài dào xué xiào.', 'Change to the other line at the next station. You''ll get to school faster.', 'Giving a friend directions'),
(3, 1, 'public transport', 'zh', '这班车好挤，我们等下一班吧。',
  'zhè bān chē hǎo jǐ, wǒ men děng xià yì bān ba.', 'This train is so packed. Let''s wait for the next one.', 'On the MRT platform'),
(3, 1, 'public transport', 'zh', '不好意思，我的交通卡好像没钱了，要去哪里充值？',
  'bù hǎo yì si, wǒ de jiāo tōng kǎ hǎo xiàng méi qián le, yào qù nǎ lǐ chōng zhí?', 'Excuse me, my transport card seems to be empty. Where can I top up?', 'At the MRT gantry'),
(3, 1, 'public transport', 'zh', '你下车以后过马路，巴士站就在对面。',
  'nǐ xià chē yǐ hòu guò mǎ lù, bā shì zhàn jiù zài duì miàn.', 'After you get off, cross the road. The bus stop is right opposite.', 'Giving directions'),
(3, 1, 'public transport', 'zh', '我差点坐过站了，幸好有人提醒我。',
  'wǒ chà diǎn zuò guò zhàn le, xìng hǎo yǒu rén tí xǐng wǒ.', 'I almost missed my stop. Luckily someone reminded me.', 'Telling a friend'),

-- ===== Malay, zone 1 (neighbourhood) =====
(1, 1, 'neighbourhood', 'ms', 'Kedai kopi di bawah blok tu macam tak buka hari ini.',
  NULL, 'The coffee shop under the block doesn''t seem to be open today.', 'At the void deck'),
(1, 1, 'neighbourhood', 'ms', 'Maaf, encik, ada farmasi dekat sini tak?',
  NULL, 'Sorry, sir, is there a pharmacy near here?', 'Asking a neighbour'),
(1, 1, 'neighbourhood', 'ms', 'Nenek, dah kenyang ke? Nak saya tolong bungkuskan?',
  NULL, 'Grandma, are you full? Want me to pack some for you?', 'At the kopitiam with Nenek'),
(1, 1, 'neighbourhood', 'ms', 'Saya tengah tonton drama Melayu baru, jalan ceritanya memang menarik!',
  NULL, 'I''m watching a new Malay drama, the storyline is really good!', 'Chatting with a friend'),
(1, 1, 'neighbourhood', 'ms', 'Jiran kata blok ni akan dicat semula bulan depan.',
  NULL, 'The neighbour says this block is getting repainted next month.', 'At the lift lobby'),
(1, 1, 'neighbourhood', 'ms', 'Minggu depan saya mula latihan industri, rasa gementar tapi teruja juga.',
  NULL, 'I start my internship next week. I''m nervous but also excited.', 'Telling Nenek your news'),
(1, 1, 'neighbourhood', 'ms', 'Hari ni awak habis kerja pukul berapa? Jom makan malam sama-sama.',
  NULL, 'What time do you finish work today? Let''s have dinner together.', 'Texting a friend'),
(1, 1, 'neighbourhood', 'ms', 'Atuk, telefon atuk tak ada bunyi lagi, biar saya tengok.',
  NULL, 'Grandpa, your phone has no sound again. Let me take a look.', 'At Atuk''s flat'),
(1, 1, 'neighbourhood', 'ms', 'Jiran tingkat atas tengah ubah suai rumah, bising sangat sampai saya tak boleh fokus belajar.',
  NULL, 'The upstairs neighbour is renovating. It''s so noisy I can''t focus on studying.', 'Complaining to family'),
(1, 1, 'neighbourhood', 'ms', 'Hujung minggu ni ada acara di pusat komuniti, awak nak pergi tengok sama-sama?',
  NULL, 'There''s an event at the community centre this weekend. Want to go check it out?', 'Chatting with a neighbour'),

-- ===== Malay, zone 2 (hawker centre) =====
(2, 1, 'hawker centre', 'ms', 'Bang, satu nasi ayam, nasi sikit, sambal lebih.',
  NULL, 'Bro, one chicken rice. Less rice, extra chilli.', 'At the chicken rice stall'),
(2, 1, 'hawker centre', 'ms', 'Saya nak satu kopi, kurang manis, bungkus.',
  NULL, 'One coffee, less sweet, takeaway.', 'At the drinks stall'),
(2, 1, 'hawker centre', 'ms', 'Tempat ni ada orang duduk ke? Boleh kami duduk sini?',
  NULL, 'Is this seat taken? Can we sit here?', 'Looking for a table'),
(2, 1, 'hawker centre', 'ms', 'Maaf, makcik, tadi saya pesan mi goreng, bukan mi rebus.',
  NULL, 'Sorry, auntie, I ordered mee goreng, not mee rebus.', 'The wrong order arrived'),
(2, 1, 'hawker centre', 'ms', 'Gerai sup ikan ni kena beratur setengah jam, berbaloi ke?',
  NULL, 'This fish soup stall has a half-hour queue. Is it worth it?', 'Joining a long queue'),
(2, 1, 'hawker centre', 'ms', 'Jom kita kongsi lauk ni, nanti saya bayar balik kat awak.',
  NULL, 'Let''s share these dishes. I''ll pay you back later.', 'Splitting the bill with friends'),
(2, 1, 'hawker centre', 'ms', 'Bang, mi ni tak nak daun bawang, kuah lebih sikit boleh?',
  NULL, 'Bro, no spring onions in these noodles. Can I have a bit more soup?', 'At the noodle stall'),
(2, 1, 'hawker centre', 'ms', 'Kat sini boleh bayar guna telefon tak? Saya tak bawa duit tunai.',
  NULL, 'Can I pay by phone here? I didn''t bring cash.', 'Paying at the stall'),
(2, 1, 'hawker centre', 'ms', 'Ni pedas sangat, saya tak boleh makan, boleh tolong tukar?',
  NULL, 'This is too spicy, I can''t eat it. Could you change it?', 'Asking for a change'),
(2, 1, 'hawker centre', 'ms', 'Saya pergi cop tempat duduk dulu, korang tolong belikan saya satu bubur, boleh?',
  NULL, 'I''ll go chope a seat first. Can you buy me a porridge?', 'Lunch with friends'),

-- ===== Malay, zone 3 (public transport) =====
(3, 1, 'public transport', 'ms', 'Maaf, bas ni lalu stesen MRT Bishan tak?',
  NULL, 'Excuse me, does this bus pass Bishan MRT station?', 'At the bus stop'),
(3, 1, 'public transport', 'ms', 'Tumpang lalu, saya nak turun di perhentian seterusnya.',
  NULL, 'Excuse me, I''m getting off at the next stop.', 'On a packed bus'),
(3, 1, 'public transport', 'ms', 'Pakcik, duduklah sini, saya boleh berdiri.',
  NULL, 'Uncle, have a seat here. I can stand.', 'Offering your seat'),
(3, 1, 'public transport', 'ms', 'MRT rosak lagi, saya mungkin lambat sikit, korang mula dulu.',
  NULL, 'The MRT broke down again. I might be a bit late, you all start first.', 'Voice note to your group'),
(3, 1, 'public transport', 'ms', 'Encik, tolong berhenti di simpang depan tu, terima kasih.',
  NULL, 'Sir, please stop at the junction ahead. Thank you.', 'In a taxi'),
(3, 1, 'public transport', 'ms', 'Kalau awak tukar tren di stesen seterusnya, lagi cepat sampai sekolah.',
  NULL, 'If you change trains at the next station, you''ll get to school faster.', 'Giving a friend directions'),
(3, 1, 'public transport', 'ms', 'Tren ni sesak sangat, jom kita tunggu tren seterusnya.',
  NULL, 'This train is so packed. Let''s wait for the next one.', 'On the MRT platform'),
(3, 1, 'public transport', 'ms', 'Maaf, kad saya macam dah habis baki, nak tambah nilai kat mana?',
  NULL, 'Sorry, my card seems to be out of credit. Where can I top up?', 'At the MRT gantry'),
(3, 1, 'public transport', 'ms', 'Lepas turun, awak lintas jalan, perhentian bas ada betul-betul di seberang.',
  NULL, 'After you get off, cross the road. The bus stop is right opposite.', 'Giving directions'),
(3, 1, 'public transport', 'ms', 'Saya hampir terlepas perhentian tadi, nasib baik ada orang ingatkan.',
  NULL, 'I almost missed my stop just now. Luckily someone reminded me.', 'Telling a friend'),

-- ===== Tamil, zone 1 (neighbourhood) =====
(1, 1, 'neighbourhood', 'ta', 'கீழே இருக்கிற காப்பிக் கடை இன்னைக்கு திறக்கல போல.',
  'keezhe irukkira kaappik kadai innaikku thirakkala pola.', 'The coffee shop downstairs doesn''t seem to be open today.', 'At the void deck'),
(1, 1, 'neighbourhood', 'ta', 'மன்னிக்கணும், பக்கத்துல ஏதாவது மருந்துக் கடை இருக்கா?',
  'mannikkanum, pakkaththula edhaavadhu marundhuk kadai irukkaa?', 'Excuse me, is there a pharmacy nearby?', 'Asking a neighbour'),
(1, 1, 'neighbourhood', 'ta', 'பாட்டி, சாப்பிட்டு முடிச்சீங்களா? நான் கட்டித் தரட்டுமா?',
  'paatti, saappittu mudichcheengalaa? naan kattith tharattumaa?', 'Paati, are you done eating? Shall I pack some for you?', 'At the kopitiam with Paati'),
(1, 1, 'neighbourhood', 'ta', 'நான் இப்போ ஒரு புது தமிழ் தொடர் பாக்குறேன், கதை செம்மையா இருக்கு!',
  'naan ippo oru pudhu Tamizh thodar paakkuren, kadhai semmaiyaa irukku!', 'I''m watching a new Tamil series, the story is awesome!', 'Chatting with a friend'),
(1, 1, 'neighbourhood', 'ta', 'அடுத்த மாசம் இந்த பிளாக்குக்கு புதுசா வர்ணம் பூசப் போறாங்களாம்.',
  'aduththa maasam indha blaakkukku pudhusaa varnam poosap poraangalaam.', 'Apparently they''re repainting this block next month.', 'At the lift lobby'),
(1, 1, 'neighbourhood', 'ta', 'அடுத்த வாரம் என் வேலைப் பயிற்சி ஆரம்பிக்குது, கொஞ்சம் பதட்டமா இருக்கு, ஆனா ஆர்வமாவும் இருக்கு.',
  'aduththa vaaram en velaip payirchi aarambikkudhu, konjam padhattamaa irukku, aanaa aarvamaavum irukku.', 'My internship starts next week. I''m a bit nervous, but excited too.', 'Telling Paati your news'),
(1, 1, 'neighbourhood', 'ta', 'இன்னைக்கு எத்தனை மணிக்கு வேலை முடியும்? சேர்ந்து ராத்திரி சாப்பிட போகலாம்.',
  'innaikku eththanai manikku velai mudiyum? serndhu raaththiri saappida pogalaam.', 'What time do you finish work today? Let''s go for dinner together.', 'Texting a friend'),
(1, 1, 'neighbourhood', 'ta', 'தாத்தா, உங்க போன்ல மறுபடியும் சத்தம் வரல, நான் பாக்குறேன்.',
  'thaaththaa, unga phonela marupadiyum saththam varala, naan paakkuren.', 'Thatha, your phone has no sound again. Let me take a look.', 'At Thatha''s flat'),
(1, 1, 'neighbourhood', 'ta', 'மேல் வீட்டுக்காரங்க மறுபடியும் வீட்டை புதுப்பிக்கிறாங்க, சத்தத்துல படிக்கவே முடியல.',
  'mel veettukkaaranga marupadiyum veettai pudhuppikkiraanga, saththaththula padikkave mudiyala.', 'The upstairs neighbours are renovating again. With the noise I can''t study at all.', 'Complaining to family'),
(1, 1, 'neighbourhood', 'ta', 'இந்த வார இறுதியில சமூக மன்றத்துல ஒரு நிகழ்ச்சி இருக்கு, நீயும் வர்றியா?',
  'indha vaara irudhiyila samooga mandraththula oru nigazhchchi irukku, neeyum varriyaa?', 'There''s an event at the community centre this weekend. Are you coming too?', 'Chatting with a neighbour'),

-- ===== Tamil, zone 2 (hawker centre) =====
(2, 1, 'hawker centre', 'ta', 'அண்ணா, ஒரு கோழி சோறு, சோறு கொஞ்சமா, காரம் கொஞ்சம் அதிகமா.',
  'annaa, oru kozhi soru, soru konjamaa, kaaram konjam adhigamaa.', 'Anna, one chicken rice. Less rice, a bit more spicy.', 'At the chicken rice stall'),
(2, 1, 'hawker centre', 'ta', 'ஒரு காப்பி, சர்க்கரை கம்மியா, பார்சல்.',
  'oru kaappi, sarkkarai kammiyaa, paarsal.', 'One coffee, less sugar, takeaway.', 'At the drinks stall'),
(2, 1, 'hawker centre', 'ta', 'இந்த இடத்துல யாராவது உட்கார்ந்திருக்காங்களா? நாங்க இங்க உட்காரலாமா?',
  'indha idaththula yaaraavadhu utkaarndhirukkaangalaa? naanga inga utkaaralaamaa?', 'Is anyone sitting here? Can we sit here?', 'Looking for a table'),
(2, 1, 'hawker centre', 'ta', 'மன்னிக்கணும், நான் கேட்டது தோசை, இட்லி இல்லை.',
  'mannikkanum, naan kettadhu dhosai, idli illai.', 'Sorry, I ordered dosa, not idli.', 'The wrong order arrived'),
(2, 1, 'hawker centre', 'ta', 'இந்த கடையில அரை மணி நேரம் வரிசையில நிக்கணும், அது உண்மையிலேயே மதிப்பா?',
  'indha kadaiyila arai mani neram varisaiyila nikkanum, adhu unmaiyileye madhippaa?', 'There is a half-hour queue at this stall. Is it really worth it?', 'Joining a long queue'),
(2, 1, 'hawker centre', 'ta', 'இந்த சாப்பாட்டை எல்லாரும் பகிர்ந்துக்கலாம், நான் அப்புறம் உனக்கு காசு தரேன்.',
  'indha saappaattai ellaarum pagirndhukkalaam, naan appuram unakku kaasu tharen.', 'Let''s all share this food. I''ll give you the money later.', 'Splitting the bill with friends'),
(2, 1, 'hawker centre', 'ta', 'அண்ணா, சாப்பாட்டுல வெங்காயம் வேண்டாம், குழம்பு கொஞ்சம் அதிகமா ஊத்துங்க.',
  'annaa, saappaattula vengaayam vendaam, kuzhambu konjam adhigamaa ooththunga.', 'Anna, no onions in the meal, and a bit more curry please.', 'At the rice stall'),
(2, 1, 'hawker centre', 'ta', 'இங்க போன்ல பணம் கட்டலாமா? நான் கையில காசு கொண்டு வரல.',
  'inga phonela panam kattalaamaa? naan kaiyila kaasu kondu varala.', 'Can I pay by phone here? I didn''t bring cash.', 'Paying at the stall'),
(2, 1, 'hawker centre', 'ta', 'இது ரொம்ப காரமா இருக்கு, என்னால சாப்பிட முடியல, மாத்தித் தர முடியுமா?',
  'idhu romba kaaramaa irukku, ennaala saappida mudiyala, maaththith thara mudiyumaa?', 'This is too spicy, I can''t eat it. Could you change it?', 'Asking for a change'),
(2, 1, 'hawker centre', 'ta', 'நான் முதல்ல இடம் பிடிக்கிறேன், நீங்க எனக்கு ஒரு கஞ்சி வாங்கிட்டு வாங்க, சரியா?',
  'naan mudhalla idam pidikkiren, neenga enakku oru kanji vaangittu vaanga, sariyaa?', 'I''ll grab a table first. Can you get me a porridge?', 'Lunch with friends'),

-- ===== Tamil, zone 3 (public transport) =====
(3, 1, 'public transport', 'ta', 'மன்னிக்கணும், இந்த பஸ் ரயில் நிலையத்துக்கு போகுமா?',
  'mannikkanum, indha bus rayil nilaiyaththukku pogumaa?', 'Excuse me, does this bus go to the train station?', 'At the bus stop'),
(3, 1, 'public transport', 'ta', 'கொஞ்சம் வழி விடுங்க, நான் அடுத்த நிறுத்தத்துல இறங்கணும்.',
  'konjam vazhi vidunga, naan aduththa niruththaththula iranganum.', 'Please let me through, I need to get off at the next stop.', 'On a packed bus'),
(3, 1, 'public transport', 'ta', 'தாத்தா, நீங்க இங்க உட்காருங்க, நான் நிக்கிறேன்.',
  'thaaththaa, neenga inga utkaarunga, naan nikkiren.', 'Thatha, you sit here. I''ll stand.', 'Offering your seat'),
(3, 1, 'public transport', 'ta', 'ரயில் மறுபடியும் பழுதாயிடுச்சு, நான் கொஞ்சம் தாமதமா வருவேன்.',
  'rayil marupadiyum pazhudhaayiduchchu, naan konjam thaamadhamaa varuven.', 'The train broke down again. I''ll be a bit late.', 'Voice note to your group'),
(3, 1, 'public transport', 'ta', 'அண்ணா, முன்னாடி இருக்கிற சந்திப்புல கொஞ்சம் நிறுத்துங்க, நன்றி.',
  'annaa, munnaadi irukkira sandhippula konjam niruththunga, nandri.', 'Anna, please stop at the junction ahead. Thanks.', 'In a taxi'),
(3, 1, 'public transport', 'ta', 'அடுத்த நிலையத்துல வேற ரயிலுக்கு மாறினா, சீக்கிரம் பள்ளிக்கு போயிடலாம்.',
  'aduththa nilaiyaththula vera rayilukku maarinaa, seekkiram pallikku poyidalaam.', 'If you change trains at the next station, you''ll get to school quickly.', 'Giving a friend directions'),
(3, 1, 'public transport', 'ta', 'இந்த ரயில்ல ரொம்ப கூட்டமா இருக்கு, அடுத்த ரயிலுக்கு காத்திருக்கலாம்.',
  'indha rayilla romba koottamaa irukku, aduththa rayilukku kaaththirukkalaam.', 'This train is very crowded. Let''s wait for the next one.', 'On the MRT platform'),
(3, 1, 'public transport', 'ta', 'மன்னிக்கணும், என் பயண அட்டையில பணம் முடிஞ்சிடுச்சு போல, எங்க பணம் போடலாம்?',
  'mannikkanum, en payana attaiyila panam mudinjiduchchu pola, enga panam podalaam?', 'Excuse me, my travel card seems to be empty. Where can I top up?', 'At the MRT gantry'),
(3, 1, 'public transport', 'ta', 'இறங்கினதும் ரோட்டை கடந்து போங்க, பஸ் நிறுத்தம் எதிர்லயே இருக்கு.',
  'iranginadhum roattai kadandhu ponga, bus niruththam edhirlaye irukku.', 'Once you get off, cross the road. The bus stop is right opposite.', 'Giving directions'),
(3, 1, 'public transport', 'ta', 'நான் கிட்டத்தட்ட என் நிறுத்தத்தை தவறவிட்டேன், நல்லவேளை ஒருத்தர் ஞாபகப்படுத்தினாங்க.',
  'naan kittaththatta en niruththaththai thavaravitten, nallavelai oruththar nyaabagappaduththinaanga.', 'I almost missed my stop. Luckily someone reminded me.', 'Telling a friend');
  