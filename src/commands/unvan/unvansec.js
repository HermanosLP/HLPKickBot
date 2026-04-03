const UserScore = require("../../models/UserScore");
const { getRankById } = require("../../models/Rank");

module.exports = {
  name: "unvansec",
  description: "Rutbe secer",
  async execute(msg) {
    const args = msg.content.split(" ");
    const rankId = parseInt(args[1]);

    if (isNaN(rankId)) {
      return "⚠️ Kullanım: !unvansec <id> — Rütbe ID'ni görmek için !unvan yaz.";
    }

    const rank = getRankById(rankId);
    if (!rank) {
      return "⚠️ Geçersiz rütbe ID'si! Rütbelerini görmek için !unvan yaz.";
    }

    const user = await UserScore.findOne({ userId: String(msg.userId) });

    if (!user || !user.earnedRanks.includes(rankId)) {
      return `🔒 Bu rütbeyi henüz kazanmadın! ${rank.emoji} ${rank.name} için Seviye ${rank.minLevel} gerekli.`;
    }

    user.selectedRank = rankId;
    await user.save();

    return `✅ Rütben değiştirildi! ${rank.emoji} ${rank.name}`;
  },
};
