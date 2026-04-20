const UserScore = require("../../models/UserScore");

const ALLOWED_BADGES = ["broadcaster", "moderator"];

function hasPermission(badges) {
  if (!Array.isArray(badges)) return false;
  return badges.some((b) => ALLOWED_BADGES.includes(b?.type));
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = {
  name: "reset-offense",
  description: "Bir kullanicinin link ihlal sayacini sifirlar (sadece mod/broadcaster)",
  async execute(msg) {
    if (!hasPermission(msg.badges)) {
      return `⛔ ${msg.username}, bu komut sadece moderatör ve yayıncıya özel.`;
    }

    const parts = msg.content.trim().split(/\s+/);
    if (parts.length < 2) {
      return `ℹ️ Kullanım: !reset-offense @kullaniciadi`;
    }

    const target = parts[1].replace(/^@/, "").toLowerCase();
    if (!target) {
      return `ℹ️ Kullanım: !reset-offense @kullaniciadi`;
    }

    const user = await UserScore.findOne({
      username: { $regex: `^${escapeRegex(target)}$`, $options: "i" },
    });

    if (!user) {
      return `❓ "${target}" kullanıcısı veritabanında bulunamadı.`;
    }

    const prevCount = user.linkOffenses;
    user.linkOffenses = 0;
    user.lastLinkOffenseAt = null;
    await user.save();

    return `✅ ${user.username} için ihlal sayacı sıfırlandı (eski: ${prevCount}). Bir sonraki linkte uyarı adımından başlayacak.`;
  },
};
