const { createCanvas } = require("canvas");
const fs = require("fs");
const path = require("path");

const WIDTH = 480;
const HEIGHT = 120;

const canvas = createCanvas(WIDTH, HEIGHT);
const ctx = canvas.getContext("2d");

// Arka plan - koyu kırmızı gradient efekti
const gradient = ctx.createLinearGradient(0, 0, WIDTH, 0);
gradient.addColorStop(0, "#1a0000");
gradient.addColorStop(0.5, "#2d0000");
gradient.addColorStop(1, "#1a0000");
ctx.fillStyle = gradient;
ctx.fillRect(0, 0, WIDTH, HEIGHT);

// Üst ve alt border
ctx.fillStyle = "#8b0000";
ctx.fillRect(0, 0, WIDTH, 3);
ctx.fillRect(0, HEIGHT - 3, WIDTH, 3);

// Sol ve sag border
ctx.fillRect(0, 0, 3, HEIGHT);
ctx.fillRect(WIDTH - 3, 0, 3, HEIGHT);

// Köşe detayları
ctx.fillStyle = "#ff2222";
const cornerSize = 12;
// Sol üst
ctx.fillRect(0, 0, cornerSize, 3);
ctx.fillRect(0, 0, 3, cornerSize);
// Sağ üst
ctx.fillRect(WIDTH - cornerSize, 0, cornerSize, 3);
ctx.fillRect(WIDTH - 3, 0, 3, cornerSize);
// Sol alt
ctx.fillRect(0, HEIGHT - 3, cornerSize, 3);
ctx.fillRect(0, HEIGHT - cornerSize, 3, cornerSize);
// Sağ alt
ctx.fillRect(WIDTH - cornerSize, HEIGHT - 3, cornerSize, 3);
ctx.fillRect(WIDTH - 3, HEIGHT - cornerSize, 3, cornerSize);

// Başlık
ctx.fillStyle = "#ff4444";
ctx.font = "bold 36px Arial";
ctx.textAlign = "center";
ctx.textBaseline = "middle";
ctx.fillText("☣️  LEADERBOARD  ☣️", WIDTH / 2, HEIGHT / 2 - 10);

// Alt yazı
ctx.fillStyle = "#aaaaaa";
ctx.font = "14px Arial";
ctx.fillText("Güncel sıralamayı görmek için tıkla", WIDTH / 2, HEIGHT / 2 + 25);

// Kaydet
const savePath = path.join(__dirname, "leaderboard-banner.png");
fs.writeFileSync(savePath, canvas.toBuffer("image/png"));
console.log("Banner olusturuldu:", savePath);
