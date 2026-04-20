const fs = require("fs");
const path = require("path");
const { getTrackInfo, parseTrackId, getCurrentTrack } = require("../../utils/spotify");

const ALLOWED_BADGES = ["broadcaster", "moderator"];
const BANNED_PATH = path.join(__dirname, "..", "..", "config", "bannedTracks.json");

function hasPermission(badges) {
  if (!Array.isArray(badges)) return false;
  return badges.some((b) => ALLOWED_BADGES.includes(b?.type));
}

function loadBanned() {
  try {
    return JSON.parse(fs.readFileSync(BANNED_PATH, "utf8"));
  } catch {
    return { tracks: [], artists: [] };
  }
}

function saveBanned(data) {
  fs.writeFileSync(BANNED_PATH, JSON.stringify(data, null, 2));
}

module.exports = {
  name: "banşarkı",
  description: "Sarkiyi yasakli listeye ekler (mod). Argumansiz calanti yasaklar.",
  async execute(msg) {
    if (!hasPermission(msg.badges)) {
      return `⛔ ${msg.username}, bu komut sadece moderatör ve yayıncıya özel.`;
    }

    const parts = msg.content.trim().split(/\s+/);
    const link = parts[1];

    let trackId = null;
    let displayName = null;

    try {
      if (link) {
        trackId = parseTrackId(link);
        if (!trackId) return "🔒 Geçersiz link. Kullanım: !banşarkı [Spotify Şarkı Linki] (boş bırakırsan çalanı yasaklar)";
      } else {
        const current = await getCurrentTrack();
        if (!current || current.isAd) return "🔒 Şu an yasaklanacak bir şarkı çalmıyor.";
        const url = current.url || "";
        trackId = parseTrackId(url);
        displayName = `${current.name} — ${current.artists}`;
        if (!trackId) return "🔒 Çalan şarkının ID'si alınamadı.";
      }

      const banned = loadBanned();
      if (banned.tracks.includes(trackId)) {
        return `🔒 Bu şarkı zaten yasaklı listesinde (${displayName || trackId}).`;
      }

      banned.tracks.push(trackId);
      saveBanned(banned);

      if (!displayName) {
        try {
          const info = await getTrackInfo(trackId);
          displayName = `${info.name} — ${(info.artists || []).map((a) => a.name).join(", ")}`;
        } catch {
          displayName = trackId;
        }
      }

      return `🔒 Şarkı yasaklandı: ${displayName}`;
    } catch (err) {
      console.error("[BanSarki] Hata:", err.message);
      return "🔒 İşlem başarısız, birazdan tekrar dene.";
    }
  },
};
