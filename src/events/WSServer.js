const { WebSocketServer } = require("ws");
const eventBus = require("./EventBus");

const BROADCAST_EVENTS = [
  "follow",
  "levelup",
  "rankup",
  "bet:open",
  "bet:update",
  "bet:close",
  "bet:settle",
  "bet:cancel",
  "drop:start",
  "drop:catch",
  "song:request",
  "song:playing",
  "purchase",
  "boss:spawn",
  "boss:attack",
  "boss:defeat",
  "boss:expire",
];

function attachWSServer(httpServer, { path = "/events" } = {}) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname !== path) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", (ws, req) => {
    const ip = req.socket.remoteAddress;
    console.log(`[WS] Overlay baglandi: ${ip} (toplam: ${wss.clients.size})`);

    ws.isAlive = true;
    ws.on("pong", () => { ws.isAlive = true; });

    ws.send(JSON.stringify({ type: "hello", data: { time: Date.now() } }));

    ws.on("close", () => {
      console.log(`[WS] Overlay ayrildi (kalan: ${wss.clients.size})`);
    });

    ws.on("error", (err) => {
      console.warn("[WS] Client hatasi:", err.message);
    });
  });

  const pingInterval = setInterval(() => {
    for (const client of wss.clients) {
      if (client.isAlive === false) {
        client.terminate();
        continue;
      }
      client.isAlive = false;
      try { client.ping(); } catch (_) {}
    }
  }, 30000);

  wss.on("close", () => clearInterval(pingInterval));

  function broadcast(type, data) {
    const payload = JSON.stringify({ type, data, ts: Date.now() });
    for (const client of wss.clients) {
      if (client.readyState === 1) {
        try { client.send(payload); } catch (_) {}
      }
    }
  }

  for (const type of BROADCAST_EVENTS) {
    eventBus.on(type, (data) => broadcast(type, data));
  }

  console.log(`[WS] Event broadcaster aktif (path: ${path}, ${BROADCAST_EVENTS.length} event tipi).`);

  return { wss, broadcast };
}

module.exports = { attachWSServer, BROADCAST_EVENTS };
