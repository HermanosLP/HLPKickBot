const Bet = require("../../models/Bet");
const UserScore = require("../../models/UserScore");
const eventBus = require("../../events/EventBus");

const MIN_BET = 150;
const MAX_TOTAL = 2000;

async function placeBet(msg, side) {
  const args = msg.content.split(" ");
  const amount = parseInt(args[1]);
  if (isNaN(amount) || amount <= 0) {
    return `⚠️ Kullanım: !${side} <coin>  (Min: ${MIN_BET} / Max toplam: ${MAX_TOTAL})`;
  }
  if (amount < MIN_BET) {
    return `⚠️ ${msg.username}, minimum bahis ${MIN_BET} coin.`;
  }

  const bet = await Bet.findOne({ status: { $in: ["open", "closed"] } });
  if (!bet) return `⚠️ Aktif bahis yok.`;

  if (bet.status === "closed" || new Date() > bet.closesAt) {
    if (bet.status === "open") {
      await Bet.updateOne({ _id: bet._id, status: "open" }, { status: "closed" });
    }
    return `⏰ Bahis kapandı, yeni oy alınmıyor. Sonuç bekleniyor.`;
  }

  const userId = String(msg.userId);
  const userTotals = bet.totals().userTotals.get(userId);
  if (userTotals && userTotals.side !== side) {
    return `⚠️ ${msg.username}, zaten "${userTotals.side}" tarafına bahis yaptın, taraf değiştiremezsin.`;
  }

  const currentTotal = userTotals ? userTotals.amount : 0;
  if (currentTotal + amount > MAX_TOTAL) {
    const kalan = MAX_TOTAL - currentTotal;
    return `⚠️ ${msg.username}, toplamın ${MAX_TOTAL}'i geçemez (şu an ${currentTotal}, maks ${kalan} daha koyabilirsin).`;
  }

  // Atomik: coini cuzdandan dus (yeterli degilse reddet)
  const deducted = await UserScore.findOneAndUpdate(
    { userId, coins: { $gte: amount } },
    { $inc: { coins: -amount } },
    { new: true }
  );
  if (!deducted) {
    const current = await UserScore.findOne({ userId });
    return `⚠️ ${msg.username}, yeterli coinin yok (${current?.coins || 0} var, ${amount} lazım).`;
  }

  // Atomik: bahsi ekle (race-safe, concurrent bahisleri kaybetmez)
  await Bet.updateOne(
    { _id: bet._id, status: "open" },
    { $push: { bets: { userId, username: msg.username, side, amount } } }
  );

  const newTotal = currentTotal + amount;

  // Event icin guncel toplamlari yeniden oku
  try {
    const fresh = await Bet.findById(bet._id);
    if (fresh) {
      const t = fresh.totals();
      eventBus.emit("bet:update", {
        betId: String(fresh._id),
        question: fresh.question,
        closesAt: fresh.closesAt.toISOString(),
        evet: t.evet,
        hayır: t.hayır,
        evetCount: t.evetCount,
        hayırCount: t.hayırCount,
        lastBet: { username: msg.username, side, amount },
      });
    }
  } catch (_) {}

  return `✅ ${msg.username} "${side}" tarafına ${amount} 🪙 koydu (toplamın: ${newTotal}/${MAX_TOTAL}).`;
}

module.exports = {
  name: "evet",
  description: "Aktif bahise Evet tarafına coin koyar",
  async execute(msg) {
    return placeBet(msg, "evet");
  },
  placeBet,
};
