const { placeBet } = require("./evet");

module.exports = {
  name: "hayır",
  description: "Aktif bahise Hayır tarafına coin koyar",
  async execute(msg) {
    return placeBet(msg, "hayır");
  },
};
