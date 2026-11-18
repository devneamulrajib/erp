// Formatting helpers shared by all portal screens (Bangladeshi Taka like the web portal).
export const money = (n) => `৳${Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

export const num = (n) => Number(n || 0).toLocaleString('en-US');

const toDate = (value) => {
  if (!value) return null;
  const s = String(value);
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00`) : new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const fmtDate = (value) => {
  const d = toDate(value);
  return d ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
};

export const fmtDateTime = (value) => {
  const d = toDate(value);
  return d
    ? `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
    : '—';
};

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const MONTH_SHORT = MONTHS.map((m) => m.slice(0, 3));

export const ymd = (d) => {
  const x = d instanceof Date ? d : new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

export const initials = (name) =>
  (name || '?').trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();

// No HTTP response: tell a TLS/certificate failure apart from "no internet" / timeout.
// React Native keeps the native error text (e.g. "Trust anchor for certification path
// not found", SSLHandshakeException) on the XHR object that axios attaches as err.request.
const TLS_RE = /certif|trust anchor|ssl|tls|handshake|CertPath/i;
const networkMsg = (err) => {
  if (err?.code === 'ECONNABORTED' || err?.code === 'ETIMEDOUT') return 'The server took too long to respond. Please try again.';
  if (err?.message !== 'Network Error' && err?.code !== 'ERR_NETWORK') return null;
  const nativeText = [err?.request?._response, err?.event?.message, err?.cause?.message]
    .filter((v) => typeof v === 'string').join(' ');
  if (TLS_RE.test(nativeText)) return 'Secure connection failed — this phone does not trust the server certificate. Update Android/the app, or contact support.';
  return 'Network error — check your internet connection.';
};

export const errMsg = (err, fallback = 'Something went wrong. Please try again.') =>
  err?.response?.data?.message || networkMsg(err) || fallback;
