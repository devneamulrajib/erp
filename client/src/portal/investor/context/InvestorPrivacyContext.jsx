import React, { createContext, useContext, useState, useEffect } from 'react';

const InvestorPrivacyContext = createContext({
  isMasked: false,
  toggleMask: () => {}
});

export const InvestorPrivacyProvider = ({ children }) => {
  const [isMasked, setIsMasked] = useState(() => {
    try {
      return localStorage.getItem('inv_mask_amounts') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('inv_mask_amounts', isMasked ? 'true' : 'false');
    } catch {
      // ignore
    }
  }, [isMasked]);

  const toggleMask = () => setIsMasked(prev => !prev);

  return (
    <InvestorPrivacyContext.Provider value={{ isMasked, toggleMask }}>
      {children}
    </InvestorPrivacyContext.Provider>
  );
};

export const useInvestorPrivacy = () => useContext(InvestorPrivacyContext);