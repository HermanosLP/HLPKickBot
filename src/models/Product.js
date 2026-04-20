const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  productId: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  price: { type: Number, required: true, min: 1 },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

productSchema.statics.nextId = async function () {
  const last = await this.findOne().sort({ productId: -1 }).select("productId");
  return last ? last.productId + 1 : 0;
};

productSchema.statics.findByIdOrName = async function (input) {
  const asNumber = Number(input);
  if (Number.isInteger(asNumber) && /^\d+$/.test(String(input).trim())) {
    const byId = await this.findOne({ productId: asNumber });
    if (byId) return byId;
  }
  return this.findOne({
    name: new RegExp(`^${String(input).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
  });
};

module.exports = mongoose.model("Product", productSchema);
