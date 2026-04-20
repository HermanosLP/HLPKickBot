const { getCurrentTrack } = require("../../utils/spotify");

module.exports = {
  name: "şarkı",
  description: "Yayinci su an Spotify'da ne dinliyor",
  async execute() {
    try {
      const track = await getCurrentTrack();

      if (!track) return "🎵 Şu an Spotify'da bir şey çalmıyor.";
      if (track.isAd) return "📻 Şu an reklam çalıyor, biraz bekle!";

      const status = track.isPlaying ? "🎵" : "⏸️";
      return `${status} ${track.name} — ${track.artists}`;
    } catch (err) {
      console.error("[Sarki] Hata:", err.message);
      return "🎵 Spotify bilgisi alınamadı, birazdan tekrar dene!";
    }
  },
};
