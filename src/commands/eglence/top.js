const UserScore = require("../../models/UserScore");

module.exports = {
  name: "top",
  description: "En aktif chatterları gosterir",
  async execute() {
    const top = await UserScore.find()
      .sort({ level: -1, xp: -1 })
      .limit(5);

    if (!top.length) {
      return "🏆 Henüz skor tablosu oluşmadı, sohbete devam!";
    }

    const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
    const list = top
      .map((u, i) => `${medals[i]} ${u.username} (Sv.${u.level}) — ${u.messageCount} mesaj`)
      .join(" | ");

    return [
      `🏆 ━━━ EN AKTİF CHATTERLAR ━━━`,
      list,
    ];
  },
};
