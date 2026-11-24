// client/src/components/PageLoader.jsx
// Light loading placeholder shown while a lazily loaded page's chunk downloads.
import { Skeleton } from './dashboard/DashboardKit';

export function PageLoader() {
  return (
    <div className="min-h-screen w-full bg-slate-50 p-4 sm:p-6" role="status" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <div className="mx-auto max-w-7xl space-y-4">
        <Skeleton className="h-28 w-full rounded-3xl" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
