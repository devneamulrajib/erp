// client/src/pages/InvestmentListPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Topbar from '../components/Topbar';
import ModuleNav from '../components/ModuleNav';
import Breadcrumb from '../components/Breadcrumb';
import { getInvestments } from '../api/investor';

const formatBDT = (amount) => `৳ ${Number(amount || 0).toLocaleString('en-IN')}`;

export default function InvestmentListPage() {
  const navigate = useNavigate();
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getInvestments()
      .then((res) => setInvestments(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <Topbar />
      <ModuleNav />

      <div className="p-6 space-y-6">
        <Breadcrumb
          items={[
            { label: 'Home', path: '/' },
            { label: 'Investor Management', path: '/investors/dashboard' },
            { label: 'All Investments' },
          ]}
        />

        <div className="flex justify-between items-center bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Investment Records</h1>
            <p className="text-sm text-slate-500 mt-1">Track principal capital, profit shares, and disbursement status</p>
          </div>
          <button
            onClick={() => navigate('/investors/dashboard')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-sm font-medium"
          >
            ← Back to Dashboard
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-700 text-xs uppercase border-b border-slate-200">
              <tr>
                <th className="p-3.5">Code</th>
                <th className="p-3.5">Investor</th>
                <th className="p-3.5">Project</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Principal</th>
                <th className="p-3.5">Profit Share</th>
                <th className="p-3.5">Current Value</th>
                <th className="p-3.5">ROI %</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {investments.map((inv) => {
                const m = inv.metrics || {};
                return (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="p-3.5 font-bold text-slate-900">{inv.investmentCode}</td>
                    <td className="p-3.5 font-semibold text-slate-800">{inv.investor?.name}</td>
                    <td className="p-3.5">{inv.project?.name || 'General Business'}</td>
                    <td className="p-3.5 text-slate-500">{inv.investmentDate}</td>
                    <td className="p-3.5 font-bold text-slate-800">{formatBDT(m.principal)}</td>
                    <td className="p-3.5 font-semibold text-emerald-600">{formatBDT(m.profitGenerated)}</td>
                    <td className="p-3.5 font-bold text-blue-700">{formatBDT(m.currentInvestmentValue)}</td>
                    <td className="p-3.5 font-bold text-amber-600">{m.roiPercent}%</td>
                    <td className="p-3.5 capitalize text-xs">
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">
                        {inv.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => navigate(`/investments/${inv.id}`)}
                        className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded font-semibold text-xs transition"
                      >
                        View ROI Flow →
                      </button>
                    </td>
                  </tr>
                );
              })}
              {investments.length === 0 && (
                <tr>
                  <td colSpan="10" className="p-8 text-center text-slate-400">
                    {loading ? 'Loading...' : 'No investments recorded yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}