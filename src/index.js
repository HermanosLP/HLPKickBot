require("dotenv").config();

const { createKickClient, authenticate } = require("./auth");
const { connectChat } = require("./chat");
const { loadCommands, handleMessage } = require("./commandLoader");
const { connectDB } = require("./db");
const UserScore = require("./models/UserScore");
const { getEarnedRanks, getRankById } = require("./models/Rank");
const { generateLeaderboard } = require("./utils/leaderboard");
const { uploadToGitHub } = require("./utils/githubUpload");
const linkGuard = require("./utils/linkGuard");
const { timeoutUser, permanentBan } = require("./utils/modActions");
const { ensureFollowSubscription } = require("./utils/eventSubscription");
const { startWebhookServer } = require("./webhooks");
const { startStreamPolling, isLive } = require("./utils/streamStatus");
const { createDrop, hasActiveDrop, generateDropAmount } = require("./utils/coinDrop");
const Bet = require("./models/Bet");

const FOLLOW_REWARD_COINS = 100;

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

  // 3.5. Takip odulu icin webhook sunucusu + event aboneligi
  const broadcasterIdNum = process.env.KICK_CHANNEL_ID;

  async function handleFollowEvent(payload) {
    const follower = payload?.follower;
    if (!follower || follower.is_anonymous || !follower.user_id) return;

    const userId = String(follower.user_id);
    const username = follower.username || "Bilinmeyen";

    let user = await UserScore.findOne({ userId });
    if (!user) user = new UserScore({ userId, username });

    if (user.followRewardClaimed) {
      console.log(`[Follow] ${username} daha once odul almis, atlandi.`);
      return;
    }

    user.coins = (user.coins || 0) + FOLLOW_REWARD_COINS;
    user.followRewardClaimed = true;
    user.username = username;
    await user.save();

    console.log(`[Follow] ${username} +${FOLLOW_REWARD_COINS} coin aldi.`);
  }

  try {
    await startWebhookServer({ port: 3000, onFollow: handleFollowEvent });
    await ensureFollowSubscription(broadcasterIdNum);
  } catch (err) {
    console.error("[Bot] Webhook/event kurulumu basarisiz:", err.message);
    console.error("[Bot] Takip odulleri calismayacak, diger ozellikler devam ediyor.");
  }

  // 3.6. Yayin durumu polling (coin kazanimi yayin aciksa verilir)
  startStreamPolling(kickClient, broadcasterIdNum);
  if (process.env.BYPASS_LIVE_CHECK === "true") {
    console.log("[StreamStatus] ⚠️  BYPASS_LIVE_CHECK aktif - coin kazanimi yayin kapali iken de veriliyor (dev mod).");
  }

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
    const COIN_PER_MESSAGE = 1;
    const COIN_COOLDOWN_MS = 60 * 1000;
    let user = await UserScore.findOne({ userId: msg.userId });

    if (!user) {
      user = new UserScore({ userId: msg.userId, username: msg.username });
    }

    // Link koruma - XP vermeden once kontrol et
    const linkOffense = linkGuard.checkMessage(msg);
    if (linkOffense) {
      const now = new Date();
      const resetMs = linkGuard.getResetMs();
      if (user.lastLinkOffenseAt && now - user.lastLinkOffenseAt > resetMs) {
        user.linkOffenses = 0;
      }

      const punishment = linkGuard.getPunishment(user.linkOffenses);
      user.linkOffenses += 1;
      user.lastLinkOffenseAt = now;
      user.username = msg.username;
      await user.save();

      const reason = `Link yasagi (${user.linkOffenses}. ihlal) - ${linkOffense.offendingDomains.join(", ")}`;

      try {
        let chatMessage;
        if (punishment.action === "warn") {
          chatMessage = `⚠️ ${msg.username} link atma yasak, bu bir uyarı! Tekrarı timeout ile sonuçlanır.`;
        } else if (punishment.action === "timeout") {
          await timeoutUser({
            broadcasterId: process.env.KICK_CHANNEL_ID,
            userId: msg.userId,
            minutes: punishment.minutes,
            reason,
          });
          chatMessage = `🚫 ${msg.username} izinsiz link attı → ${punishment.label} (${user.linkOffenses}. ihlal)`;
        } else if (punishment.action === "ban") {
          await permanentBan({
            broadcasterId: process.env.KICK_CHANNEL_ID,
            userId: msg.userId,
            reason,
          });
          chatMessage = `🚫 ${msg.username} izinsiz link attı → ${punishment.label} (${user.linkOffenses}. ihlal)`;
        }
        console.log(`[LinkGuard] ${msg.username} -> ${punishment.label} (${user.linkOffenses}. ihlal)`);

        if (chatMessage) {
          await kickClient.chat.postMessage({ type: "bot", content: chatMessage });
        }
      } catch (err) {
        console.error("[LinkGuard] Ceza uygulanamadi:", err.message);
      }
      return; // Link ihlali olan mesajda XP/komut calismaz
    }

    user.username = msg.username;
    user.messageCount += 1;

    // Mesaj basina coin (yayin aciksa + 60 sn cooldown per-user)
    const nowMs = Date.now();
    const lastCoinMs = user.lastCoinEarnedAt ? new Date(user.lastCoinEarnedAt).getTime() : 0;
    if (isLive() && nowMs - lastCoinMs >= COIN_COOLDOWN_MS) {
      user.coins = (user.coins || 0) + COIN_PER_MESSAGE;
      user.lastCoinEarnedAt = new Date(nowMs);
    }

    const oldLevel = user.level;
    const leveledUp = user.addXP(XP_PER_MESSAGE);

    let levelUpCoinBonus = 0;
    if (leveledUp) {
      for (let lvl = oldLevel + 1; lvl <= user.level; lvl++) {
        levelUpCoinBonus += Math.ceil(lvl / 10) * 5;
      }
      user.coins = (user.coins || 0) + levelUpCoinBonus;
    }

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
          content: `🎉 ${msg.username} seviye atladı! Yeni seviye: ⭐ ${user.level} (+${levelUpCoinBonus} 🪙)`,
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

  // 6.5. Saatte bir rastgele coin drop (sadece yayin aciksa)
  const DROP_INTERVAL_MS = 60 * 60 * 1000;

  async function tryDrop() {
    if (!isLive()) {
      console.log("[Drop] Yayin kapali, atlandi.");
      return;
    }
    if (hasActiveDrop()) {
      console.log("[Drop] Mevcut drop var, atlandi.");
      return;
    }
    const amount = generateDropAmount();
    createDrop(amount);
    try {
      await kickClient.chat.postMessage({
        type: "bot",
        content: `💰 Bot havaya ${amount} 🪙 coin attı! İlk !topla yazan alır! (2 dk süren var)`,
      });
      console.log(`[Drop] ${amount} coin droplandi.`);
    } catch (err) {
      console.error("[Drop] Mesaj gonderilemedi:", err.message);
    }
  }

  setInterval(tryDrop, DROP_INTERVAL_MS);

  // 6.6. Bahis otomatik kapanis kontrolu (her 30 sn, suresi dolanlari kapatir)
  const BET_CHECK_INTERVAL = 30 * 1000;

  setInterval(async () => {
    try {
      const bet = await Bet.findOne({ status: "open" });
      if (!bet) return;
      if (new Date() <= bet.closesAt) return;

      bet.status = "closed";
      await bet.save();

      const { evet, hayır, evetCount, hayırCount } = bet.totals();
      await kickClient.chat.postMessage({
        type: "bot",
        content: `⏰ Bahis kapandı! "${bet.question}" | Evet: ${evet} 🪙 (${evetCount}) / Hayır: ${hayır} 🪙 (${hayırCount}) | Sonuç bekleniyor...`,
      });
      console.log(`[Bahis] Kapandi: ${bet.question}`);
    } catch (err) {
      console.error("[Bahis] Kapanis kontrolu hatasi:", err.message);
    }
  }, BET_CHECK_INTERVAL);

  // 7. Leaderboard otomatik guncelleme (30 dakikada bir)
  const LEADERBOARD_INTERVAL = 30 * 60 * 1000;

  async function updateLeaderboard() {
    try {
      const imagePath = await generateLeaderboard();
      if (imagePath) {
        await uploadToGitHub(imagePath);
      }
    } catch (err) {
      console.error("[Leaderboard] Guncelleme hatasi:", err.message);
    }
  }

  // Baslangicta bir kez calistir
  updateLeaderboard();
  setInterval(updateLeaderboard, LEADERBOARD_INTERVAL);

  console.log("[Bot] Chat dinleniyor. Cikmak icin CTRL+C\n");
}

main().catch((err) => {
  console.error("[Bot] Kritik hata:", err);
  process.exit(1);
});
