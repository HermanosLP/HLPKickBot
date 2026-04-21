const Boss = require("../../models/Boss");
const { isMod } = require("../../utils/modCheck");
const eventBus = require("../../events/EventBus");
const bossConfig = require("../../config/bosses.json");

module.exports = {
  name: "boss",
  description: "Boss spawn eder (sadece yayıncı/mod). Kullanım: !boss [zombie|licker|tyrant|nemesis|wesker]",
  async execute(msg) {
    if (!isMod(msg)) return null;

    const args = msg.content.split(" ").slice(1);
    let tierKey = args[0]?.toLowerCase();
    const tiers = Object.keys(bossConfig.tiers);

    if (!tierKey) {
      tierKey = tiers[Math.floor(Math.random() * tiers.length)];
    } else if (!tiers.includes(tierKey)) {
      return `⚠️ Geçersiz boss: ${tierKey}. Mevcut: ${tiers.join(", ")}`;
    }

    const active = await Boss.findOne({ status: "active" });
    if (active) {
      return `⚠️ Zaten aktif boss var: ${active.emoji} ${active.name}. Önce o bitsin.`;
    }

    const cfg = bossConfig.tiers[tierKey];
    const boss = new Boss({
      tierKey,
      name: cfg.name,
      emoji: cfg.emoji,
      image: cfg.image,
      color: cfg.color,
      tier: cfg.tier,
      maxHp: cfg.maxHp,
      currentHp: cfg.maxHp,
      timeLimit: cfg.timeLimit,
      maxCoinsPerAttack: cfg.maxCoinsPerAttack,
      minCoinsPerAttack: cfg.minCoinsPerAttack,
      minUniqueAttackers: cfg.minUniqueAttackers,
      spawnedBy: msg.username,
      expiresAt: new Date(Date.now() + cfg.timeLimit * 1000),
    });
    await boss.save();

    eventBus.emit("boss:spawn", {
      bossId: String(boss._id),
      tierKey,
      name: cfg.name,
      emoji: cfg.emoji,
      image: cfg.image,
      color: cfg.color,
      tier: cfg.tier,
      maxHp: cfg.maxHp,
      currentHp: cfg.maxHp,
      timeLimit: cfg.timeLimit,
      maxCoinsPerAttack: cfg.maxCoinsPerAttack,
      minCoinsPerAttack: cfg.minCoinsPerAttack,
      minUniqueAttackers: cfg.minUniqueAttackers,
      expiresAt: boss.expiresAt.toISOString(),
      spawnedBy: msg.username,
    });

    const mins = Math.floor(cfg.timeLimit / 60);
    return `${cfg.emoji} BOSS SPAWN: ${cfg.name.toUpperCase()} (Tier ${cfg.tier}) | HP: ${cfg.maxHp} | Süre: ${mins} dk | !saldır <coin> (${cfg.minCoinsPerAttack}-${cfg.maxCoinsPerAttack}) | Min ${cfg.minUniqueAttackers} farklı saldırgan şart!`;
  },
};
