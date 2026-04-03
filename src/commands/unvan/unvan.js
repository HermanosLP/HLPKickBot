const UserScore = require("../../models/UserScore");
const { getRankById, ranks } = require("../../models/Rank");

module.exports = {
  name: "unvan",
  description: "Kazanilan rutbeleri listeler",
  async execute(msg) {
    const user = await UserScore.findOne({ userId: String(msg.userId) });

    if (!user) {
      return "☣️ Henüz hiç rütben yok, sohbete katıl!";
    }

    const earned = user.earnedRanks
      .map((id) => getRankById(id))
      .filter(Boolean)
      .map((r) => {
        const selected = r.id === user.selectedRank ? " ✅" : "";
        return `[${r.id}] ${r.emoji} ${r.name}${selected}`;
      });

    const locked = ranks
      .filter((r) => !user.earnedRanks.includes(r.id))
      .map((r) => `[${r.id}] 🔒 ??? (Sv.${r.minLevel})`);

    return [
      `☣️ ━━━ ${msg.username} RÜTBELER ━━━`,
      earned.join(" | "),
      locked.length ? locked.join(" | ") : null,
      `💡 Seçmek için: !unvansec <id>`,
    ].filter(Boolean);
  },
};
