const Bet = require("../../models/Bet");
const { isMod } = require("../../utils/modCheck");
const eventBus = require("../../events/EventBus");

const BET_DURATION_MS = 5 * 60 * 1000;

module.exports = {
  name: "bahis",
  description: "Yeni bahis başlatır (sadece yayıncı/mod)",
  async execute(msg) {
    if (!isMod(msg)) return null;

    const args = msg.content.split(" ").slice(1).join(" ").trim();
    if (!args) {
      return "⚠️ Kullanım: !bahis <soru>  —  Örn: !bahis Bu maçı kazanır mıyım?";
    }

    const active = await Bet.findOne({ status: { $in: ["open", "closed"] } });
    if (active) {
      return `⚠️ Zaten aktif bir bahis var: "${active.question}" — Önce !bahissonuc veya !bahisiptal`;
    }

    const bet = new Bet({
      question: args,
      createdBy: msg.username,
      closesAt: new Date(Date.now() + BET_DURATION_MS),
    });
    await bet.save();

    eventBus.emit("bet:open", {
      betId: String(bet._id),
      question: bet.question,
      createdBy: bet.createdBy,
      createdAt: bet.createdAt.toISOString(),
      closesAt: bet.closesAt.toISOString(),
      evet: 0,
      hayır: 0,
      evetCount: 0,
      hayırCount: 0,
    });

    return `🎲 YENİ BAHİS: "${args}" | 5 dk süren var! | !evet <coin> veya !hayır <coin> (Min: 150 / Max toplam: 2000)`;
  },
};
