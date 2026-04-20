const UserScore = require("../../models/UserScore");

module.exports = {
  name: "coin",
  description: "Coin bakiyeni ve sıralamanı gösterir",
  needsUser: true,
  async execute(msg) {
    const user = await UserScore.findOne({ userId: msg.userId });

    if (!user || !user.coins) {
      return `${msg.username}, henüz hiç 🪙 coin'in yok. !günlük ile başlayabilirsin!`;
    }

    const rank = await UserScore.countDocuments({ coins: { $gt: user.coins } }) + 1;
    return `💰 ${user.username} — ${user.coins} 🪙 coin | 🏅 Sıralama: #${rank}`;
  },
};
