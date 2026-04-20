const UserScore = require("../../models/UserScore");
const { getRankById } = require("../../models/Rank");

module.exports = {
  name: "profil",
  description: "Kendi profilini veya @user profilini gösterir",
  async execute(msg) {
    const args = msg.content.split(" ").slice(1);
    const rawTarget = args[0]?.trim();

    let user;
    let displayName;

    if (rawTarget) {
      const cleanName = rawTarget.replace(/^@/, "").toLowerCase();
      user = await UserScore.findOne({
        username: new RegExp(`^${cleanName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
      });
      if (!user) {
        return `❓ ${rawTarget} kullanıcısı bulunamadı (henüz chat'e yazmamış olabilir).`;
      }
      displayName = user.username;
    } else {
      user = await UserScore.findOne({ userId: String(msg.userId) });
      displayName = msg.username;
      if (!user) {
        return `${displayName}, henüz hiç mesaj atmamışsın — sohbete katıl!`;
      }
    }

    const rank = getRankById(user.selectedRank) || getRankById(0);
    const xpRequired = user.level >= 100 ? "MAX" : `${user.xp}/${user.level * 100}`;
    const followBadge = user.followRewardClaimed ? "✅" : "❌";
    const streak = user.dailyStreak || 0;

    return `📇 ${displayName} — ⭐ Sv${user.level} (${xpRequired} XP) | ${rank.emoji} ${rank.name} | 💰 ${user.coins || 0} 🪙 | 🔥 ${streak} gün seri | Takip: ${followBadge}`;
  },
};
