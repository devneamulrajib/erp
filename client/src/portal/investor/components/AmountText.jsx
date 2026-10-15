import React from 'react';
import { useInvestorPrivacy } from '../context/InvestorPrivacyContext';

const formatIndianGrouping = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '0';
  const num = Math.round(Number(val));
  return num.toLocaleString('en-IN');
};

const AmountText = ({ amount, className = '', prefix = '৳ ' }) => {
  const { isMasked } = useInvestorPrivacy();

  if (isMasked) {
    return (
      <span className={`tracking-widest select-none ${className}`} title="Amount masked">
        ••••••
      </span>
    );
  }

  return (
    <span className={`tabular-nums ${className}`}>
      {prefix}{formatIndianGrouping(amount)}
    </span>
  );
};

export default AmountText;