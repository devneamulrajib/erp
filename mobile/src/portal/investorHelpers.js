// From portal/investor/components/ReturnTypeBadge.jsx and investor page constants.
export const RETURN_TYPES = {
  fixed_return: { label: 'Fixed return', description: 'A fixed percentage return agreed in advance. It does not change with how the project performs.' },
  project_based: { label: 'Project profit share', description: "Your return is a share of the project's net profit, so it rises or falls with project performance." },
  equity: { label: 'Equity (hybrid)', description: 'You earn the higher of the agreed fixed floor or your share of the project profit.' },
};
const humanize = (v) => {
  const s = String(v || '').replace(/_/g, ' ').trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Standard';
};
export const getReturnType = (type) => RETURN_TYPES[type] || { label: humanize(type), description: '' };

export const PAYOUT_TITLES = {
  profit_distribution: 'Profit Payout',
  principal_return: 'Capital Returned',
  combined: 'Capital + Profit Paid',
};

export const INVESTMENT_STATUS_LABEL = { active: 'Active', matured: 'Matured', fully_returned: 'Returned' };
