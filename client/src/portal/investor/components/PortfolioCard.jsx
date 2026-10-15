import React from 'react';
import AmountText from './AmountText';
import PlainTooltip from './PlainTooltip';

const PortfolioCard = ({ totalInvested, profitEarned, roiPercentage, activeCount }) => {
  return (
    <div className="portfolio-card-glow rounded-3xl p-6 md:p-8 text-white relative overflow-hidden transition-all duration-300">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-300 tracking-wider uppercase font-wealth-body">
            Total Capital In-Motion
          </span>
          <PlainTooltip 
            term="Principal Capital" 
            explanation="The total sum of your active capital invested into real estate developments." 
          />
        </div>
        <span className="rounded-full bg-white/10 px-3 py-0.5 text-xs font-medium text-emerald-300 backdrop-blur-md">
          {activeCount} Active Agreement{activeCount === 1 ? '' : 's'}
        </span>
      </div>

      <div className="my-3">
        <AmountText
          amount={totalInvested}
          className="text-3xl md:text-5xl font-bold text-white tracking-tight font-wealth-display"
        />
      </div>

      <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs font-wealth-body">
        <div>
          <span className="block text-slate-400 text-[11px] mb-0.5">Profit Earned</span>
          <AmountText amount={profitEarned} className="text-base font-semibold text-emerald-400" />
        </div>
        <div className="text-right">
          <span className="block text-slate-400 text-[11px] mb-0.5">Net Portfolio Return</span>
          <span className="text-base font-semibold text-white font-wealth-display tabular-nums">
            +{Number(roiPercentage || 0).toFixed(1)}% ROI
          </span>
        </div>
      </div>
    </div>
  );
};

export default PortfolioCard;