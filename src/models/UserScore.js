const mongoose = require("mongoose");

const userScoreSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  messageCount: { type: Number, default: 0 },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  lastDaily: { type: Date, default: null },
  dailyStreak: { type: Number, default: 0 },
  earnedRanks: { type: [Number], default: [0] },
  selectedRank: { type: Number, default: 0 },
});

// Her seviye icin gereken XP: seviye * 100
// Seviye 2 = 200 XP, Seviye 3 = 300 XP, Seviye 10 = 1000 XP ...
userScoreSchema.methods.getRequiredXP = function () {
  return this.level * 100;
};

const MAX_LEVEL = 100;

userScoreSchema.methods.addXP = function (amount) {
  if (this.level >= MAX_LEVEL) return false;

  this.xp += amount;

  let leveledUp = false;
  while (this.xp >= this.getRequiredXP() && this.level < MAX_LEVEL) {
    this.xp -= this.getRequiredXP();
    this.level += 1;
    leveledUp = true;
  }

  // Max seviyeye ulastiysa XP'yi sifirla
  if (this.level >= MAX_LEVEL) {
    this.xp = 0;
  }

  return leveledUp;
};

module.exports = mongoose.model("UserScore", userScoreSchema);
