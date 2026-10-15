import React from 'react';
import AmountText from './AmountText';

const MilestoneTimeline = ({ milestones = [] }) => {
  if (!milestones.length) return null;

  return (
    <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
      {milestones.map((m, idx) => {
        const isDone = m.status === 'completed';
        return (
          <div key={idx} className="relative group">
            <div
              className={`absolute -left-6 top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 bg-white ${
                isDone ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-indigo-600'
              }`}
            >
              {isDone ? (
                <span className="text-[9px] font-bold">✓</span>
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-600" />
              )}
            </div>

            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-[#0B1530]">{m.title}</p>
                <p className="text-[11px] text-slate-400">{m.date}</p>
              </div>
              {m.amount !== undefined && (
                <AmountText amount={m.amount} className="text-xs font-semibold text-slate-800" />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MilestoneTimeline;