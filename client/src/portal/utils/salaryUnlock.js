// Holds the short-lived salary unlock token in memory only (lost on refresh by design).
let token = null;
let expiresAt = 0;

export const getUnlockToken = () => (token && Date.now() < expiresAt - 5000 ? token : null);

export const setUnlockToken = (t, seconds) => {
  token = t;
  expiresAt = Date.now() + seconds * 1000;
};

export const clearUnlockToken = () => {
  token = null;
  expiresAt = 0;
};