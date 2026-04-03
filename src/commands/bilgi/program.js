const panels = require("../../config/panels.json");

module.exports = {
  name: "program",
  description: "Yayin programini gosterir",
  execute() {
    const { gunler, saat } = panels.program;
    return [
      `🗓️ ━━━ YAYIN PROGRAMI ━━━`,
      `📅 ${gunler} | 🕙 ${saat} | 🔴 Takipte kal, kaçırma!`,
    ];
  },
};
