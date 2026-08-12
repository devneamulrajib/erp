import { useEffect, useState } from 'react';
import api from '../api/axios';
import Topbar from '../components/Topbar';
import InventoryTopNav from '../components/InventoryTopNav';
import StatCard from '../components/StatCard';
import OverflowMaterialTable from '../components/OverflowMaterialTable';
import PurchaseDonutChart from '../components/PurchaseDonutChart';
import PurchaseConsumptionChart from '../components/PurchaseConsumptionChart';
import TimeFilterTabs from '../components/TimeFilterTabs';
import PendingVoucherPanel from '../components/PendingVoucherPanel';

export default function InventoryDashboard() {
  const [summary, setSummary] = useState(null);
  const [overflowMaterial, setOverflowMaterial] = useState([]);
  const [purchaseChart, setPurchaseChart] = useState({ labels: [], values: [] });
  const [purchaseVsConsumption, setPurchaseVsConsumption] = useState({ labels: [], purchase: [], consumption: [] });
  const [vouchers, setVouchers] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadAll() {
      try {
        const [summaryRes, overflowRes, purchaseRes, pvcRes, vouchersRes] = await Promise.all([
          api.get('/dashboard/inventory-summary'),
          api.get('/dashboard/overflow-material'),
          api.get('/dashboard/purchase-chart'),
          api.get('/dashboard/purchase-vs-consumption'),
          api.get('/dashboard/pending-vouchers'),
        ]);
        setSummary(summaryRes.data);
        setOverflowMaterial(overflowRes.data);
        setPurchaseChart(purchaseRes.data);
        setPurchaseVsConsumption(pvcRes.data);
        setVouchers(vouchersRes.data);
      } catch (err) {
        console.error('Failed to load inventory dashboard:', err);
        setError(
          err.response
            ? `Server error ${err.response.status}: ${err.response.config?.url || 'unknown endpoint'}`
            : 'Could not reach the server. Is it running?'
        );
      }
    }
    loadAll();
  }, []);

  function handleRangeChange(range) {
    // Wire this to re-fetch /pending-vouchers (and other widgets) with ?range=range once
    // the backend supports filtering by Today/Weekly/Monthly/Yearly/All.
    console.log('Selected range:', range);
  }

  if (error) {
    return (
      <div className="min-h-screen w-full bg-gray-50 text-left">
        <Topbar />
        <InventoryTopNav />
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4">
            <p className="font-semibold mb-1">Failed to load dashboard data</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!summary) return <div className="p-6">Loading...</div>;

  return (
    <div className="min-h-screen w-full bg-gray-50 text-left">
      <Topbar />
      <InventoryTopNav />

      <div className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4 items-start">
          {/* Left + middle columns */}
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <StatCard label="Customer's" value={summary.customers} colorFrom="#78350f" colorTo="#374151" />
              <StatCard label="Supplier's" value={summary.suppliers} colorFrom="#0d9488" colorTo="#134e4a" />
              <StatCard label="Material Req." value={summary.materialReq} colorFrom="#065f46" colorTo="#134e4a" />
              <StatCard label="Service Req." value={summary.serviceReq} colorFrom="#be185d" colorTo="#9d174d" />
              <StatCard label="Purchases" value={summary.purchases} colorFrom="#f97316" colorTo="#dc2626" />
              <StatCard label="Sales" value={summary.sales} colorFrom="#0ea5e9" colorTo="#0369a1" />
            </div>

            <OverflowMaterialTable rows={overflowMaterial} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <PurchaseDonutChart labels={purchaseChart.labels} values={purchaseChart.values} />
              <PurchaseConsumptionChart
                labels={purchaseVsConsumption.labels}
                purchase={purchaseVsConsumption.purchase}
                consumption={purchaseVsConsumption.consumption}
              />
            </div>
          </div>

          {/* Right column: voucher panel */}
          <div>
            <div className="mb-2 flex justify-end">
              <TimeFilterTabs onChange={handleRangeChange} />
            </div>
            <PendingVoucherPanel vouchers={vouchers} />
          </div>
        </div>
      </div>
    </div>
  );
}