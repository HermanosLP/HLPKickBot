const mongoose = require("mongoose");

const betEntrySchema = new mongoose.Schema(
  {
    userId: { type: String, required: true },
    username: { type: String, required: true },
    side: { type: String, enum: ["evet", "hayır"], required: true },
    amount: { type: Number, required: true },
  },
  { _id: false }
);

const betSchema = new mongoose.Schema({
  question: { type: String, required: true },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  closesAt: { type: Date, required: true },
  status: {
    type: String,
    enum: ["open", "closed", "settled", "cancelled"],
    default: "open",
  },
  outcome: { type: String, enum: ["evet", "hayır", null], default: null },
  settledAt: { type: Date, default: null },
  bets: { type: [betEntrySchema], default: [] },
});

betSchema.methods.totals = function () {
  let evet = 0;
  let hayır = 0;
  let evetCount = 0;
  let hayırCount = 0;
  const userTotals = new Map();

  for (const b of this.bets) {
    if (b.side === "evet") {
      evet += b.amount;
      evetCount += 1;
    } else {
      hayır += b.amount;
      hayırCount += 1;
    }
    const prev = userTotals.get(b.userId) || { side: b.side, amount: 0 };
    prev.amount += b.amount;
    userTotals.set(b.userId, prev);
  }

  return { evet, hayır, evetCount, hayırCount, userTotals };
};

module.exports = mongoose.model("Bet", betSchema);
