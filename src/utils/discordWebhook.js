async function sendPurchaseWebhook({ username, userId, productId, productName, price, remainingCoins, contact }) {
  const url = process.env.DISCORD_ORDER_WEBHOOK_URL;
  if (!url) {
    console.warn("[DiscordWebhook] DISCORD_ORDER_WEBHOOK_URL tanimli degil, bildirim gonderilmiyor.");
    return;
  }

  const body = {
    username: "HLPBOT Siparişler",
    embeds: [
      {
        title: "🛒 Yeni Sipariş",
        color: 0x00ff99,
        fields: [
          { name: "Kullanıcı", value: `${username}`, inline: true },
          { name: "Kick User ID", value: String(userId), inline: true },
          { name: "Ürün ID", value: String(productId), inline: true },
          { name: "Ürün", value: productName, inline: false },
          { name: "Fiyat", value: `${price} 🪙`, inline: true },
          { name: "Kalan Bakiye", value: `${remainingCoins} 🪙`, inline: true },
          { name: "📩 İletişim", value: contact || "Belirtilmemiş", inline: false },
        ],
        timestamp: new Date().toISOString(),
      },
    ],
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[DiscordWebhook] ${res.status}: ${text}`);
    }
  } catch (err) {
    console.error("[DiscordWebhook] Gonderim hatasi:", err.message);
  }
}

module.exports = { sendPurchaseWebhook };
