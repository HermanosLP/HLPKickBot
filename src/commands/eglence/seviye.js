const UserScore = require("../../models/UserScore");

module.exports = {
  name: "seviye",
  description: "Seviye ve XP bilgini gosterir",
  needsUser: true,
  async execute(msg) {
    const user = await UserScore.findOne({ userId: msg.userId });

    if (!user) {
      return "⭐ Henüz hiç mesaj atmamışsın, sohbete katıl!";
    }

    const rank = await UserScore.countDocuments({ level: { $gt: user.level } }) + 1;

    if (user.level >= 100) {
      return [
        `👑 ${user.username} — Seviye 100 (MAX)`,
        `📊 XP: MAX [▓▓▓▓▓▓▓▓▓▓] | 🏅 Sıralama: #${rank}`,
      ];
    }

    const requiredXP = user.getRequiredXP();
    const progress = Math.floor((user.xp / requiredXP) * 10);
    const bar = "▓".repeat(progress) + "░".repeat(10 - progress);

    return [
      `⭐ ${user.username} — Seviye ${user.level}`,
      `📊 XP: ${user.xp}/${requiredXP} [${bar}] | 🏅 Sıralama: #${rank}`,
    ];
  },
};
