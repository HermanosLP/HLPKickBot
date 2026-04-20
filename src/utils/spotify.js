const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.SPOTIFY_REFRESH_TOKEN;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

let cachedToken = null;
let tokenExpiresAt = 0;
let tokenAlertSent = false;

async function notifyTokenFailure(reason) {
  const msg = `[Spotify] Refresh token gecersiz! Sebep: ${reason}. spotifyAuth.js ile yeniden auth yap.`;
  console.error("🚨 " + msg);

  if (!DISCORD_WEBHOOK_URL || tokenAlertSent) return;

  try {
    await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "🚨 " + msg }),
    });
    tokenAlertSent = true;
  } catch (err) {
    console.error("[Spotify] Discord webhook gonderilemedi:", err.message);
  }
}

async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt - 60_000) return cachedToken;

  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    throw new Error("Spotify .env degerleri eksik (CLIENT_ID/SECRET/REFRESH_TOKEN).");
  }

  const creds = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${creds}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: REFRESH_TOKEN,
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    if (data.error === "invalid_grant") {
      await notifyTokenFailure("refresh_token revoke edilmis (invalid_grant)");
      throw new Error("Spotify refresh token gecersiz, yeniden auth gerekli.");
    }
    throw new Error(`Spotify token yenilenemedi: ${data.error_description || data.error || res.status}`);
  }

  cachedToken = data.access_token;
  tokenExpiresAt = now + data.expires_in * 1000;
  tokenAlertSent = false;
  return cachedToken;
}

async function spotifyFetch(url, options = {}, retry = true) {
  const token = await getAccessToken();
  const res = await fetch(url, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` },
  });

  if (res.status === 429 && retry) {
    const retryAfter = parseInt(res.headers.get("Retry-After") || "2", 10);
    const waitMs = Math.min(Math.max(retryAfter, 1) * 1000, 10_000);
    console.warn(`[Spotify] 429 rate limit, ${waitMs}ms bekleniyor...`);
    await new Promise((r) => setTimeout(r, waitMs));
    return spotifyFetch(url, options, false);
  }

  if (res.status === 401 && retry) {
    cachedToken = null;
    tokenExpiresAt = 0;
    return spotifyFetch(url, options, false);
  }

  return res;
}

async function getCurrentTrack() {
  const res = await spotifyFetch("https://api.spotify.com/v1/me/player/currently-playing");

  if (res.status === 204) return null;
  if (!res.ok) throw new Error(`Spotify API ${res.status}`);

  const data = await res.json();
  if (!data || !data.item) return null;
  if (data.currently_playing_type === "ad") return { isAd: true };

  const item = data.item;
  return {
    isAd: false,
    isPlaying: data.is_playing,
    id: item.id,
    name: item.name,
    artists: item.artists.map((a) => a.name).join(", "),
    url: item.external_urls?.spotify,
    albumArt: item.album?.images?.[0]?.url || null,
    progressMs: data.progress_ms || 0,
    durationMs: item.duration_ms || 0,
  };
}

async function getQueue() {
  const res = await spotifyFetch("https://api.spotify.com/v1/me/player/queue");
  if (res.status === 204) return { currentlyPlaying: null, queue: [] };
  if (!res.ok) throw new Error(`Spotify queue ${res.status}`);
  const data = await res.json();
  return {
    currentlyPlaying: data.currently_playing || null,
    queue: Array.isArray(data.queue) ? data.queue : [],
  };
}

async function getTrackInfo(trackId) {
  const res = await spotifyFetch(`https://api.spotify.com/v1/tracks/${trackId}`);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Spotify track info ${res.status}: ${body.slice(0, 200)}`);
  }
  return await res.json();
}

async function addToQueue(trackUri) {
  const url = `https://api.spotify.com/v1/me/player/queue?uri=${encodeURIComponent(trackUri)}`;
  const res = await spotifyFetch(url, { method: "POST" });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const err = new Error(`Spotify queue ${res.status}: ${body.slice(0, 200)}`);
    err.status = res.status;
    throw err;
  }
}

function parseTrackId(link) {
  if (!link || typeof link !== "string") return null;
  const m = link.match(/(?:open\.spotify\.com\/track\/|spotify:track:)([a-zA-Z0-9]{22})/);
  return m ? m[1] : null;
}

module.exports = { getCurrentTrack, getQueue, getTrackInfo, addToQueue, parseTrackId };
