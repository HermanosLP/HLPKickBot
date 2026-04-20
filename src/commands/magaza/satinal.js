const Product = require("../../models/Product");
const Purchase = require("../../models/Purchase");
const UserScore = require("../../models/UserScore");
const { sendPurchaseWebhook } = require("../../utils/discordWebhook");

module.exports = {
  name: "satinal",
  description: "Mağazadan ürün satın alır. Kullanım: !satinal <id veya ad>",
  async execute(msg) {
    const args = msg.content.split(" ").slice(1);
    if (!args.length) return `⚠️ Kullanım: !satinal <id veya ürün adı>  —  Liste için !magaza`;

    const input = args.join(" ").trim();
    const product = await Product.findByIdOrName(input);
    if (!product) {
      return `⚠️ "${input}" bulunamadı. Mağazayı görmek için !magaza yaz.`;
    }

    const userId = String(msg.userId);

    // Once iletisim bilgisi kayitli mi kontrol et
    const existing = await UserScore.findOne({ userId });
    if (!existing?.contact) {
      return `⚠️ ${msg.username}, satın almadan önce iletişim bilgini kaydet: !iletisim <Discord kullanıcı adın>`;
    }

    // Atomik: yeterli coin varsa dus, yoksa null doner
    const deducted = await UserScore.findOneAndUpdate(
      { userId, coins: { $gte: product.price } },
      { $inc: { coins: -product.price }, $set: { username: msg.username } },
      { new: true }
    );

    if (!deducted) {
      const current = await UserScore.findOne({ userId });
      const have = current?.coins || 0;
      return `⚠️ ${msg.username}, yeterli coinin yok. Gerekli: ${product.price} 🪙 / Sende: ${have} 🪙`;
    }

    const purchase = new Purchase({
      userId,
      username: msg.username,
      productId: product.productId,
      productName: product.name,
      price: product.price,
    });
    await purchase.save();

    sendPurchaseWebhook({
      username: msg.username,
      userId,
      productId: product.productId,
      productName: product.name,
      price: product.price,
      remainingCoins: deducted.coins,
      contact: deducted.contact || "Belirtilmemiş",
    }).catch((err) => console.error("[Satinal] Webhook hata:", err.message));

    return `🛒 ${msg.username}, "${product.name}" satın alındı! -${product.price} 🪙 | Kalan: ${deducted.coins} 🪙 | Yayıncı siparişini Discord'da görecek.`;
  },
};
