const express = require("express");
const crypto = require("crypto");
const path = require("path");
const { getCurrentTrack, getQueue } = require("./utils/spotify");
const { getRequester } = require("./utils/songRequests");
const { attachWSServer, BROADCAST_EVENTS } = require("./events/WSServer");
const eventBus = require("./events/EventBus");
const Bet = require("./models/Bet");
const Boss = require("./models/Boss");

let kickPublicKey = null;

async function fetchKickPublicKey() {
  const res = await fetch("https://api.kick.com/public/v1/public-key");
  if (!res.ok) throw new Error(`Public key fetch ${res.status}`);
  const json = await res.json();
  const pk = json?.data?.public_key || json?.public_key;
  if (!pk) throw new Error("Public key yaniti beklenen sekilde degil: " + JSON.stringify(json).slice(0, 200));
  return pk;
}

function verifySignature(headers, rawBody) {
  const messageId = headers["kick-event-message-id"];
  const timestamp = headers["kick-event-message-timestamp"];
  const signature = headers["kick-event-signature"];
  if (!messageId || !timestamp || !signature || !kickPublicKey) return false;

  const signedPayload = `${messageId}.${timestamp}.${rawBody.toString("utf8")}`;
  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(signedPayload);
  verifier.end();
  try {
    return verifier.verify(kickPublicKey, signature, "base64");
  } catch (err) {
    console.error("[Webhook] Imza dogrulama hatasi:", err.message);
    return false;
  }
}

async function startWebhookServer({ port = 3000, onFollow }) {
  kickPublicKey = await fetchKickPublicKey();
  console.log("[Webhook] Kick public key alindi.");

  const app = express();

  app.use("/assets", express.static(path.join(__dirname, "overlay", "assets"), {
    maxAge: "1d",
    fallthrough: false,
  }));

  app.get("/webhook/health", (req, res) => res.status(200).send("OK"));

  app.get("/overlay/now-playing", (req, res) => {
    res.sendFile(path.join(__dirname, "overlay", "nowPlaying.html"));
  });

  app.get("/overlay/alerts", (req, res) => {
    res.sendFile(path.join(__dirname, "overlay", "alerts.html"));
  });

  app.get("/overlay/bet", (req, res) => {
    res.sendFile(path.join(__dirname, "overlay", "bet.html"));
  });

  app.get("/overlay/boss", (req, res) => {
    res.sendFile(path.join(__dirname, "overlay", "boss.html"));
  });

  app.get("/api/boss/current", async (req, res) => {
    try {
      const boss = await Boss.findOne({ status: "active" }).sort({ spawnedAt: -1 });
      if (!boss) return res.json({ active: false });
      const s = boss.stats();
      res.json({
        active: true,
        bossId: String(boss._id),
        name: boss.name,
        emoji: boss.emoji,
        image: boss.image,
        color: boss.color,
        tier: boss.tier,
        maxHp: boss.maxHp,
        currentHp: boss.currentHp,
        timeLimit: boss.timeLimit,
        maxCoinsPerAttack: boss.maxCoinsPerAttack,
        minCoinsPerAttack: boss.minCoinsPerAttack,
        minUniqueAttackers: boss.minUniqueAttackers,
        expiresAt: boss.expiresAt.toISOString(),
        uniqueAttackers: s.uniqueAttackers,
        totalCoins: s.totalCoins,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Overlay yuklendiginde / yeniden baglandiginda mevcut bahis durumunu cekmek icin
  app.get("/api/bet/current", async (req, res) => {
    try {
      const bet = await Bet.findOne({ status: { $in: ["open", "closed"] } }).sort({ createdAt: -1 });
      if (!bet) return res.json({ active: false });
      const t = bet.totals();
      res.json({
        active: true,
        betId: String(bet._id),
        question: bet.question,
        status: bet.status,
        createdAt: bet.createdAt.toISOString(),
        closesAt: bet.closesAt.toISOString(),
        evet: t.evet,
        hayır: t.hayır,
        evetCount: t.evetCount,
        hayırCount: t.hayırCount,
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Test icin event tetikleme: GET /api/test-event?type=follow&username=test
  app.get("/api/test-event", (req, res) => {
    const type = String(req.query.type || "");
    if (!BROADCAST_EVENTS.includes(type)) {
      return res.status(400).json({ error: "Gecersiz event tipi", allowed: BROADCAST_EVENTS });
    }
    const data = { ...req.query };
    delete data.type;
    eventBus.emit(type, data);
    res.json({ ok: true, type, data });
  });

  let trackCache = { at: 0, payload: null };
  const CACHE_TTL_MS = 2500;

  app.get("/api/now-playing", async (req, res) => {
    try {
      const now = Date.now();
      if (trackCache.payload && now - trackCache.at < CACHE_TTL_MS) {
        return res.json(trackCache.payload);
      }

      let queueData = null;
      try {
        queueData = await getQueue();
      } catch (err) {
        console.warn("[Overlay] Queue alinamadi:", err.message);
      }

      const current = queueData?.currentlyPlaying;
      let payload;

      if (!current || current.type === "ad") {
        payload = { playing: false, isAd: current?.type === "ad" };
      } else {
        const track = await getCurrentTrack();
        const nextItem = queueData?.queue?.[0];
        payload = {
          playing: true,
          id: current.id,
          name: current.name,
          artists: (current.artists || []).map((a) => a.name).join(", "),
          albumArt: current.album?.images?.[0]?.url || null,
          isPlaying: track?.isPlaying ?? true,
          progressMs: track?.progressMs || 0,
          durationMs: current.duration_ms || 0,
          requester: getRequester(current.id),
          next: nextItem
            ? {
                name: nextItem.name,
                artists: (nextItem.artists || []).map((a) => a.name).join(", "),
                requester: getRequester(nextItem.id),
              }
            : null,
        };
      }
      trackCache = { at: now, payload };
      res.json(payload);
    } catch (err) {
      console.error("[Overlay] API hatasi:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/webhook/kick", express.raw({ type: "application/json" }), (req, res) => {
    if (!verifySignature(req.headers, req.body)) {
      console.warn("[Webhook] Gecersiz imza, istek reddedildi.");
      return res.status(401).send("Invalid signature");
    }

    const eventType = req.headers["kick-event-type"];
    let payload;
    try {
      payload = JSON.parse(req.body.toString("utf8"));
    } catch (err) {
      return res.status(400).send("Invalid JSON");
    }

    res.status(200).send("OK");

    if (eventType === "channel.followed") {
      Promise.resolve(onFollow(payload)).catch((err) =>
        console.error("[Webhook] Follow handler hatasi:", err.message)
      );
    } else {
      console.log(`[Webhook] Islenmemis event tipi: ${eventType}`);
    }
  });

  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      console.log(`[Webhook] Sunucu ${port} portunda dinleniyor (/webhook/kick).`);
      attachWSServer(server, { path: "/events" });
      resolve(server);
    });
    server.on("error", reject);
  });
}

module.exports = { startWebhookServer };
