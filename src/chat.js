const { Pusher } = require("pusher-js");

function connectChat(chatroomId, onMessage) {
  const pusher = new Pusher("32cbd69e4b950bf97679", {
    wsHost: "ws-us2.pusher.com",
    wsPort: 443,
    wssPort: 443,
    forceTLS: true,
    disableStats: true,
    enabledTransports: ["ws", "wss"],
    cluster: "",
  });

  const channel = pusher.subscribe(`chatrooms.${chatroomId}.v2`);

  channel.bind("App\\Events\\ChatMessageEvent", (data) => {
    const parsed = typeof data === "string" ? JSON.parse(data) : data;
    onMessage({
      id: parsed.id,
      content: parsed.content,
      username: parsed.sender?.username,
      userId: parsed.sender?.id,
      badges: parsed.sender?.identity?.badges || [],
    });
  });

  pusher.connection.bind("connected", () => {
    console.log("[Chat] Pusher baglandi, chat dinleniyor...");
  });

  pusher.connection.bind("error", (err) => {
    console.error("[Chat] Pusher hatasi:", err);
  });

  return pusher;
}

module.exports = { connectChat };
