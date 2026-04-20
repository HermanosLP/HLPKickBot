const Product = require("../../models/Product");
const { isMod } = require("../../utils/modCheck");

module.exports = {
  name: "sil",
  description: "Ürünü mağazadan siler (sadece yayıncı/mod). Kullanım: !sil <id>",
  async execute(msg) {
    if (!isMod(msg)) return null;

    const args = msg.content.split(" ").slice(1);
    const id = parseInt(args[0]);
    if (isNaN(id)) return `⚠️ Kullanım: !sil <id>  —  Örn: !sil 2`;

    const product = await Product.findOneAndDelete({ productId: id });
    if (!product) return `⚠️ #${id} ID'li ürün bulunamadı.`;

    return `✅ Silindi: #${product.productId} ${product.name}`;
  },
};
