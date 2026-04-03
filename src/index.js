require("dotenv").config();

const { createKickClient, authenticate } = require("./auth");
const { connectChat } = require("./chat");
const { loadCommands, handleMessage } = require("./commandLoader");
const { connectDB } = require("./db");
const UserScore = require("./models/UserScore");
const { getEarnedRanks, getRankById } = require("./models/Rank");

async function main() {
  console.log("=== HLPKickBot Baslatiliyor ===\n");

  // 1. MongoDB'ye baglan
  await connectDB();

  // 2. Komutlari yukle
  const commands = loadCommands();
  console.log(`\n[Bot] ${commands.size} komut yuklendi.\n`);

  // 3. Kick API'ye baglan
  const kickClient = createKickClient();
  await authenticate(kickClient);
  console.log("[Bot] Kick API'ye baglandi.\n");

  // 4. API kullanan komutlara client'i ver
  for (const cmd of commands.values()) {
    if (cmd.setClient) cmd.setClient(kickClient);
  }

  // 5. Chat'i dinle
  const chatroomId = process.env.KICK_CHATROOM_ID;

  connectChat(chatroomId, async (msg) => {
    console.log(`[${msg.username}]: ${msg.content}`);

    // Botu XP/skor takibinden haric tut
    const BOT_USER_ID = "101941574";
    if (String(msg.userId) === BOT_USER_ID) return;

    // Mesaj sayacini ve XP'yi guncelle
    const XP_PER_MESSAGE = 15;
    let user = await UserScore.findOne({ userId: msg.userId });

    if (!user) {
      user = new UserScore({ userId: msg.userId, username: msg.username });
    }

    user.username = msg.username;
    user.messageCount += 1;
    const leveledUp = user.addXP(XP_PER_MESSAGE);
    await user.save();

    if (leveledUp) {
      // Yeni rutbe kazanildi mi kontrol et
      const earned = getEarnedRanks(user.level);
      const newRanks = earned.filter((r) => !user.earnedRanks.includes(r.id));

      for (const rank of newRanks) {
        user.earnedRanks.push(rank.id);
      }
      if (newRanks.length) await user.save();

      try {
        await kickClient.chat.postMessage({
          type: "bot",
          content: `🎉 ${msg.username} seviye atladı! Yeni seviye: ⭐ ${user.level}`,
        });

        for (const rank of newRanks) {
          await kickClient.chat.postMessage({
            type: "bot",
            content: `☣️ Yeni rütbe açıldı! ${rank.emoji} ${rank.name} | !unvansec ${rank.id}`,
          });
        }
      } catch (err) {
        console.error("[Bot] Seviye mesaji gonderilemedi:", err.message);
      }
    }

    const response = await handleMessage(commands, msg.content, msg);
    if (!response) return;

    const messages = Array.isArray(response) ? response : [response];

    for (const line of messages) {
      try {
        await kickClient.chat.postMessage({
          type: "bot",
          content: line,
        });
        console.log(`[Bot -> ${msg.username}]: ${line}`);
      } catch (err) {
        console.error("[Bot] Mesaj gonderilemedi:", err.message);
      }
    }
  });

  // 6. Otomatik mesajlar (5 dakikada bir donusumlu, sadece yayin acikken)
  const AUTO_INTERVAL = 5 * 60 * 1000;
  const broadcasterId = process.env.KICK_CHANNEL_ID;

  const autoMessages = [
    "💚 Kanalı takip etmeyi unutma! ➜ kick.com/HermanosLP | Sub olarak destek olabilirsin!",
    "💡 Komutlarımı merak ediyorsan !komutlar yazabilirsin!",
  ];
  let autoMsgIndex = 0;

  setInterval(async () => {
    try {
      const streams = await kickClient.livestreams.getLivestreams({
        broadcaster_user_id: [broadcasterId],
      });

      if (!streams?.data?.length) {
        console.log("[Bot] Yayin kapali, otomatik mesaj atlandi.");
        return;
      }

      const message = autoMessages[autoMsgIndex % autoMessages.length];
      autoMsgIndex++;

      await kickClient.chat.postMessage({
        type: "bot",
        content: message,
      });
      console.log(`[Bot] Otomatik mesaj gonderildi: ${message}`);
    } catch (err) {
      console.error("[Bot] Otomatik mesaj gonderilemedi:", err.message);
    }
  }, AUTO_INTERVAL);

  console.log("[Bot] Chat dinleniyor. Cikmak icin CTRL+C\n");
}

main().catch((err) => {
  console.error("[Bot] Kritik hata:", err);
  process.exit(1);
});
