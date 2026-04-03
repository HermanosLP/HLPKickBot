const fs = require("fs");
const path = require("path");

const PREFIX = "!";

function loadCommands() {
  const commands = new Map();
  const commandsDir = path.join(__dirname, "commands");

  function scanDir(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanDir(fullPath);
      } else if (entry.name.endsWith(".js")) {
        const cmd = require(fullPath);
        const category = path.relative(commandsDir, dir) || "genel";
        commands.set(cmd.name, cmd);
        console.log(`[Komut] ${PREFIX}${cmd.name} yuklendi (${category})`);
      }
    }
  }

  scanDir(commandsDir);
  return commands;
}

async function handleMessage(commands, content, msg) {
  if (!content.startsWith(PREFIX)) return null;

  const commandName = content.slice(PREFIX.length).split(" ")[0].toLowerCase();
  const cmd = commands.get(commandName);

  if (!cmd) return null;
  return await cmd.execute(msg);
}

module.exports = { loadCommands, handleMessage };
