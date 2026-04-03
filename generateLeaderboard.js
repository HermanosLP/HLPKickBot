require("dotenv").config();
const { connectDB } = require("./src/db");
const { generateLeaderboard } = require("./src/utils/leaderboard");

async function main() {
  await connectDB();
  const path = await generateLeaderboard();
  if (path) {
    console.log("Leaderboard olusturuldu:", path);
  } else {
    console.log("Kullanici bulunamadi.");
  }
  process.exit(0);
}

main().catch(console.error);
