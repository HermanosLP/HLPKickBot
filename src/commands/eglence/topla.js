const UserScore = require("../../models/UserScore");
const { claim } = require("../../utils/coinDrop");

module.exports = {
  name: "topla",
  description: "Aktif coin drop'unu yakalar (ilk yazan kazanır)",
  async execute(msg) {
    const won = claim();
    if (!won) return null;

    let user = await UserScore.findOne({ userId: String(msg.userId) });
    if (!user) {
      user = new UserScore({ userId: String(msg.userId), username: msg.username });
    }

    user.coins = (user.coins || 0) + won.amount;
    user.username = msg.username;
    await user.save();

    return `🎉 ${msg.username} dropu yakaladı! +${won.amount} 🪙 (💰 ${user.coins})`;
  },
};
