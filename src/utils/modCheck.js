const MOD_BADGES = new Set(["broadcaster", "moderator"]);

function isMod(msg) {
  if (!Array.isArray(msg?.badges)) return false;
  return msg.badges.some((b) => MOD_BADGES.has(b?.type));
}

module.exports = { isMod };
