const Bet = require("../../models/Bet");
const UserScore = require("../../models/UserScore");
const { isMod } = require("../../utils/modCheck");

module.exports = {
  name: "bahisiptal",
  description: "Bahsi iptal eder, tüm coinleri iade eder (sadece yayıncı/mod)",
  async execute(msg) {
    if (!isMod(msg)) return null;

    const bet = await Bet.findOne({ status: { $in: ["open", "closed"] } });
    if (!bet) return `⚠️ Aktif bahis yok.`;

    for (const b of bet.bets) {
      const user = await UserScore.findOne({ userId: b.userId });
      if (user) {
        user.coins = (user.coins || 0) + b.amount;
        await user.save();
      }
    }

    bet.status = "cancelled";
    bet.settledAt = new Date();
    await bet.save();

    return `❌ Bahis iptal edildi: "${bet.question}" — Tüm coinler iade edildi.`;
  },
};
