// Fallback sentences for the Typing mini-game (typing.js). The real bank is the typing_questions table
// (database/typing_questions.sql); the page uses this list only if that table cannot be reached, so keep
// the two in step when you change a sentence.
//
// Keyed by language, then by zone id (neighbourhood, hawker-centre, public-transport: the same album ids
// as ZONE_WORDS). There are no levels: each run picks random sentences from the zone's list.
//
// Each sentence:
//   english  what it means (always shown, the bridge language)
//   target   the sentence in the mother tongue (what the player types); punctuation is shown but never typed
//   roman    the romanisation, one syllable per typed character (tone marks and spaces are fine)
//   words    the zone words used in it (island_zone_words). A question answered with no "Show me" can win those cards.
// Keep roman to one syllable per target character: the game lines them up to give feedback when
// someone types romanisation instead of the native script.

const TYPING_SENTENCES = {
  zh: {
    "neighbourhood": [
      { english: "My arms are so sore after bouldering today.", roman: "jīn tiān pān yán hòu wǒ de shǒu bì chāo jí suān tòng.", target: "今天攀岩后我的手臂超级酸痛。", words: ["今天", "攀岩", "手臂", "酸痛"] },
      { english: "The kids are playing at the playground.", roman: "xiǎo hái zài yóu lè chǎng wán.", target: "小孩在游乐场玩。", words: ["游乐场", "小孩", "玩"] },
      { english: "Auntie, good evening! Have you eaten?", roman: "ā yí, wǎn shang hǎo! nǐ chī fàn le ma?", target: "阿姨，晚上好！你吃饭了吗？", words: ["晚上", "阿姨", "吃饭"] },
      { english: "My grandma likes to sit here and chat.", roman: "wǒ nǎi nai xǐ huan zuò zài zhè lǐ liáo tiān.", target: "我奶奶喜欢坐在这里聊天。", words: ["奶奶", "喜欢", "聊天"] },
      { english: "The slide is very hot at noon.", roman: "zhōng wǔ de huá tī hěn tàng.", target: "中午的滑梯很烫。", words: ["中午", "滑梯", "烫"] },
      { english: "Let's go for a walk in the park after dinner.", roman: "chī wán fàn wǒ men qù gōng yuán sàn bù ba.", target: "吃完饭我们去公园散步吧。", words: ["公园", "散步"] },
      { english: "Uncle is playing chess downstairs.", roman: "shū shu zài lóu xià xià qí.", target: "叔叔在楼下下棋。", words: ["楼下", "叔叔", "下棋"] },
      { english: "Remember to say hello to the neighbours.", roman: "jì de gēn lín jū dǎ zhāo hu.", target: "记得跟邻居打招呼。", words: ["邻居", "记得", "打招呼"] },
      { english: "The lift is broken again, so we have to take the stairs.", roman: "diàn tī yòu huài le, wǒ men zhǐ hǎo zǒu lóu tī.", target: "电梯又坏了，我们只好走楼梯。", words: ["电梯", "坏了", "楼梯", "走"] },
    ],
    "hawker-centre": [
      { english: "Boss, I want one packet of chicken rice, take away.", roman: "lǎo bǎn, wǒ yào yī bāo jī fàn, dǎ bāo.", target: "老板，我要一包鸡饭，打包。", words: ["鸡饭", "打包", "老板", "一包"] },
      { english: "One coffee, less sugar please.", roman: "qǐng gěi wǒ yī bēi kā fēi, shǎo táng.", target: "请给我一杯咖啡，少糖。", words: ["咖啡", "糖", "一杯", "少糖"] },
      { english: "Is this seat taken?", roman: "zhè ge zuò wèi yǒu rén zuò ma?", target: "这个座位有人坐吗？", words: ["有人"] },
      { english: "The queue is so long today.", roman: "jīn tiān pái duì de rén hǎo duō.", target: "今天排队的人好多。", words: ["排队", "好多"] },
      { english: "Please add a bit more chilli.", roman: "qǐng duō jiā yī diǎn là jiāo.", target: "请多加一点辣椒。", words: ["辣", "辣椒", "加", "一点"] },
      { english: "How much is it altogether?", roman: "yī gòng duō shao qián?", target: "一共多少钱？", words: ["多少钱", "一共"] },
      { english: "It's so crowded, let's find a seat first.", roman: "hǎo yōng jǐ, wǒ men xiān zhǎo wèi zi ba.", target: "好拥挤，我们先找位子吧。", words: ["位子", "拥挤", "找"] },
      { english: "Can I pay with my phone?", roman: "wǒ yòng shǒu jī fù qián kě yǐ ma?", target: "我用手机付钱可以吗？", words: ["付钱", "手机", "可以"] },
      { english: "The chicken rice here is really tasty.", roman: "zhè jiā de jī fàn zhēn hǎo chī.", target: "这家的鸡饭真好吃。", words: ["鸡饭", "好吃"] },
    ],
    "public-transport": [
      { english: "Driver, please go to Orchard Road.", roman: "shī fu, qǐng dào wū jié lù.", target: "师傅，请到乌节路。", words: ["乌节路", "师傅"] },
      { english: "How much is the fare?", roman: "chē fèi shì duō shao?", target: "车费是多少？", words: ["车费"] },
      { english: "The taxi queue is very long.", roman: "dé shì zhàn de duì hěn cháng.", target: "德士站的队很长。", words: ["德士", "德士站"] },
      { english: "I need to transfer at the next station.", roman: "wǒ yào zài xià yī zhàn zhuǎn chéng.", target: "我要在下一站转乘。", words: ["下一站", "转乘"] },
      { english: "Please tap your card when you board the bus.", roman: "shàng bā shì de shí hou qǐng shuā kǎ.", target: "上巴士的时候请刷卡。", words: ["巴士", "刷卡"] },
      { english: "The MRT is delayed again.", roman: "dì tiě yòu yán wù le.", target: "地铁又延误了。", words: ["地铁", "延误"] },
      { english: "Excuse me, which bus goes to Tampines?", roman: "qǐng wèn nǎ yī lù bā shì qù dàn bīn ní?", target: "请问哪一路巴士去淡滨尼？", words: ["巴士", "淡滨尼"] },
      { english: "Please stop here, thank you.", roman: "qǐng zài zhè lǐ tíng chē, xiè xie.", target: "请在这里停车，谢谢。", words: ["停车", "谢谢"] },
      { english: "Please give up your seat to the elderly.", roman: "qǐng gěi lǎo rén ràng zuò.", target: "请给老人让座。", words: ["让座"] },
    ],
  },
};

// The bonus question: a sentence built from words the player captured, joined by these filler words, so it
// always makes sense. Per language and zone number (1-3); one frame is picked at random.
//   parts  { t: the filler words, r: their romanisation } or "A" / "B" for the two captured words
//   en     the meaning. {a}/{b} = the word with "a"/"an" in front, {A}/{B} = the word as it is.
// Only zones where a captured word can be a plain noun that fits (places in zone 1, food and drink in zone 2,
// vehicles in zone 3: see BONUS_NOUNS in save.js) have frames.
const TYPING_BONUS_FRAMES = {
  zh: {
    1: [
      { parts: [{ t: "我家附近有", r: "wǒ jiā fù jìn yǒu" }, "A", { t: "和", r: "hé" }, "B", { t: "。", r: "." }], en: "Near my home there is {a} and {b}." },
      { parts: [{ t: "我常常去", r: "wǒ cháng cháng qù" }, "A", { t: "和", r: "hé" }, "B", { t: "。", r: "." }], en: "I often go to the {A} and the {B}." },
    ],
    2: [
      { parts: [{ t: "我要", r: "wǒ yào" }, "A", { t: "和", r: "hé" }, "B", { t: "。", r: "." }], en: "I want {A} and {B}." },
      { parts: [{ t: "请给我", r: "qǐng gěi wǒ" }, "A", { t: "和", r: "hé" }, "B", { t: "。", r: "." }], en: "Please give me {A} and {B}." },
    ],
    3: [
      { parts: ["A", { t: "和", r: "hé" }, "B", { t: "都可以坐。", r: "dōu kě yǐ zuò." }], en: "I can take both the {A} and the {B}." },
      { parts: [{ t: "我可以坐", r: "wǒ kě yǐ zuò" }, "A", { t: "，也可以坐", r: ", yě kě yǐ zuò" }, "B", { t: "。", r: "." }], en: "I can take the {A}, or I can take the {B}." },
    ],
  },
};