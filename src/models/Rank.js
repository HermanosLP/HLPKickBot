const ranks = [
  { id: 0, name: "Civilian", emoji: "🟢", minLevel: 1, description: "Yeni hayatta kalan" },
  { id: 1, name: "Rookie", emoji: "🔵", minLevel: 11, description: "İlk adımları atan çaylak" },
  { id: 2, name: "Agent", emoji: "🟡", minLevel: 26, description: "Sahada kendini kanıtlamış ajan" },
  { id: 3, name: "Veteran", emoji: "🟠", minLevel: 41, description: "Sayısız operasyon atlatmış asker" },
  { id: 4, name: "Elite Agent", emoji: "🔴", minLevel: 56, description: "Seçkin birlik üyesi" },
  { id: 5, name: "S.T.A.R.S. Member", emoji: "💀", minLevel: 71, description: "Efsanevi S.T.A.R.S. takımının üyesi" },
  { id: 6, name: "Wesker Class", emoji: "☣️", minLevel: 86, description: "İnsanüstü güce ulaşmış varlık" },
  { id: 7, name: "Umbrella Commander", emoji: "👑", minLevel: 100, description: "Umbrella'nın mutlak lideri" },
];

function getEarnedRanks(level) {
  return ranks.filter((r) => level >= r.minLevel);
}

function getRankById(id) {
  return ranks.find((r) => r.id === id) || null;
}

function getHighestRank(level) {
  const earned = getEarnedRanks(level);
  return earned[earned.length - 1] || ranks[0];
}

module.exports = { ranks, getEarnedRanks, getRankById, getHighestRank };
