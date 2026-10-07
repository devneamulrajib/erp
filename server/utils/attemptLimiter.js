// In-memory brute-force guard: 5 wrong attempts -> locked for 15 minutes.
// Resets when the server restarts, which is fine for this purpose.
const attempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;

// Returns minutes remaining if locked, otherwise 0
function check(key) {
  const entry = attempts.get(key);
  if (entry && entry.lockedUntil && entry.lockedUntil > Date.now()) {
    return Math.ceil((entry.lockedUntil - Date.now()) / 60000);
  }
  return 0;
}

function fail(key) {
  const entry = attempts.get(key) || { count: 0, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCK_MS;
    entry.count = 0;
  }
  attempts.set(key, entry);
}

function clear(key) {
  attempts.delete(key);
}

module.exports = { check, fail, clear };