const fs = require("fs");
const path = require("path");

module.exports = {
  name: "komutlar",
  description: "Tum komutlari listeler",
  execute() {
    const commandsDir = path.join(__dirname, "..");
    const cmds = [];

    function scanDir(dir) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (entry.name.endsWith(".js")) {
          const cmd = require(fullPath);
          cmds.push(`!${cmd.name}`);
        }
      }
    }

    scanDir(commandsDir);
    return `📋 ━━━ KOMUTLAR ━━━ ${cmds.join(" | ")}`;
  },
};
