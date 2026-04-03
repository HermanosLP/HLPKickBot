let kickClient = null;
const broadcasterId = process.env.KICK_CHANNEL_ID;

module.exports = {
  name: "uptime",
  description: "Yayinin ne kadar suredir acik oldugunu gosterir",
  setClient(client) {
    kickClient = client;
  },
  async execute() {
    try {
      const res = await kickClient.livestreams.getLivestreams({
        broadcaster_user_id: [broadcasterId],
      });

      const stream = res?.data?.[0];

      if (!stream) {
        return "⏱️ Yayın şu an kapalı, açılınca görüşürüz!";
      }

      const start = new Date(stream.started_at);
      const diff = Date.now() - start.getTime();

      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);

      const parts = [];
      if (hours > 0) parts.push(`${hours} saat`);
      parts.push(`${minutes} dakika`);

      return `⏱️ Yayın ${parts.join(" ")}dır açık!`;
    } catch (err) {
      console.error("[Uptime] API hatasi:", err.message);
      return "⏱️ Uptime bilgisi alınamadı, birazdan tekrar dene!";
    }
  },
};
