const panels = require("../../config/panels.json");

module.exports = {
  name: "specs",
  description: "PC ozelliklerini gosterir",
  execute() {
    const s = panels.specs;
    return [
      `🖥️ ━━━ PC SPECS ━━━`,
      `⚡ CPU: ${s.CPU} | 🎮 GPU: ${s.GPU} | 💾 RAM: ${s.RAM} | 💿 SSD: ${s.SSD}`,
      `🧩 Anakart: ${s.Anakart} | 🖥️ Monitör: ${s["Monitör"]}`,
      `🎧 Kulaklık: ${s["Kulaklık"]} | 🎙️ Mikrofon: ${s.Mikrofon}`,
    ];
  },
};
