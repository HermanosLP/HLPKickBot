const UserScore = require("../../models/UserScore");

const STREAK_XP = [100, 150, 200, 250, 300, 350, 400];
const COOLDOWN = 24 * 60 * 60 * 1000;
const STREAK_RESET = 48 * 60 * 60 * 1000;

module.exports = {
  name: "günlük",
  description: "Günlük XP bonusu topla (seri arttıkça XP artar)",
  async execute(msg) {
    let user = await UserScore.findOne({ userId: String(msg.userId) });

    if (!user) {
      user = new UserScore({ userId: String(msg.userId), username: msg.username });
    }

    const now = Date.now();
    const lastDaily = user.lastDaily ? new Date(user.lastDaily).getTime() : 0;
    const timeSince = now - lastDaily;

    if (timeSince < COOLDOWN) {
      const remaining = COOLDOWN - timeSince;
      const hours = Math.floor(remaining / 3600000);
      const minutes = Math.floor((remaining % 3600000) / 60000);
      return `⏳ ${msg.username}, günlük bonusunu zaten aldın! ${hours} saat ${minutes} dakika sonra tekrar gel. (🔥 Seri: ${user.dailyStreak || 0})`;
    }

    // 48 saat gectiyse seriyi sifirla
    if (timeSince > STREAK_RESET) {
      user.dailyStreak = 0;
    }

    user.dailyStreak = (user.dailyStreak || 0) + 1;
    user.lastDaily = new Date();

    const streakIndex = Math.min(user.dailyStreak - 1, STREAK_XP.length - 1);
    const xpReward = STREAK_XP[streakIndex];

    const leveledUp = user.addXP(xpReward);
    await user.save();

    const response = [`🎁 ${msg.username}, günlük +${xpReward} XP aldın! 🔥 Seri: ${user.dailyStreak} gün (Seviye: ${user.level})`];

    if (user.dailyStreak < 7) {
      const nextXP = STREAK_XP[streakIndex + 1];
      response[0] += ` | Yarın: +${nextXP} XP`;
    }

    if (leveledUp) {
      response.push(`🎉 Tebrikler, seviye atladın! Yeni seviye: ⭐ ${user.level}`);
    }

    return response;
  },
};
