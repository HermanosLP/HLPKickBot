const Product = require("../../models/Product");
const { isMod } = require("../../utils/modCheck");

module.exports = {
  name: "duzenle",
  description: "Ürünü günceller (mod). Kullanım: !duzenle <id> <yeni ad> <yeni fiyat>",
  async execute(msg) {
    if (!isMod(msg)) return null;

    const args = msg.content.split(" ").slice(1);
    if (args.length < 3) {
      return `⚠️ Kullanım: !duzenle <id> <yeni ad> <yeni fiyat>  —  Örn: !duzenle 0 Valorant 1700 VP 10000`;
    }

    const id = parseInt(args[0]);
    if (isNaN(id)) return `⚠️ Geçersiz ID. Örn: !duzenle 0 Valorant 850 VP 5000`;

    const price = parseInt(args[args.length - 1]);
    if (isNaN(price) || price <= 0) {
      return `⚠️ Fiyat pozitif bir sayı olmalı (son argüman).`;
    }

    const name = args.slice(1, -1).join(" ").trim();
    if (!name) return `⚠️ Ürün adı boş olamaz.`;

    const product = await Product.findOne({ productId: id });
    if (!product) return `⚠️ #${id} ID'li ürün bulunamadı.`;

    // Farkli ID'de ayni isim var mi kontrol et (cakisma engeli)
    const conflict = await Product.findOne({
      productId: { $ne: id },
      name: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
    });
    if (conflict) {
      return `⚠️ "${name}" zaten başka bir üründe var (#${conflict.productId}).`;
    }

    const oldName = product.name;
    const oldPrice = product.price;
    product.name = name;
    product.price = price;
    await product.save();

    return `✅ #${id} güncellendi: "${oldName}" (${oldPrice} 🪙) → "${name}" (${price} 🪙)`;
  },
};
