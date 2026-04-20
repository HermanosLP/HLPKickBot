const { loadToken } = require("../auth");

const API_BASE = "https://api.kick.com/public/v1";

function getAuthHeaders() {
  const token = loadToken();
  const accessToken = token?.accessToken || token?.access_token;
  if (!accessToken) throw new Error("Auth token bulunamadi");
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

async function listSubscriptions() {
  const res = await fetch(`${API_BASE}/events/subscriptions`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`List subscriptions ${res.status}: ${err}`);
  }
  return res.json();
}

async function createFollowSubscription(broadcasterId) {
  const res = await fetch(`${API_BASE}/events/subscriptions`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      broadcaster_user_id: Number(broadcasterId),
      method: "webhook",
      events: [{ name: "channel.followed", version: 1 }],
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Create subscription ${res.status}: ${err}`);
  }
  return res.json();
}

async function ensureFollowSubscription(broadcasterId) {
  const existing = await listSubscriptions();
  const subs = existing?.data || [];
  const hasFollow = subs.some(
    (s) => (s.event || s.name) === "channel.followed"
  );

  if (hasFollow) {
    console.log("[Events] channel.followed aboneligi mevcut.");
    return;
  }

  const created = await createFollowSubscription(broadcasterId);
  console.log("[Events] channel.followed aboneligi olusturuldu.");
  return created;
}

module.exports = { listSubscriptions, createFollowSubscription, ensureFollowSubscription };
