let kickClient = null;
const broadcasterId = process.env.KICK_CHANNEL_ID;

module.exports = {
  name: "oyun",
  description: "Su an oynanan oyunu gosterir",
  setClient(client) {
    kickClient = client;
  },
  async execute() {
    try {
      const res = await kickClient.channels.getChannels({
        broadcaster_user_id: [broadcasterId],
      });

      const channel = res?.data?.[0];
      const category = channel?.stream?.category_name;

      if (!category) {
        return "🎮 Yayın şu an kapalı, açılınca burada oyun bilgisi görünecek!";
      }

      return `🎮 Şu an oynanan ➜ ${category}`;
    } catch (err) {
      console.error("[Oyun] API hatasi:", err.message);
      return "🎮 Oyun bilgisi alınamadı, birazdan tekrar dene!";
    }
  },
};
