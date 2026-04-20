const UserScore = require("../../models/UserScore");

const MAX_LENGTH = 120;

function looksLikePhone(text) {
  const stripped = text.replace(/[\s\-().+]/g, "");
  return /\d{10,}/.test(stripped);
}

module.exports = {
  name: "iletisim",
  description: "Satın alımlarda kullanılacak Discord/email/iletişim bilgini kaydeder",
  async execute(msg) {
    const info = msg.content.split(" ").slice(1).join(" ").trim();
    if (!info) return null;
    if (info.length > MAX_LENGTH) return null;

    if (looksLikePhone(info)) {
      return `⚠️ ${msg.username}, telefon numarası kabul edilmiyor. Email veya Discord kullanıcı adı kaydet (örn: !iletisim kullanici#1234).`;
    }

    const userId = String(msg.userId);
    await UserScore.findOneAndUpdate(
      { userId },
      { $set: { contact: info, username: msg.username } },
      { upsert: true, new: true }
    );

    console.log(`[Iletisim] ${msg.username} iletisim kaydetti: ${info}`);
    return null;
  },
};
