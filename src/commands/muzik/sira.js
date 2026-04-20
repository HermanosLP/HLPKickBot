const { getQueue } = require("../../utils/spotify");

const SHOW_COUNT = 3;

module.exports = {
  name: "sıra",
  description: "Siradaki sarkilari gosterir",
  async execute() {
    try {
      const { currentlyPlaying, queue } = await getQueue();

      const nowLine = currentlyPlaying
        ? `🎵 Şimdi: ${currentlyPlaying.name} — ${(currentlyPlaying.artists || []).map((a) => a.name).join(", ")}`
        : "🎵 Şu an bir şey çalmıyor.";

      if (!queue.length) {
        return `${nowLine} | Sıra boş, !iste ile şarkı ekle.`;
      }

      const items = queue.slice(0, SHOW_COUNT).map((t, i) => {
        const artists = (t.artists || []).map((a) => a.name).join(", ");
        return `${i + 1}) ${t.name} — ${artists}`;
      });

      const more = queue.length > SHOW_COUNT ? ` (+${queue.length - SHOW_COUNT} daha)` : "";
      return `${nowLine} | Sıra: ${items.join(" · ")}${more}`;
    } catch (err) {
      console.error("[Sira] Hata:", err.message);
      return "🎵 Sıra alınamadı, birazdan tekrar dene.";
    }
  },
};
