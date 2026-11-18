// Tailwind slate/amber palette used by the web portal, as plain RN values.
export const colors = {
  bg: '#f1f5f9', // slate-100
  card: '#ffffff',
  border: '#e2e8f0', // slate-200
  borderLight: '#f1f5f9',
  text: '#0f172a', // slate-900
  text2: '#334155', // slate-700
  muted: '#64748b', // slate-500
  faint: '#94a3b8', // slate-400
  primary: '#0f172a',
  primarySoft: '#1e293b',
  amber: '#f59e0b',
  amberSoft: '#fef3c7',
  emerald: '#059669',
  emeraldSoft: '#ecfdf5',
  red: '#dc2626',
  redSoft: '#fef2f2',
  sky: '#0284c7',
  skySoft: '#f0f9ff',
  blue: '#1d4ed8',
  blueSoft: '#eff6ff',
  violet: '#6d28d9',
  violetSoft: '#f5f3ff',
  indigo: '#3347B8', // investor portal accent
  indigoSoft: '#eef2ff',
  white: '#ffffff',
};

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, full: 999 };
export const space = (n) => n * 4;

// Status -> [text, background] used across portals (mirrors web badge maps).
export const STATUS_TONES = {
  Pending: [colors.amber, colors.amberSoft],
  Approved: [colors.sky, colors.skySoft],
  Disbursed: [colors.emerald, colors.emeraldSoft],
  Rejected: [colors.red, colors.redSoft],
  Cancelled: [colors.red, colors.redSoft],
  Completed: [colors.muted, colors.bg],
  Paid: [colors.emerald, colors.emeraldSoft],
  Settled: [colors.emerald, colors.emeraldSoft],
  Partial: [colors.amber, colors.amberSoft],
  Unpaid: [colors.muted, colors.bg],
  Accepted: [colors.emerald, colors.emeraldSoft],
  Acknowledged: [colors.sky, colors.skySoft],
  Shipped: [colors.blue, colors.blueSoft],
  Delivered: [colors.emerald, colors.emeraldSoft],
  Open: [colors.amber, colors.amberSoft],
  Resolved: [colors.emerald, colors.emeraldSoft],
  Closed: [colors.muted, colors.bg],
  Submitted: [colors.sky, colors.skySoft],
  'Needs Correction': [colors.amber, colors.amberSoft],
  'To Do': [colors.muted, colors.bg],
  'In Progress': [colors.blue, colors.blueSoft],
  'On Hold': [colors.amber, colors.amberSoft],
  Done: [colors.emerald, colors.emeraldSoft],
  Present: [colors.emerald, colors.emeraldSoft],
  Absent: [colors.red, colors.redSoft],
  Leave: [colors.amber, colors.amberSoft],
  Holiday: [colors.violet, colors.violetSoft],
  Off: [colors.faint, colors.bg],
  PartiallyConverted: [colors.amber, colors.amberSoft],
  Converted: [colors.emerald, colors.emeraldSoft],
  NeedsCorrection: [colors.amber, colors.amberSoft],
  'Under Review': [colors.sky, colors.skySoft],
  Overdue: [colors.red, colors.redSoft],
  Draft: [colors.muted, colors.bg],
  active: [colors.emerald, colors.emeraldSoft],
  matured: [colors.amber, colors.amberSoft],
  fully_returned: [colors.muted, colors.bg],
};
