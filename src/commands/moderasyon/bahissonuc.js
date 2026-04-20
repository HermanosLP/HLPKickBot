const Bet = require("../../models/Bet");
const UserScore = require("../../models/UserScore");
const { isMod } = require("../../utils/modCheck");

module.exports = {
  name: "bahissonuc",
  description: "Bahsi sonuçlandırır (sadece yayıncı/mod)",
  async execute(msg) {
    if (!isMod(msg)) return null;

    const args = msg.content.split(" ");
    const outcome = args[1]?.toLowerCase();
    if (outcome !== "evet" && outcome !== "hayır") {
      return `⚠️ Kullanım: !bahissonuc evet  veya  !bahissonuc hayır`;
    }

    const bet = await Bet.findOne({ status: { $in: ["open", "closed"] } });
    if (!bet) return `⚠️ Aktif bahis yok.`;

    const { evet, hayır } = bet.totals();
    const winnerTotal = outcome === "evet" ? evet : hayır;
    const loserTotal = outcome === "evet" ? hayır : evet;
    const pot = evet + hayır;

    bet.status = "settled";
    bet.outcome = outcome;
    bet.settledAt = new Date();
    await bet.save();

    if (pot === 0) {
      return `🏆 Sonuç: ${outcome.toUpperCase()} kazandı — ama kimse bahis yapmadı.`;
    }

    if (winnerTotal === 0) {
      // Kazanan tarafa kimse oynamamis, kaybedenlere iade
      for (const b of bet.bets) {
        const user = await UserScore.findOne({ userId: b.userId });
        if (user) {
          user.coins = (user.coins || 0) + b.amount;
          await user.save();
        }
      }
      return `🏆 Sonuç: ${outcome.toUpperCase()} kazandı — ama kazanan tarafta kimse yoktu. Tüm bahisler iade edildi.`;
    }

    // Pari-mutuel payout: her kazanan oraniyla havuzdan pay alir
    const winners = bet.bets.filter((b) => b.side === outcome);
    for (const w of winners) {
      const share = Math.floor((w.amount / winnerTotal) * pot);
      const user = await UserScore.findOne({ userId: w.userId });
      if (user) {
        user.coins = (user.coins || 0) + share;
        await user.save();
      }
    }

    const oran = (pot / winnerTotal).toFixed(2);
    return `🏆 Sonuç: ${outcome.toUpperCase()} kazandı! | Havuz: ${pot} 🪙 | Kazanan oran: x${oran} | ${winners.length} kişi kazandı, ${loserTotal} 🪙 paylaşıldı.`;
  },
};
