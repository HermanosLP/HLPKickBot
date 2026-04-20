const Product = require("../../models/Product");

const COOLDOWN_MS = 60 * 1000;
let lastUsedAt = 0;

module.exports = {
  name: "magaza",
  description: "Mağazadaki ürünleri listeler (60 sn global cooldown)",
  async execute(msg) {
    const now = Date.now();
    if (now - lastUsedAt < COOLDOWN_MS) return null;
    lastUsedAt = now;

    const products = await Product.find().sort({ productId: 1 }).limit(20);
    if (!products.length) {
      return `🛒 Mağaza boş. Yayıncı yakında ürün ekleyecek!`;
    }

    const lines = products.map((p) => `#${p.productId} ${p.name} — ${p.price} 🪙`);
    return [`🛒 MAĞAZA (satın almak için: !satinal <id>)`, ...lines];
  },
};
