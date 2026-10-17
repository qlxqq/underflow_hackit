// The NPC role cards: extra album cards that are won only from NPC challenges on
// the island (the zone cards are the mini-game words in zoneWords.js). Each
// NPC owns ten cards that fit their job. An island album is the zone's words
// plus these. Shared by the island and the Collection, so it lives here.
//
//   ROLE_CARDS[language][albumId] = [ { id, label, words: [ { word, romanization, meaning } ] } ]
//
// If a role word is ever also a zone word, the zone card wins and the role card
// is dropped (see roleCardsFor), so the zone list can change freely.
//
// PLACEHOLDER Chinese: please have a Chinese speaker check these words.
const ROLE_CARDS = {
  zh: {
    "neighbourhood": [
      { id: "teacher", label: "Teacher", words: [
        { word: "教室", romanization: "jiàoshì", meaning: "classroom" },
        { word: "作业", romanization: "zuòyè", meaning: "homework" },
        { word: "书包", romanization: "shūbāo", meaning: "school bag" },
        { word: "同学", romanization: "tóngxué", meaning: "classmate" },
        { word: "考试", romanization: "kǎoshì", meaning: "exam" },
        { word: "课本", romanization: "kèběn", meaning: "textbook" },
        { word: "铅笔", romanization: "qiānbǐ", meaning: "pencil" },
        { word: "黑板", romanization: "hēibǎn", meaning: "blackboard" },
        { word: "作文", romanization: "zuòwén", meaning: "composition" },
        { word: "下课", romanization: "xiàkè", meaning: "class ends" },
      ] },
      { id: "ccAuntie", label: "Club Volunteer", words: [
        { word: "志愿者", romanization: "zhìyuànzhě", meaning: "volunteer" },
        { word: "报名", romanization: "bàomíng", meaning: "sign up" },
        { word: "课程", romanization: "kèchéng", meaning: "course" },
        { word: "欢迎", romanization: "huānyíng", meaning: "welcome" },
        { word: "书法", romanization: "shūfǎ", meaning: "calligraphy" },
        { word: "免费", romanization: "miǎnfèi", meaning: "free of charge" },
        { word: "帮忙", romanization: "bāngmáng", meaning: "help out" },
        { word: "会员", romanization: "huìyuán", meaning: "member" },
        { word: "舞蹈", romanization: "wǔdǎo", meaning: "dance" },
        { word: "通知", romanization: "tōngzhī", meaning: "notice" },
      ] },
      { id: "officer", label: "Police Officer", words: [
        { word: "警察", romanization: "jǐngchá", meaning: "police" },
        { word: "安全", romanization: "ānquán", meaning: "safe / safety" },
        { word: "巡逻", romanization: "xúnluó", meaning: "patrol" },
        { word: "报警", romanization: "bàojǐng", meaning: "call the police" },
        { word: "迷路", romanization: "mílù", meaning: "get lost" },
        { word: "小偷", romanization: "xiǎotōu", meaning: "thief" },
        { word: "钱包", romanization: "qiánbāo", meaning: "wallet" },
        { word: "提醒", romanization: "tíxǐng", meaning: "remind" },
        { word: "号码", romanization: "hàomǎ", meaning: "number" },
        { word: "证件", romanization: "zhèngjiàn", meaning: "ID document" },
      ] },
    ],
    "hawker-centre": [
      { id: "stallUncle", label: "Chicken Rice Seller", words: [
        { word: "老板", romanization: "lǎobǎn", meaning: "boss / owner" },
        { word: "米饭", romanization: "mǐfàn", meaning: "rice" },
        { word: "酱油", romanization: "jiàngyóu", meaning: "soy sauce" },
        { word: "汤", romanization: "tāng", meaning: "soup" },
        { word: "盘子", romanization: "pánzi", meaning: "plate" },
        { word: "黄瓜", romanization: "huángguā", meaning: "cucumber" },
        { word: "勺子", romanization: "sháozi", meaning: "spoon" },
        { word: "厨师", romanization: "chúshī", meaning: "chef" },
        { word: "鸡腿", romanization: "jītuǐ", meaning: "chicken leg" },
        { word: "辣酱", romanization: "làjiàng", meaning: "chilli sauce" },
      ] },
      { id: "tehAuntie", label: "Drinks Seller", words: [
        { word: "奶茶", romanization: "nǎichá", meaning: "milk tea" },
        { word: "咖啡", romanization: "kāfēi", meaning: "coffee" },
        { word: "冰", romanization: "bīng", meaning: "ice" },
        { word: "杯子", romanization: "bēizi", meaning: "cup" },
        { word: "糖", romanization: "táng", meaning: "sugar" },
        { word: "热", romanization: "rè", meaning: "hot" },
        { word: "吸管", romanization: "xīguǎn", meaning: "straw" },
        { word: "牛奶", romanization: "niúnǎi", meaning: "milk" },
        { word: "柠檬", romanization: "níngméng", meaning: "lemon" },
        { word: "豆浆", romanization: "dòujiāng", meaning: "soy milk" },
      ] },
      { id: "fruitSeller", label: "Fruit Seller", words: [
        { word: "西瓜", romanization: "xīguā", meaning: "watermelon" },
        { word: "芒果", romanization: "mángguǒ", meaning: "mango" },
        { word: "新鲜", romanization: "xīnxiān", meaning: "fresh" },
        { word: "便宜", romanization: "piányi", meaning: "cheap" },
        { word: "苹果", romanization: "píngguǒ", meaning: "apple" },
        { word: "香蕉", romanization: "xiāngjiāo", meaning: "banana" },
        { word: "甜", romanization: "tián", meaning: "sweet" },
        { word: "袋子", romanization: "dàizi", meaning: "bag" },
        { word: "橙子", romanization: "chéngzi", meaning: "orange" },
        { word: "榴莲", romanization: "liúlián", meaning: "durian" },
      ] },
    ],
    "public-transport": [
      { id: "stationMaster", label: "Station Master", words: [
        { word: "闸门", romanization: "zhámén", meaning: "fare gate" },
        { word: "车票", romanization: "chēpiào", meaning: "ticket" },
        { word: "列车", romanization: "lièchē", meaning: "train (carriages)" },
        { word: "延误", romanization: "yánwù", meaning: "delay" },
        { word: "广播", romanization: "guǎngbō", meaning: "announcement" },
        { word: "方向", romanization: "fāngxiàng", meaning: "direction" },
        { word: "紧急", romanization: "jǐnjí", meaning: "emergency" },
        { word: "地图", romanization: "dìtú", meaning: "map" },
        { word: "储值", romanization: "chǔzhí", meaning: "top up" },
        { word: "失物", romanization: "shīwù", meaning: "lost property" },
      ] },
      { id: "busCaptain", label: "Bus Captain", words: [
        { word: "扶手", romanization: "fúshǒu", meaning: "handrail" },
        { word: "铃", romanization: "líng", meaning: "bell" },
        { word: "终点站", romanization: "zhōngdiǎnzhàn", meaning: "last stop" },
        { word: "塞车", romanization: "sāichē", meaning: "traffic jam" },
        { word: "方向盘", romanization: "fāngxiàngpán", meaning: "steering wheel" },
        { word: "让座", romanization: "ràngzuò", meaning: "give up a seat" },
        { word: "刹车", romanization: "shāchē", meaning: "brake" },
        { word: "车厢", romanization: "chēxiāng", meaning: "carriage" },
        { word: "到站", romanization: "dàozhàn", meaning: "arrive at a stop" },
        { word: "坐稳", romanization: "zuòwěn", meaning: "sit steady" },
      ] },
      { id: "taxiDriver", label: "Taxi Driver", words: [
        { word: "机场", romanization: "jīchǎng", meaning: "airport" },
        { word: "地址", romanization: "dìzhǐ", meaning: "address" },
        { word: "红灯", romanization: "hóngdēng", meaning: "red light" },
        { word: "行李", romanization: "xíngli", meaning: "luggage" },
        { word: "安全带", romanization: "ānquándài", meaning: "seat belt" },
        { word: "导航", romanization: "dǎoháng", meaning: "navigation" },
        { word: "找钱", romanization: "zhǎoqián", meaning: "give change" },
        { word: "转弯", romanization: "zhuǎnwān", meaning: "turn (a corner)" },
        { word: "空车", romanization: "kōngchē", meaning: "empty taxi" },
        { word: "后座", romanization: "hòuzuò", meaning: "back seat" },
      ] },
    ],
  },
};

// The role groups of one album, minus any word the zone list already has.
function roleCardsFor(albumId, language) {
  const groups = (typeof ROLE_CARDS !== "undefined" && ROLE_CARDS[language] && ROLE_CARDS[language][albumId]) || [];
  const zone = (typeof ZONE_WORDS !== "undefined" && ZONE_WORDS[language] && ZONE_WORDS[language][albumId]) || [];
  const taken = new Set(zone.map((w) => w.word));
  return groups.map((g) => ({ id: g.id, label: g.label, words: g.words.filter((w) => !taken.has(w.word)) }));
}