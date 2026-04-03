const panels = require("../../config/panels.json");

module.exports = {
  name: "kurallar",
  description: "Chat kurallarini gosterir",
  execute() {
    const emojis = ["💚", "🚫", "🛑", "🙏", "🎉"];
    const rules = panels.kurallar.map((r, i) => `${emojis[i]} ${i + 1}. ${r}`);
    return [
      `📜 ━━━ CHAT KURALLARI ━━━`,
      rules.join(" | "),
      `⚠️ Kurallara uymayanlara uyarı/ban uygulanır!`,
    ];
  },
};
