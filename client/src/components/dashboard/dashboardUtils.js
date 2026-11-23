// client/src/components/dashboard/dashboardUtils.js
// Small helpers shared by the dashboards.

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function currentStaffUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
}

export const formatTaka = (value) =>
  `৳${Number(value || 0).toLocaleString('en-BD', { maximumFractionDigits: 0 })}`;

export const formatCount = (value) => Number(value || 0).toLocaleString('en-BD');
