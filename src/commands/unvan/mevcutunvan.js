const UserScore = require("../../models/UserScore");
const { getRankById } = require("../../models/Rank");

module.exports = {
  name: "mevcutunvan",
  description: "Aktif rutbeyi gosterir",
  async execute(msg) {
    const user = await UserScore.findOne({ userId: String(msg.userId) });

    if (!user) {
      return "☣️ Henüz hiç rütben yok, sohbete katıl!";
    }

    const rank = getRankById(user.selectedRank);

    if (!rank) {
      return "⚠️ Seçili rütbe bulunamadı, !unvansec ile rütbe seç.";
    }

    return `${rank.emoji} ${msg.username} — ${rank.name}`;
  },
};
