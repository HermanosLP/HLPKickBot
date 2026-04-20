let cachedIsLive = false;
let lastCheckedAt = 0;

async function pollStreamStatus(kickClient, broadcasterId) {
  try {
    const streams = await kickClient.livestreams.getLivestreams({
      broadcaster_user_id: [broadcasterId],
    });
    cachedIsLive = !!streams?.data?.length;
    lastCheckedAt = Date.now();
  } catch (err) {
    console.error("[StreamStatus] Poll hatasi:", err.message);
  }
}

function startStreamPolling(kickClient, broadcasterId, intervalMs = 60 * 1000) {
  pollStreamStatus(kickClient, broadcasterId);
  setInterval(() => pollStreamStatus(kickClient, broadcasterId), intervalMs);
  console.log(`[StreamStatus] Polling baslatildi (${intervalMs / 1000}sn).`);
}

function isLive() {
  if (process.env.BYPASS_LIVE_CHECK === "true") return true;
  return cachedIsLive;
}

module.exports = { startStreamPolling, isLive };
