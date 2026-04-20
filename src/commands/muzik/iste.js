const fs = require("fs");
const path = require("path");
const { getTrackInfo, addToQueue, parseTrackId } = require("../../utils/spotify");
const UserScore = require("../../models/UserScore");
const { isLive } = require("../../utils/streamStatus");
const { registerRequest } = require("../../utils/songRequests");

const SONG_COST = 400;
const MIN_LEVEL = 3;
const COOLDOWN_MS = 10 * 60 * 1000;
const MAX_DURATION_MS = 10 * 60 * 1000;
const BANNED_PATH = path.join(__dirname, "..", "..", "config", "bannedTracks.json");

function loadBanned() {
  try {
    return JSON.parse(fs.readFileSync(BANNED_PATH, "utf8"));
  } catch {
    return { tracks: [], artists: [] };
  }
}

module.exports = {
  name: "iste",
  description: "100 coinle siraya sarki ekler (Seviye 10+, cooldown 10 dk)",
  async execute(msg) {
    if (!isLive()) return "🎵 Yayın kapalıyken şarkı isteyemezsin!";

    const parts = msg.content.trim().split(/\s+/);
    const link = parts[1];
    if (!link) {
      return `🎵 Kullanım: !iste [Spotify Şarkı Linki] | ${SONG_COST} 🪙, Seviye ${MIN_LEVEL}+, 10 dk cooldown`;
    }

    const trackId = parseTrackId(link);
    if (!trackId) return "🎵 Geçersiz Spotify şarkı linki. Örn: https://open.spotify.com/track/...";

    const user = await UserScore.findOne({ userId: msg.userId });
    if (!user) return "🎵 Henüz profilin yok, önce chat'e mesaj at.";

    if (user.level < MIN_LEVEL) {
      return `🎵 Şarkı isteyebilmek için Seviye ${MIN_LEVEL}+ olmalısın (Şu an ⭐${user.level}).`;
    }
    if ((user.coins || 0) < SONG_COST) {
      return `🎵 Yetersiz coin! Gerekli: ${SONG_COST} 🪙, elindeki: ${user.coins || 0} 🪙.`;
    }

    const now = Date.now();
    const lastReq = user.lastSongRequestAt ? new Date(user.lastSongRequestAt).getTime() : 0;
    if (now - lastReq < COOLDOWN_MS) {
      const leftMin = Math.ceil((COOLDOWN_MS - (now - lastReq)) / 60000);
      return `🎵 Son isteğinden sonra ${leftMin} dk daha bekle.`;
    }

    const banned = loadBanned();
    if (banned.tracks.includes(trackId)) {
      return "🎵 Bu şarkı yasaklı, başka bir şey iste.";
    }

    try {
      const info = await getTrackInfo(trackId);
      const artistIds = (info.artists || []).map((a) => a.id);
      if (artistIds.some((id) => banned.artists.includes(id))) {
        return "🎵 Bu sanatçı yasaklı, başka bir şarkı iste.";
      }

      if ((info.duration_ms || 0) > MAX_DURATION_MS) {
        const mins = Math.round(info.duration_ms / 60000);
        return `🎵 Şarkı çok uzun (${mins} dk). Max ${MAX_DURATION_MS / 60000} dakikalık şarkılar istenebilir. Coinin kesilmedi.`;
      }

      await addToQueue(`spotify:track:${trackId}`);

      user.coins -= SONG_COST;
      user.lastSongRequestAt = new Date();
      await user.save();

      registerRequest(trackId, msg.username);

      const name = info.name;
      const artists = (info.artists || []).map((a) => a.name).join(", ");
      return `✅ ${msg.username} sıraya ekledi: 🎵 ${name} — ${artists} (-${SONG_COST} 🪙)`;
    } catch (err) {
      console.error("[Iste] Hata:", err.message);
      if (err.status === 404) return "🎵 Spotify'da aktif oynatıcı bulunamadı (yayıncının Spotify'ı açık mı?).";
      if (err.status === 403) return "🎵 Spotify Premium gerekli veya izin reddedildi.";
      return "🎵 Şarkı eklenemedi, birazdan tekrar dene.";
    }
  },
};
