let activeDrop = null;

const DROP_LIFETIME_MS = 2 * 60 * 1000;

function createDrop(amount) {
  const now = Date.now();
  activeDrop = { amount, createdAt: now, expiresAt: now + DROP_LIFETIME_MS };
  return activeDrop;
}

function hasActiveDrop() {
  if (!activeDrop) return false;
  if (Date.now() > activeDrop.expiresAt) {
    activeDrop = null;
    return false;
  }
  return true;
}

function claim() {
  if (!hasActiveDrop()) return null;
  const won = activeDrop;
  activeDrop = null;
  return won;
}

function generateDropAmount() {
  const r = Math.random();
  if (r < 0.60) return 20 + Math.floor(Math.random() * 21);
  if (r < 0.90) return 50 + Math.floor(Math.random() * 26);
  return 100 + Math.floor(Math.random() * 51);
}

module.exports = { createDrop, claim, hasActiveDrop, generateDropAmount };
