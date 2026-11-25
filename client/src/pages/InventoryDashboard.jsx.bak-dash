import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import InventoryTopNav from '../components/InventoryTopNav';
import OverflowMaterialTable from '../components/OverflowMaterialTable';
import PurchaseDonutChart from '../components/PurchaseDonutChart';
import PurchaseConsumptionChart from '../components/PurchaseConsumptionChart';
import TimeFilterTabs from '../components/TimeFilterTabs';
import PendingVoucherPanel from '../components/PendingVoucherPanel';
import {
  Users, Truck, PackageSearch, Wrench, ShoppingBag, ShoppingCart,
  RefreshCw, AlertCircle, Clock3, TrendingUp,
} from 'lucide-react';

const STAT_CARDS = [
  { key: 'customers', label: "Customer's", icon: Users },
  { key: 'suppliers', label: "Supplier's", icon: Truck },
  { key: 'materialReq', label: 'Material Req.', icon: PackageSearch },
  { key: 'serviceReq', label: 'Service Req.', icon: Wrench },
  { key: 'purchases', label: 'Purchases', icon: ShoppingBag },
  { key: 'sales', label: 'Sales', icon: ShoppingCart },
];

const SECTIONS = ['summary', 'overflow', 'purchaseChart', 'purchaseConsumption', 'vouchers'];

const ENDPOINTS = {
  summary: '/dashboard/inventory-summary',
  overflow: '/dashboard/overflow-material',
  purchaseChart: '/dashboard/purchase-chart',
  purchaseConsumption: '/dashboard/purchase-vs-consumption',
  vouchers: '/dashboard/pending-vouchers',
};

function formatNumber(value) {
  const n = Number(value);
  return Number.isNaN(n) ? '0' : new Intl.NumberFormat('en-US').format(n);
}

function getErrorMessage(error) {
  if (error?.response) {
    return error.response.data?.message || error.response.data?.error || `Server error (${error.response.status})`;
  }
  if (error?.request) return 'Could not reach the server. Please check your connection.';
  return error?.message || 'Something went wrong while loading this section.';
}

function emptyState(section) {
  switch (section) {
    case 'purchaseChart': return { labels: [], values: [] };
    case 'purchaseConsumption': return { labels: [], purchase: [], consumption: [] };
    case 'overflow': case 'vouchers': return [];
    default: return {};
  }
}

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200/70 ${className}`} />;
}

function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-7 rounded-lg" />
      </div>
      <Skeleton className="h-7 w-16" />
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="h-[220px] flex items-center justify-center">
      <Skeleton className="w-40 h-40 rounded-full" />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3 p-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-3 border-b border-slate-100 pb-3 last:border-0">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="flex-1">
            <Skeleton className="h-3 w-32 mb-2" />
            <Skeleton className="h-2.5 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SectionError({ message, onRetry }) {
  return (
    <div className="min-h-[160px] flex flex-col items-center justify-center text-center px-5">
      <AlertCircle size={22} className="text-red-500 mb-2" />
      <p className="text-sm font-medium text-slate-700 mb-1">Unable to load this section</p>
      <p className="text-xs text-slate-400 max-w-sm mb-4">{message}</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
      >
        <RefreshCw size={13} />
        Try again
      </button>
    </div>
  );
}

function EmptyState({ icon: Icon, title, description }) {
  return (
    <div className="min-h-[160px] flex flex-col items-center justify-center text-center px-5">
      <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center mb-3">
        <Icon size={20} className="text-slate-400" />
      </div>
      <p className="text-sm font-medium text-slate-600">{title}</p>
      <p className="text-xs text-slate-400 mt-1 max-w-xs">{description}</p>
    </div>
  );
}

export default function InventoryDashboard() {
  const [data, setData] = useState({
    summary: {},
    overflow: [],
    purchaseChart: { labels: [], values: [] },
    purchaseConsumption: { labels: [], purchase: [], consumption: [] },
    vouchers: [],
  });
  const [loading, setLoading] = useState(
    SECTIONS.reduce((acc, s) => ({ ...acc, [s]: true }), {})
  );
  const [errors, setErrors] = useState(
    SECTIONS.reduce((acc, s) => ({ ...acc, [s]: null }), {})
  );
  const [range, setRange] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const requestIdRef = useRef(0);

  const loadAll = useCallback(async (currentRange, isRefresh = false) => {
    const requestId = ++requestIdRef.current;
    if (isRefresh) setRefreshing(true);
    setLoading(SECTIONS.reduce((acc, s) => ({ ...acc, [s]: true }), {}));
    setErrors(SECTIONS.reduce((acc, s) => ({ ...acc, [s]: null }), {}));

    const params = { range: currentRange || 'all' };
    const results = await Promise.allSettled(
      SECTIONS.map((s) => api.get(ENDPOINTS[s], { params }))
    );

    if (requestId !== requestIdRef.current) return;

    const nextData = { ...data };
    const nextErrors = { ...errors };
    let successCount = 0;

    results.forEach((result, i) => {
      const section = SECTIONS[i];
      if (result.status === 'fulfilled') {
        successCount += 1;
        nextData[section] = result.value?.data ?? emptyState(section);
        nextErrors[section] = null;
      } else {
        nextData[section] = emptyState(section);
        nextErrors[section] = getErrorMessage(result.reason);
      }
    });

    setData(nextData);
    setErrors(nextErrors);
    setLoading(SECTIONS.reduce((acc, s) => ({ ...acc, [s]: false }), {}));
    if (successCount > 0) setLastUpdated(new Date());
    setRefreshing(false);
  }, [data, errors]);

  useEffect(() => {
    loadAll('all');
  }, []);

  function handleRangeChange(newRange) {
    if (!newRange) return;
    const normalized = String(newRange).toLowerCase();
    setRange(normalized);
    loadAll(normalized);
  }

  function handleRefresh() {
    loadAll(range, true);
  }

  async function retrySection(section) {
    setLoading((p) => ({ ...p, [section]: true }));
    setErrors((p) => ({ ...p, [section]: null }));
    try {
      const res = await api.get(ENDPOINTS[section], { params: { range: range || 'all' } });
      setData((p) => ({ ...p, [section]: res.data ?? emptyState(section) }));
      setLastUpdated(new Date());
    } catch (err) {
      setErrors((p) => ({ ...p, [section]: getErrorMessage(err) }));
    } finally {
      setLoading((p) => ({ ...p, [section]: false }));
    }
  }

  const { summary, overflow, purchaseChart, purchaseConsumption, vouchers } = data;
  const allFailed = SECTIONS.every((s) => errors[s]) && !loading.summary;

  if (allFailed) {
    return (
      <div className="min-h-screen w-full bg-slate-50 text-left">
        <Topbar />
        <InventoryTopNav />
        <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-8">
          <Breadcrumb items={[{ label: 'Home', to: '/dashboard' }, { label: 'Inventory Dashboard' }]} />
          <div className="mt-6 bg-white rounded-2xl border border-red-100 shadow-sm px-6 py-10 flex flex-col items-center text-center">
            <AlertCircle size={28} className="text-red-500 mb-3" />
            <h2 className="text-base font-semibold text-slate-800">Dashboard unavailable</h2>
            <p className="text-sm text-slate-500 mt-1 max-w-md">Could not load any dashboard data. Please try again.</p>
            <button
              onClick={handleRefresh}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition"
            >
              <RefreshCw size={15} />
              Try Again
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 text-left">
      <Topbar />
      <InventoryTopNav />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-6">
          <div>
            <Breadcrumb items={[{ label: 'Home', to: '/dashboard' }, { label: 'Inventory Dashboard' }]} />
            <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">Inventory Dashboard</h1>
            <p className="text-sm text-slate-500 mt-0.5">Overview of stock, purchases, sales, and pending vouchers</p>
          </div>

          <div className="flex items-center gap-2">
            {lastUpdated && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
                <Clock3 size={13} />
                <span>Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            )}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-600 shadow-sm hover:bg-slate-50 disabled:opacity-60 transition"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
          {loading.summary
            ? STAT_CARDS.map(({ key }) => <StatCardSkeleton key={key} />)
            : STAT_CARDS.map(({ key, label, icon: Icon }) => (
              <div key={key} className="bg-white rounded-2xl border border-slate-200 p-4 hover:border-slate-300 hover:shadow-md transition">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{label}</span>
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                    <Icon size={14} className="text-indigo-500" />
                  </div>
                </div>
                {errors.summary ? (
                  <button onClick={() => retrySection('summary')} className="text-xs text-red-500 hover:underline">Retry</button>
                ) : (
                  <div className="text-xl font-semibold text-slate-900 font-mono">{formatNumber(summary?.[key])}</div>
                )}
              </div>
            ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          {/* Left + middle columns */}
          <div className="lg:col-span-2 space-y-4">
            {/* Overflow material */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-700">Overflow Material</h2>
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-slate-100 text-[10px] font-semibold text-slate-500">
                  {overflow.length}
                </span>
              </div>
              <div className="p-3">
                {loading.overflow ? (
                  <TableSkeleton />
                ) : errors.overflow ? (
                  <SectionError message={errors.overflow} onRetry={() => retrySection('overflow')} />
                ) : overflow.length === 0 ? (
                  <EmptyState icon={PackageSearch} title="No overflow material" description="Everything looks good — no excess material found." />
                ) : (
                  <OverflowMaterialTable rows={overflow} />
                )}
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-sm font-semibold text-slate-700">Purchase</h2>
                  <TrendingUp size={16} className="text-indigo-400" />
                </div>
                <p className="text-xs text-slate-400 mb-3">Last 12 months</p>
                {loading.purchaseChart ? (
                  <ChartSkeleton />
                ) : errors.purchaseChart ? (
                  <SectionError message={errors.purchaseChart} onRetry={() => retrySection('purchaseChart')} />
                ) : !purchaseChart?.labels?.length ? (
                  <EmptyState icon={ShoppingBag} title="No purchase data" description="No purchase information available for this period." />
                ) : (
                  <PurchaseDonutChart labels={purchaseChart.labels} values={purchaseChart.values} />
                )}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-slate-700">Purchase vs Consumption</h2>
                  <TrendingUp size={16} className="text-emerald-400" />
                </div>
                {loading.purchaseConsumption ? (
                  <ChartSkeleton />
                ) : errors.purchaseConsumption ? (
                  <SectionError message={errors.purchaseConsumption} onRetry={() => retrySection('purchaseConsumption')} />
                ) : !purchaseConsumption?.labels?.length ? (
                  <EmptyState icon={ShoppingCart} title="No comparison data" description="No purchase or consumption data for this period." />
                ) : (
                  <PurchaseConsumptionChart
                    labels={purchaseConsumption.labels}
                    purchase={purchaseConsumption.purchase}
                    consumption={purchaseConsumption.consumption}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Right column: voucher panel */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden lg:sticky lg:top-4">
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-semibold text-slate-700">Pending Voucher/Invoice</h2>
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-amber-50 text-[10px] font-semibold text-amber-600">
                  {vouchers.length}
                </span>
              </div>
              <TimeFilterTabs onChange={handleRangeChange} />
            </div>
            <div className="p-3">
              {loading.vouchers ? (
                <TableSkeleton />
              ) : errors.vouchers ? (
                <SectionError message={errors.vouchers} onRetry={() => retrySection('vouchers')} />
              ) : vouchers.length === 0 ? (
                <EmptyState icon={Clock3} title="No pending vouchers" description="You're all caught up for the selected period." />
              ) : (
                <PendingVoucherPanel vouchers={vouchers} />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}