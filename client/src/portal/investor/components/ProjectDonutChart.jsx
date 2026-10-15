import React from 'react';
import AmountText from './AmountText';

const PALETTE = ['#3347B8', '#12B886', '#7C3AED', '#0284C7', '#64748B'];

const ProjectDonutChart = ({ allocation = [] }) => {
  if (!allocation || allocation.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-white p-6 text-center text-xs text-slate-400">
        No active capital distribution.
      </div>
    );
  }

  const size = 160;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativeOffset = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
      <div className="relative flex items-center justify-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#F1F5F9"
            strokeWidth={strokeWidth}
          />
          {allocation.map((item, idx) => {
            const pct = item.percentage || 0;
            const strokeDasharray = `${(pct / 100) * circumference} ${circumference}`;
            const strokeDashoffset = -cumulativeOffset;
            cumulativeOffset += (pct / 100) * circumference;
            const color = PALETTE[idx % PALETTE.length];

            return (
              <circle
                key={item.project}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="butt"
              />
            );
          })}
        </svg>
        <div className="absolute text-center">
          <span className="block text-[11px] text-slate-400 font-medium uppercase tracking-wider">Spread</span>
          <span className="block text-lg font-bold text-[#0B1530] font-wealth-display">{allocation.length} Projects</span>
        </div>
      </div>

      <div className="w-full flex-1 space-y-2.5">
        {allocation.map((item, idx) => {
          const color = PALETTE[idx % PALETTE.length];
          return (
            <div key={item.project} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                <span className="font-medium text-slate-700 truncate max-w-[140px] sm:max-w-[180px]">{item.project}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-400 tabular-nums">{item.percentage}%</span>
                <AmountText amount={item.amount} className="font-semibold text-slate-800" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProjectDonutChart;