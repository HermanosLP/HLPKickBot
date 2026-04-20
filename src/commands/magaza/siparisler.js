const Purchase = require("../../models/Purchase");

module.exports = {
  name: "siparisler",
  description: "Son 10 siparişi gösterir (herkese açık, kanıt için)",
  async execute(msg) {
    const purchases = await Purchase.find().sort({ purchasedAt: -1 }).limit(10);
    if (!purchases.length) return `📜 Henüz hiç sipariş yok.`;

    const lines = purchases.map((p) => {
      const d = p.purchasedAt;
      const date = `${d.getDate().toString().padStart(2, "0")}.${(d.getMonth() + 1).toString().padStart(2, "0")} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
      return `${date} | ${p.username} → ${p.productName} (${p.price} 🪙)`;
    });

    return [`📜 SON 10 SİPARİŞ:`, ...lines];
  },
};
