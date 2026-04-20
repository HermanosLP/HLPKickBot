const mongoose = require("mongoose");

const purchaseSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  username: { type: String, required: true },
  productId: { type: Number, required: true },
  productName: { type: String, required: true },
  price: { type: Number, required: true },
  purchasedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Purchase", purchaseSchema);
