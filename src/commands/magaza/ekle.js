const Product = require("../../models/Product");
const { isMod } = require("../../utils/modCheck");

module.exports = {
  name: "ekle",
  description: "Mağazaya ürün ekler (sadece yayıncı/mod). Kullanım: !ekle <ad> <fiyat>",
  async execute(msg) {
    if (!isMod(msg)) return null;

    const args = msg.content.split(" ").slice(1);
    if (args.length < 2) {
      return `⚠️ Kullanım: !ekle <ürün adı> <fiyat>  —  Örn: !ekle Valorant 850 VP 5000`;
    }

    const priceArg = args[args.length - 1];
    const price = parseInt(priceArg);
    if (isNaN(price) || price <= 0) {
      return `⚠️ Fiyat pozitif bir sayı olmalı (son argüman). Örn: !ekle Valorant 850 VP 5000`;
    }

    const name = args.slice(0, -1).join(" ").trim();
    if (!name) return `⚠️ Ürün adı boş olamaz.`;

    const existing = await Product.findOne({
      name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    });
    if (existing) {
      return `⚠️ "${name}" zaten var (#${existing.productId} — ${existing.price} 🪙).`;
    }

    const productId = await Product.nextId();
    const product = new Product({
      productId,
      name,
      price,
      createdBy: msg.username,
    });
    await product.save();

    return `✅ Ürün eklendi: #${productId} ${name} — ${price} 🪙`;
  },
};
