const MAX_AGE_MS = 24 * 60 * 60 * 1000;

const requesters = new Map();

function registerRequest(trackId, username) {
  if (!trackId || !username) return;
  requesters.set(trackId, { username, timestamp: Date.now() });
  cleanup();
}

function getRequester(trackId) {
  if (!trackId) return null;
  const entry = requesters.get(trackId);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > MAX_AGE_MS) {
    requesters.delete(trackId);
    return null;
  }
  return entry.username;
}

function cleanup() {
  const now = Date.now();
  for (const [id, entry] of requesters.entries()) {
    if (now - entry.timestamp > MAX_AGE_MS) requesters.delete(id);
  }
}

module.exports = { registerRequest, getRequester };
