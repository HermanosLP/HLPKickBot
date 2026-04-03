const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGO_URI env degiskeni tanimli degil!");
  }

  await mongoose.connect(uri);
  console.log("[DB] MongoDB'ye baglandi.");
}

module.exports = { connectDB };
