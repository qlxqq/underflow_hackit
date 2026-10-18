// Sentences for the Typing mini-game (typing.js). Plain data: add, remove or
// reword sentences here without touching the game code.
//
// Keyed by language, then by zone id. Zone ids are the ones in js/journey/levels.js
// (neighbourhood, hawker-centre, public-transport) - the same keys ZONE_WORDS uses -
// so the game maps a level to its zone (getZoneForLevel) and never hard-codes level
// numbers. One Typing level sits in each zone. Add "ms" and "ta" blocks the same way
// to support Malay and Tamil; the game reads whichever language is being played.
//
// Each sentence:
//   english  what it means (always shown, the bridge language)
//   target   the sentence in the mother tongue (what the player types); punctuation is shown but never typed
//   roman    the romanisation, one syllable per character for Chinese (tone marks and spaces are fine)
//
// Keep roman to one syllable per target character: the game lines them up to give
// feedback when someone types romanisation instead of the native script.

const TYPING_SENTENCES = {
  zh: {
    neighbourhood: [
      { english: "My arms are so sore after bouldering today.", roman: "jīn tiān pān yán hòu wǒ de shǒu bì chāo jí suān tòng.", target: "今天攀岩后我的手臂超级酸痛。" },
      { english: "The kids are playing at the playground.", roman: "xiǎo hái zài yóu lè chǎng wán.", target: "小孩在游乐场玩。" },
      { english: "Auntie, good evening! Have you eaten?", roman: "ā yí, wǎn shang hǎo! nǐ chī fàn le ma?", target: "阿姨，晚上好！你吃饭了吗？" },
      { english: "My grandma likes to sit here and chat.", roman: "wǒ nǎi nai xǐ huan zuò zài zhè lǐ liáo tiān.", target: "我奶奶喜欢坐在这里聊天。" },
      { english: "The slide is very hot at noon.", roman: "zhōng wǔ de huá tī hěn tàng.", target: "中午的滑梯很烫。" },
      { english: "Let's go for a walk in the park after dinner.", roman: "chī wán fàn wǒ men qù gōng yuán sàn bù ba.", target: "吃完饭我们去公园散步吧。" },
      { english: "Uncle is playing chess downstairs.", roman: "shū shu zài lóu xià xià qí.", target: "叔叔在楼下下棋。" },
      { english: "Remember to say hello to the neighbours.", roman: "jì de gēn lín jū dǎ zhāo hu.", target: "记得跟邻居打招呼。" },
      { english: "The lift is broken again, so we have to take the stairs.", roman: "diàn tī yòu huài le, wǒ men zhǐ hǎo zǒu lóu tī.", target: "电梯又坏了，我们只好走楼梯。" },
    ],
    "hawker-centre": [
      { english: "Boss, I want one packet of chicken rice, take away.", roman: "lǎo bǎn, wǒ yào yī bāo jī fàn, dǎ bāo.", target: "老板，我要一包鸡饭，打包。" },
      { english: "One coffee, less sugar please.", roman: "qǐng gěi wǒ yī bēi kā fēi, shǎo táng.", target: "请给我一杯咖啡，少糖。" },
      { english: "Is this seat taken?", roman: "zhè ge zuò wèi yǒu rén zuò ma?", target: "这个座位有人坐吗？" },
      { english: "The queue is so long today.", roman: "jīn tiān pái duì de rén hǎo duō.", target: "今天排队的人好多。" },
      { english: "Please add a bit more chilli.", roman: "qǐng duō jiā yī diǎn là jiāo.", target: "请多加一点辣椒。" },
      { english: "How much is it altogether?", roman: "yī gòng duō shao qián?", target: "一共多少钱？" },
      { english: "It's so crowded, let's find a seat first.", roman: "hǎo yōng jǐ, wǒ men xiān zhǎo wèi zi ba.", target: "好拥挤，我们先找位子吧。" },
      { english: "Can I pay with my phone?", roman: "wǒ yòng shǒu jī fù qián kě yǐ ma?", target: "我用手机付钱可以吗？" },
      { english: "The chicken rice here is really tasty.", roman: "zhè jiā de jī fàn zhēn hǎo chī.", target: "这家的鸡饭真好吃。" },
    ],
    "public-transport": [
      { english: "Driver, please go to Orchard Road.", roman: "shī fu, qǐng dào wū jié lù.", target: "师傅，请到乌节路。" },
      { english: "How much is the fare?", roman: "chē fèi shì duō shao?", target: "车费是多少？" },
      { english: "The taxi queue is very long.", roman: "dé shì zhàn de duì hěn cháng.", target: "德士站的队很长。" },
      { english: "I need to transfer at the next station.", roman: "wǒ yào zài xià yī zhàn zhuǎn chéng.", target: "我要在下一站转乘。" },
      { english: "Please tap your card when you board the bus.", roman: "shàng bā shì de shí hou qǐng shuā kǎ.", target: "上巴士的时候请刷卡。" },
      { english: "The MRT is delayed again.", roman: "dì tiě yòu yán wù le.", target: "地铁又延误了。" },
      { english: "Excuse me, which bus goes to Tampines?", roman: "qǐng wèn nǎ yī lù bā shì qù dàn bīn ní?", target: "请问哪一路巴士去淡滨尼？" },
      { english: "Please stop here, thank you.", roman: "qǐng zài zhè lǐ tíng chē, xiè xie.", target: "请在这里停车，谢谢。" },
      { english: "Please give up your seat to the elderly.", roman: "qǐng gěi lǎo rén ràng zuò.", target: "请给老人让座。" },
    ],
  },
};