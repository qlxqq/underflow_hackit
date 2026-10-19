// Assigns a rarity tier to a card from how common the word is in everyday speech.
//
// Rarity comes from the first of these that knows the word:
//   1. CARD_RARITY (below): the island's own words, rated by hand, so an everyday word is never Legendary.
//   2. The frequency lists (zhFrequency.js, msFrequency.js, taFrequency.js): the further down the list, the rarer.
//   3. A "commonness" rating from the AI lookup when a word is captured (1 = used all the time ... 5 = very rare),
//      passed as the third argument: getRarity(word, language, commonness).
//   4. Otherwise Uncommon. (A word we know nothing about used to be Legendary, which made plain words Legendary.)
// Legendary is kept for the island's most distinctive words (Singapore place names, 组屋, 德士, chope...) and for
// captured words the AI rates as very rare.
const RARITY = {
  COMMON: "common",
  UNCOMMON: "uncommon",
  RARE: "rare",
  EPIC: "epic",
  LEGENDARY: "legendary",
};
const RARITY_ORDER = [RARITY.COMMON, RARITY.UNCOMMON, RARITY.RARE, RARITY.EPIC, RARITY.LEGENDARY];

// The last rank in each tier, per language, for the frequency lists. Past the last number (but still in the list)
// is Legendary. Tamil's list is shorter, so its cutoffs are lower. Tune these to make a tier easier or harder to reach.
const RARITY_CUTOFFS = {
  zh: [400, 1500, 4000, 8000],
  ms: [400, 1500, 4000, 8000],
  ta: [300, 1000, 2500, 6000],
};

const FREQUENCY_LISTS = {
  zh: typeof ZH_COMMON_WORDS !== "undefined" ? ZH_COMMON_WORDS : [],
  ms: typeof MS_COMMON_WORDS !== "undefined" ? MS_COMMON_WORDS : [],
  ta: typeof TA_COMMON_WORDS !== "undefined" ? TA_COMMON_WORDS : [],
};

// word -> rank (1 = most common), built once so each lookup is instant.
const WORD_RANKS = {};
Object.keys(FREQUENCY_LISTS).forEach((language) => {
  WORD_RANKS[language] = new Map(FREQUENCY_LISTS[language].map((word, i) => [word, i + 1]));
});

// ---- the island's words, rated by hand (zone cards and NPC role cards). Words are separated by | ----
// To change a card's rarity, move its word to another line. Add new island words here too.
const CARD_RARITY = {
  zh: {
    common: "家|今天|每天|早上|晚上|中午|哪里|请问|吃饭|喜欢|玩|走|睡觉|小孩|超市|公园|楼下|咖啡|茶|面|喝|糖|汤|加|可以|一点|找|坐|学校|谢谢|巴士|地铁|手机|好吃|好多|有人|多少钱|辣|换|大约|对面|下车|一共|五分钟|三十分钟|几号|座位|车票|机场|米饭|牛奶|冰|热|甜|便宜|苹果|香蕉|杯子|免费|安全|警察|教室|作业|同学|考试|书包|西瓜|橙子|一杯|老人|住在|三楼|声音|安静|干净|老板|付钱|放|买菜|最近|跑步|坏了|吃饱|奶奶|叔叔|阿姨|记得|司机|马路|号码|钱包|红灯|地图|奶茶|下课|欢迎|帮忙|电梯",
    uncommon: "邻居|游乐场|散步|楼梯|小声|社区|阿嬷|阿公|期待|下班|晚餐|活动|手臂|聊天|烫|打招呼|鸡饭|冰咖啡|炒面|辣椒|吃辣|打包|位子|排队|付款|现金|粥|一包|少糖|拥挤|找钱|地铁站|巴士站|下一站|转车|刷卡|让给|路口|下一班|挤|交通卡|充值|提醒|师傅|车费|停车|让座|课本|铅笔|黑板|作文|报名|课程|会员|舞蹈|通知|报警|迷路|小偷|酱油|盘子|黄瓜|勺子|厨师|鸡腿|柠檬|豆浆|芒果|新鲜|袋子|榴莲|列车|广播|方向|紧急|铃|塞车|刹车|车厢|到站|地址|行李|导航|转弯",
    rare: "包裹|药房|实习|装修|酸痛|滑梯|下棋|云吞面|叉烧面|鱼片汤|转账|故障|转乘|延误|志愿者|书法|证件|辣酱|吸管|扶手|终点站|方向盘|坐稳|安全带|空车|后座",
    epic: "攀岩|巡逻|闸门|储值|失物|德士站",
    legendary: "多美歌|淡滨尼|乌节路|组屋|德士",
  },
  ms: {
    common: "makan malam|mi goreng|kedai|nenek|kerja|telefon|pedas|sambal|kopi|nasi|bayar|duduk|mi|bas|stesen|tren|tukar|kad|turun|pakcik|berdiri|rosak|lambat|berhenti",
    uncommon: "sup ikan|duit tunai|jiran|tingkat|farmasi|kenyang|drama|atuk|bising|acara|gerai|beratur|bungkus|pesan|kongsi|kuah|bubur|sesak|perhentian|seberang|terlepas",
    rare: "pusat komuniti|tambah nilai|lintas jalan|blok|simpang",
    epic: "latihan industri",
    legendary: "cop",
  },
  ta: {
    common: "கடை|கீழே|பாட்டி|கதை|மாசம்|வாரம்|வேலை|ராத்திரி|தாத்தா|போன்|சத்தம்|தோசை|காப்பி|பணம்|இட்லி|காசு|ரயில்|பஸ்|வழி|நன்றி|பள்ளி",
    uncommon: "வார இறுதி|கோழி சோறு|தொடர்|நிகழ்ச்சி|வரிசை|காரம்|சர்க்கரை|வெங்காயம்|குழம்பு|கஞ்சி|அட்டை|நிறுத்தம்",
    rare: "மருந்துக் கடை|வர்ணம்|சந்திப்பு",
    epic: "மேல் வீட்டுக்காரங்க",
    legendary: "வேலைப் பயிற்சி",
  },
};

// word -> tier, built once.
const CARD_RARITY_MAP = {};
Object.keys(CARD_RARITY).forEach((language) => {
  CARD_RARITY_MAP[language] = new Map();
  Object.keys(CARD_RARITY[language]).forEach((tier) => {
    CARD_RARITY[language][tier].split("|").filter(Boolean).forEach((word) => CARD_RARITY_MAP[language].set(word, tier));
  });
});

// commonness (the AI's 1-5 rating) -> tier
function rarityFromCommonness(commonness) {
  const n = Math.round(Number(commonness));
  if (!Number.isFinite(n) || n < 1) return null;
  return RARITY_ORDER[Math.min(n, 5) - 1];
}

function getRarity(word, language, commonness) {
  const cutoffs = RARITY_CUTOFFS[language];
  if (!cutoffs) return RARITY.COMMON; // an unsupported language: nothing to rank by

  const rated = CARD_RARITY_MAP[language] && CARD_RARITY_MAP[language].get(word);
  if (rated) return rated;

  const rank = WORD_RANKS[language] && WORD_RANKS[language].get(word);
  if (rank) {
    const tier = cutoffs.findIndex((lastRank) => rank <= lastRank);
    return tier === -1 ? RARITY.LEGENDARY : RARITY_ORDER[tier];
  }

  return rarityFromCommonness(commonness) || RARITY.UNCOMMON;
}