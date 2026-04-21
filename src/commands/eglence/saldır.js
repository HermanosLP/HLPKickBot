const Boss = require("../../models/Boss");
const UserScore = require("../../models/UserScore");
const eventBus = require("../../events/EventBus");
const bossConfig = require("../../config/bosses.json");

const cooldowns = new Map();

function getLevelBonus(level) {
  for (const lb of bossConfig.combat.levelBonuses) {
    if (level >= lb.minLevel) return lb.bonus;
  }
  return 0;
}

async function resolveDefeat(boss) {
  boss.status = "defeated";
  boss.defeatedAt = new Date();
  boss.resolvedAt = new Date();
  await boss.save();

  const stats = boss.stats();
  const rw = bossConfig.rewards;
  const totalPot = Math.floor(stats.totalCoins * rw.potMultiplier);

  const sorted = [...stats.damageByUser.values()].sort((a, b) => b.damage - a.damage);

  const topPrizes = [
    Math.floor(totalPot * rw.first),
    Math.floor(totalPot * rw.second),
    Math.floor(totalPot * rw.third),
  ];

  const distributed = [];

  for (let i = 0; i < Math.min(3, sorted.length); i++) {
    const info = sorted[i];
    const prize = topPrizes[i];
    const u = await UserScore.findOne({ userId: info.userId });
    if (u) {
      u.coins = (u.coins || 0) + prize;
      await u.save();
    }
    distributed.push({ username: info.username, damage: info.damage, reward: prize, rank: i + 1 });
  }

  const participantsPool = Math.floor(totalPot * rw.participantsShare);
  const rest = sorted.slice(3);
  const restDamage = rest.reduce((s, e) => s + e.damage, 0);
  for (const info of rest) {
    const share = restDamage > 0 ? Math.floor((info.damage / restDamage) * participantsPool) : 0;
    if (share > 0) {
      const u = await UserScore.findOne({ userId: info.userId });
      if (u) {
        u.coins = (u.coins || 0) + share;
        await u.save();
      }
      distributed.push({ username: info.username, damage: info.damage, reward: share, rank: null });
    }
  }

  eventBus.emit("boss:defeat", {
    bossId: String(boss._id),
    name: boss.name,
    emoji: boss.emoji,
    tier: boss.tier,
    totalPot,
    totalDamage: stats.totalDamage,
    uniqueAttackers: stats.uniqueAttackers,
    topThree: distributed.filter((d) => d.rank).sort((a, b) => a.rank - b.rank),
    allParticipants: distributed,
  });

  const medals = ["🥇", "🥈", "🥉"];
  const topText = distributed
    .filter((d) => d.rank)
    .map((d) => `${medals[d.rank - 1]} @${d.username} (${d.reward} 🪙)`)
    .join(" | ");
  return `🏆 ${boss.emoji} ${boss.name.toUpperCase()} ÖLDÜRÜLDÜ! | Pot: ${totalPot} 🪙 | ${topText}`;
}

module.exports = {
  name: "saldır",
  description: "Aktif bossa saldırır. Kullanım: !saldır <coin>",
  async execute(msg) {
    const args = msg.content.split(" ");
    const coins = parseInt(args[1]);
    if (isNaN(coins) || coins <= 0) {
      return `⚠️ Kullanım: !saldır <coin>`;
    }

    const boss = await Boss.findOne({ status: "active" });
    if (!boss) return `⚠️ Aktif boss yok.`;

    if (new Date() > boss.expiresAt) {
      return `⚠️ ${boss.name} kaçtı, çok geç!`;
    }

    if (coins < boss.minCoinsPerAttack) {
      return `⚠️ ${msg.username}, ${boss.name} için min ${boss.minCoinsPerAttack} coin gerek.`;
    }
    if (coins > boss.maxCoinsPerAttack) {
      return `⚠️ ${msg.username}, ${boss.name} için max ${boss.maxCoinsPerAttack} coin/saldırı.`;
    }

    const userId = String(msg.userId);
    const now = Date.now();
    const lastAttack = cooldowns.get(userId) || 0;
    const cooldownMs = bossConfig.combat.attackCooldownMs;
    const remaining = Math.max(0, cooldownMs - (now - lastAttack));
    if (remaining > 0) {
      return `⏱️ ${msg.username}, ${Math.ceil(remaining / 1000)}sn cooldown.`;
    }

    const deducted = await UserScore.findOneAndUpdate(
      { userId, coins: { $gte: coins } },
      { $inc: { coins: -coins } },
      { new: true }
    );
    if (!deducted) {
      const cur = await UserScore.findOne({ userId });
      return `⚠️ ${msg.username}, yetersiz coin (${cur?.coins || 0} var, ${coins} lazım).`;
    }

    const dmgRange = bossConfig.tiers[boss.tierKey].damagePerCoin;
    const multiplier = dmgRange.min + Math.random() * (dmgRange.max - dmgRange.min);
    let damage = Math.floor(coins * multiplier);

    const crit = Math.random() < bossConfig.combat.critChance;
    if (crit) damage = Math.floor(damage * bossConfig.combat.critMultiplier);

    const levelBonus = getLevelBonus(deducted.level || 1);
    if (levelBonus > 0) damage = Math.floor(damage * (1 + levelBonus));

    const panicThreshold = bossConfig.combat.panicHpThreshold;
    const wasInPanic = boss.currentHp / boss.maxHp < panicThreshold;
    if (wasInPanic) {
      damage = Math.floor(damage * (1 + bossConfig.combat.panicDamageBonus));
    }

    damage = Math.max(1, damage);

    const prevStats = boss.stats();
    const isNewAttacker = !prevStats.damageByUser.has(userId);
    const projectedUnique = prevStats.uniqueAttackers + (isNewAttacker ? 1 : 0);
    const needMore = Math.max(0, boss.minUniqueAttackers - projectedUnique);

    let finalDamage = damage;
    let lockedAt1 = false;
    if (needMore > 0 && boss.currentHp - damage <= 0) {
      finalDamage = Math.max(0, boss.currentHp - 1);
      lockedAt1 = true;
    }

    boss.currentHp = Math.max(0, boss.currentHp - finalDamage);
    boss.attacks.push({
      userId,
      username: msg.username,
      damage: finalDamage,
      coinsSpent: coins,
      crit,
    });
    await boss.save();

    cooldowns.set(userId, now);

    const newStats = boss.stats();
    const nowInPanic = boss.currentHp / boss.maxHp < panicThreshold;
    const enteredPanic = !wasInPanic && nowInPanic && boss.currentHp > 0;

    eventBus.emit("boss:attack", {
      bossId: String(boss._id),
      currentHp: boss.currentHp,
      maxHp: boss.maxHp,
      attacker: {
        username: msg.username,
        damage: finalDamage,
        coinsSpent: coins,
        crit,
      },
      uniqueAttackers: newStats.uniqueAttackers,
      minAttackers: boss.minUniqueAttackers,
      totalCoins: newStats.totalCoins,
      panicMode: nowInPanic,
      enteredPanic,
      lockedAt1,
    });

    if (boss.currentHp === 0 && !lockedAt1) {
      return await resolveDefeat(boss);
    }

    const parts = [];
    parts.push(`${crit ? "💥 CRIT!" : "⚔️"} ${msg.username} → ${finalDamage} hasar`);
    if (lockedAt1) {
      parts.push(`⚠️ Son darbe için ${boss.minUniqueAttackers - newStats.uniqueAttackers} farklı saldırgan daha lazım!`);
    } else if (enteredPanic) {
      parts.push(`☣️ ${boss.name} kudurdu! (+%${bossConfig.combat.panicDamageBonus * 100} hasar)`);
    } else {
      parts.push(`${boss.name}: ${boss.currentHp}/${boss.maxHp}`);
    }
    return parts.join(" | ");
  },
};
