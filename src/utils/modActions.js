const { loadToken } = require("../auth");

const API_BASE = "https://api.kick.com/public/v1";

async function sendBanRequest({ broadcasterId, userId, duration, reason }) {
  const token = loadToken();
  const accessToken = token?.accessToken || token?.access_token;
  if (!accessToken) throw new Error("Auth token bulunamadi");

  const body = {
    broadcaster_user_id: Number(broadcasterId),
    user_id: Number(userId),
    reason: reason || "Kural ihlali",
  };
  if (duration !== null && duration !== undefined) {
    body.duration = duration;
  }

  const res = await fetch(`${API_BASE}/moderation/bans`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Mod API ${res.status}: ${errText}`);
  }
  return res.json().catch(() => ({}));
}

function timeoutUser({ broadcasterId, userId, minutes, reason }) {
  return sendBanRequest({ broadcasterId, userId, duration: minutes, reason });
}

function permanentBan({ broadcasterId, userId, reason }) {
  return sendBanRequest({ broadcasterId, userId, duration: null, reason });
}

module.exports = { timeoutUser, permanentBan };
