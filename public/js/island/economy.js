// The island's reward numbers and how they are paid, all in one place.
// To rebalance the game change ISLAND_ECONOMY only.
//
//   First clear      mini-game 40 coins + 40 XP for a game of 8 questions, NPC challenge 25 + 25
//   Game length      a mini-game pays by its question count: 2 questions = 40%, 8 = 100%, 16 or more = 200%
//   Mini-game cards  1 card per 4 questions (at least 1, at most 4), drawn from the words answered right
//   Replays          pay less each time: 100%, 60%, 40%, 25%, then 15%
//   NPC performance  failed 30%  /  passed 100%  /  all correct 140%
//   Duplicate card   5 coins + 3 XP (cards themselves never shrink)
//
// Clearing every mini-game and NPC once pays about 585 coins and 585 XP. The
// Home Island shop costs 1060 coins and level 5 needs 800 XP, so the shop takes
// roughly a week of replays and quests: replaying is worth it, farming is not.
//
//   IslandEconomy.npcPayout(npcId, score, total)   what this attempt is worth (before paying)
//   IslandEconomy.miniPayout(level, ratio, total)   same for a mini-game (ratio 0-1, default 1; total = its question count)
//   IslandEconomy.miniCards(total)                  how many cards a mini-game can give
//   IslandEconomy.duplicatePayout(count)            what duplicate cards are worth
//   IslandEconomy.pay({ coins, xp })                gives it to the player; returns { coins, xp, levelUps }

const ISLAND_ECONOMY = {
  mini: { coins: 40, xp: 40, refQuestions: 8, minSize: 0.4, maxSize: 2, questionsPerCard: 4, maxCards: 4 },
  npc: { coins: 25, xp: 25 },
  // share paid on the 1st, 2nd, 3rd... time; the last number repeats
  decay: [1, 0.6, 0.4, 0.25, 0.15],
  // NPC challenge: failed / passed / every question right
  npcTier: { fail: 0.3, pass: 1, perfect: 1.4 },
  duplicate: { coins: 5, xp: 3 },
};

const IslandEconomy = {
  decayFor(plays) { const d = ISLAND_ECONOMY.decay; return d[Math.min(Math.max(0, plays), d.length - 1)]; },

  scale(base, factor) {
    const n = (v) => (v > 0 ? Math.max(1, Math.round(v * factor)) : 0);
    return { coins: n(base.coins), xp: n(base.xp) };
  },

  tier(score, total) {
    if (total > 0 && score >= total) return "perfect";
    return score >= IslandQuiz.passMark(total) ? "pass" : "fail";
  },

  npcPayout(npcId, score, total) {
    const tier = this.tier(score, total);
    const plays = IslandState.playsOf(`npc:${npcId}`);
    const factor = this.decayFor(plays) * ISLAND_ECONOMY.npcTier[tier];
    return { ...this.scale(ISLAND_ECONOMY.npc, factor), tier, plays, factor };
  },

  // A longer game pays more. A game that does not say its length (total) pays the 8-question amount.
  sizeFor(total) {
    const m = ISLAND_ECONOMY.mini;
    const n = Number(total);
    if (!(n > 0)) return 1;
    return Math.max(m.minSize, Math.min(m.maxSize, n / m.refQuestions));
  },

  // How many cards one play of a game can give: 1 per 4 questions, at least 1, at most 4.
  miniCards(total) {
    const m = ISLAND_ECONOMY.mini;
    const n = Number(total);
    if (!(n > 0)) return 2;
    return Math.max(1, Math.min(m.maxCards, Math.round(n / m.questionsPerCard)));
  },

  miniPayout(level, ratio = 1, total) {
    const plays = IslandState.playsOf(`mini:${level}`);
    const factor = this.decayFor(plays) * (0.4 + 0.6 * Math.max(0, Math.min(1, ratio))) * this.sizeFor(total);
    return { ...this.scale(ISLAND_ECONOMY.mini, factor), plays, factor };
  },

  duplicatePayout(count) {
    return { coins: ISLAND_ECONOMY.duplicate.coins * count, xp: ISLAND_ECONOMY.duplicate.xp * count };
  },

  // Coins go through the island's coin system (same balance as the profile). XP goes to the
  // profile when the player is logged in; guests and ?testing links only get coins.
  async pay({ coins = 0, xp = 0 }) {
    const out = { coins: 0, xp: 0, levelUps: 0 };
    if (coins > 0) { IslandState.addCoins(coins); out.coins = coins; }
    if (xp > 0 && IslandState.useServer() && typeof grantRewards === "function") {
      try {
        const r = await grantRewards(IslandSave.userId, { xp, coins: 0 });
        out.xp = xp; out.levelUps = r.levelUps || 0;
        if (out.levelUps) await IslandState.syncCoins(true); // level-up bonus coins
      } catch (err) { console.warn("Island: could not add XP.", err && err.message); }
    }
    return out;
  },
};

// For mini-games: pay a finished level. IslandAPI.completeLevel already calls this.
window.IslandAPI = Object.assign(window.IslandAPI || {}, {
  economy: ISLAND_ECONOMY,
});