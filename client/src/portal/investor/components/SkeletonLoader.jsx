import React from 'react';

export const PortfolioCardSkeleton = () => (
  <div className="h-52 w-full animate-pulse rounded-3xl bg-slate-200/80" />
);

export const CardSkeleton = ({ count = 3 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="h-28 w-full animate-pulse rounded-2xl bg-slate-200/60" />
    ))}
  </div>
);