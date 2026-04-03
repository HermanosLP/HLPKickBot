const { createCanvas } = require("canvas");
const fs = require("fs");
const path = require("path");
const UserScore = require("../models/UserScore");
const { getRankById } = require("../models/Rank");

const WIDTH = 480;
const ROW_HEIGHT = 50;
const HEADER_HEIGHT = 70;
const PADDING = 20;

const COLORS = {
  bg: "#1a0a0a",
  headerBg: "#2d0000",
  rowOdd: "#1f0e0e",
  rowEven: "#2a1414",
  border: "#8b0000",
  title: "#ff4444",
  gold: "#ffd700",
  silver: "#c0c0c0",
  bronze: "#cd7f32",
  text: "#ffffff",
  subtext: "#aaaaaa",
  accent: "#ff2222",
};

const MEDALS = ["🥇", "🥈", "🥉", "4", "5", "6", "7", "8", "9", "10"];

async function generateLeaderboard(outputPath) {
  const topUsers = await UserScore.find()
    .sort({ level: -1, xp: -1 })
    .limit(10);

  if (!topUsers.length) return null;

  const HEIGHT = HEADER_HEIGHT + topUsers.length * ROW_HEIGHT + PADDING * 2 + 30;
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  // Arka plan
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Üst border
  ctx.fillStyle = COLORS.border;
  ctx.fillRect(0, 0, WIDTH, 3);

  // Header
  ctx.fillStyle = COLORS.headerBg;
  ctx.fillRect(0, 3, WIDTH, HEADER_HEIGHT);

  // Başlık
  ctx.fillStyle = COLORS.title;
  ctx.font = "bold 24px Arial";
  ctx.textAlign = "center";
  ctx.fillText("☣️  LEADERBOARD  ☣️", WIDTH / 2, 45);

  // Alt çizgi
  ctx.fillStyle = COLORS.border;
  ctx.fillRect(PADDING, HEADER_HEIGHT, WIDTH - PADDING * 2, 2);

  // Sütun başlıkları
  const startY = HEADER_HEIGHT + 25;
  ctx.fillStyle = COLORS.subtext;
  ctx.font = "bold 12px Arial";
  ctx.textAlign = "left";
  ctx.fillText("#", PADDING + 5, startY);
  ctx.fillText("OYUNCU", PADDING + 35, startY);
  ctx.fillText("SEVİYE", WIDTH - 170, startY);
  ctx.fillText("RÜTBE", WIDTH - 90, startY);

  // Kullanıcılar
  topUsers.forEach((user, i) => {
    const y = startY + 15 + i * ROW_HEIGHT;

    // Satır arka planı
    ctx.fillStyle = i % 2 === 0 ? COLORS.rowOdd : COLORS.rowEven;
    ctx.fillRect(PADDING, y - 5, WIDTH - PADDING * 2, ROW_HEIGHT - 2);

    // Top 3 vurgu
    if (i === 0) {
      ctx.fillStyle = "rgba(255, 215, 0, 0.08)";
      ctx.fillRect(PADDING, y - 5, WIDTH - PADDING * 2, ROW_HEIGHT - 2);
    }

    // Sıra
    ctx.font = "bold 18px Arial";
    if (i === 0) ctx.fillStyle = COLORS.gold;
    else if (i === 1) ctx.fillStyle = COLORS.silver;
    else if (i === 2) ctx.fillStyle = COLORS.bronze;
    else ctx.fillStyle = COLORS.subtext;

    ctx.textAlign = "left";
    ctx.fillText(`${i + 1}`, PADDING + 5, y + 25);

    // Kullanıcı adı
    ctx.fillStyle = COLORS.text;
    ctx.font = "bold 16px Arial";
    const displayName = user.username.length > 14
      ? user.username.slice(0, 14) + "..."
      : user.username;
    ctx.fillText(displayName, PADDING + 35, y + 25);

    // Seviye
    ctx.fillStyle = COLORS.accent;
    ctx.font = "bold 16px Arial";
    ctx.fillText(`Sv.${user.level}`, WIDTH - 170, y + 25);

    // Rütbe
    const rank = getRankById(user.selectedRank);
    if (rank) {
      ctx.fillStyle = COLORS.subtext;
      ctx.font = "14px Arial";
      const rankName = rank.name.length > 10
        ? rank.name.slice(0, 10) + "..."
        : rank.name;
      ctx.fillText(`${rank.emoji} ${rankName}`, WIDTH - 90, y + 25);
    }
  });

  // Alt border
  const bottomY = startY + 15 + topUsers.length * ROW_HEIGHT + 10;
  ctx.fillStyle = COLORS.border;
  ctx.fillRect(PADDING, bottomY, WIDTH - PADDING * 2, 1);

  // Footer
  ctx.fillStyle = COLORS.subtext;
  ctx.font = "11px Arial";
  ctx.textAlign = "center";
  const date = new Date().toLocaleDateString("tr-TR");
  ctx.fillText(`Son güncelleme: ${date} | kick.com/HermanosLP`, WIDTH / 2, bottomY + 18);

  // Alt border
  ctx.fillStyle = COLORS.border;
  ctx.fillRect(0, HEIGHT - 3, WIDTH, 3);

  // Kaydet
  const savePath = outputPath || path.join(__dirname, "..", "..", "leaderboard.png");
  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(savePath, buffer);
  console.log(`[Leaderboard] Gorsel olusturuldu: ${savePath}`);

  return savePath;
}

module.exports = { generateLeaderboard };
