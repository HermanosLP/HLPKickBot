const mongoose = require("mongoose");

const attackSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    username: { type: String, required: true },
    damage: { type: Number, required: true },
    coinsSpent: { type: Number, required: true },
    crit: { type: Boolean, default: false },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const bossSchema = new mongoose.Schema({
  tierKey: { type: String, required: true },
  name: { type: String, required: true },
  emoji: { type: String, default: "" },
  image: { type: String, default: null },
  color: { type: String, default: "#c82828" },
  tier: { type: Number, required: true },
  maxHp: { type: Number, required: true },
  currentHp: { type: Number, required: true },
  timeLimit: { type: Number, required: true },
  maxCoinsPerAttack: { type: Number, required: true },
  minCoinsPerAttack: { type: Number, required: true },
  minUniqueAttackers: { type: Number, required: true },
  spawnedBy: { type: String, required: true },
  spawnedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  status: {
    type: String,
    enum: ["active", "defeated", "expired"],
    default: "active",
  },
  attacks: { type: [attackSchema], default: [] },
  defeatedAt: { type: Date, default: null },
  resolvedAt: { type: Date, default: null },
});

bossSchema.methods.stats = function () {
  const damageByUser = new Map();
  let totalCoins = 0;
  let totalDamage = 0;
  for (const a of this.attacks) {
    const prev = damageByUser.get(a.userId) || {
      userId: a.userId,
      username: a.username,
      damage: 0,
      coinsSpent: 0,
      hits: 0,
    };
    prev.damage += a.damage;
    prev.coinsSpent += a.coinsSpent;
    prev.hits += 1;
    prev.username = a.username;
    damageByUser.set(a.userId, prev);
    totalCoins += a.coinsSpent;
    totalDamage += a.damage;
  }
  return {
    totalCoins,
    totalDamage,
    uniqueAttackers: damageByUser.size,
    damageByUser,
  };
};

module.exports = mongoose.model("Boss", bossSchema);
