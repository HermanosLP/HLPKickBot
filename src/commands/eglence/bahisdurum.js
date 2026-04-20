const Bet = require("../../models/Bet");

module.exports = {
  name: "bahisdurum",
  description: "Aktif bahsin mevcut durumunu gösterir",
  async execute(msg) {
    const bet = await Bet.findOne({ status: { $in: ["open", "closed"] } });
    if (!bet) return `ℹ️ Şu anda aktif bahis yok.`;

    const { evet, hayır, evetCount, hayırCount } = bet.totals();

    let timeInfo;
    if (bet.status === "closed" || new Date() > bet.closesAt) {
      timeInfo = "⏰ Kapalı, sonuç bekleniyor";
    } else {
      const remainingMs = bet.closesAt - new Date();
      const minutes = Math.floor(remainingMs / 60000);
      const seconds = Math.floor((remainingMs % 60000) / 1000);
      timeInfo = `⏰ ${minutes}:${seconds.toString().padStart(2, "0")} kaldı`;
    }

    return `🎲 "${bet.question}" | Evet: ${evet} 🪙 (${evetCount}) | Hayır: ${hayır} 🪙 (${hayırCount}) | ${timeInfo}`;
  },
};
