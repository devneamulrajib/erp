import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { ArrowLeft, Pencil, Loader2, User, Download } from 'lucide-react';

function fmtDate(d, opts) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', opts);
}

const SHORT_DATE = { day: '2-digit', month: 'short', year: 'numeric' };

function InfoField({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value || '—'}</p>
    </div>
  );
}

function RichBlock({ label, html }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1.5">{label}</p>
      {html ? (
        <div
          className="prose prose-sm max-w-none border border-gray-100 rounded-lg p-3 bg-gray-50/50"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <p className="text-sm text-gray-400">—</p>
      )}
    </div>
  );
}

const PARTY_ROW_FIELDS = ['phone', 'email', 'nid', 'type', 'position'];
const PARTY_LABELS = { phone: 'Phone', email: 'Email', nid: 'NID', type: 'Type', position: 'Position' };

export default function AgreementView() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [agreement, setAgreement] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get(`/agreements/${id}`)
      .then((res) => !cancelled && setAgreement(res.data))
      .catch((err) => {
        console.error(err);
        if (!cancelled) setError('Failed to load agreement.');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [id]);

  const parties = agreement?.parties || [];
  const payments = agreement?.payments || [];
  const paymentsTotal = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

  async function handleDownloadPdf() {
    if (!agreement) return;
    setDownloading(true);
    try {
      const res = await api.get(`/agreements/${agreement.id}/pdf`, { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(agreement.reference || `agreement-${agreement.id}`).replace(/[^a-z0-9-_]+/gi, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to download PDF.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 text-left">
      <Topbar />
      <div className="max-w-6xl mx-auto px-6 pt-6 pb-10">
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div>
            <Breadcrumb
              items={[
                { label: 'Home', to: '/dashboard' },
                { label: 'Accounts Module', to: '/accounts-module/agreement_list' },
                { label: 'View Agreement' },
              ]}
            />
            <h1 className="text-2xl font-bold text-gray-900 mt-2">{agreement?.reference || 'View Agreement'}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {agreement?.project ? `Project: ${agreement.project}` : 'Agreement details'}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {agreement && (
              <>
                <button
                  onClick={handleDownloadPdf}
                  disabled={downloading}
                  className="flex items-center gap-1.5 bg-gray-900 hover:bg-black text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm disabled:opacity-50 transition-colors"
                >
                  {downloading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} strokeWidth={2.5} />}
                  {downloading ? 'Preparing...' : 'Download PDF'}
                </button>
                <button
                  onClick={() => navigate(`/accounts-module/agreement_list_add/${agreement.id}`)}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg shadow-sm transition-colors"
                >
                  <Pencil size={16} strokeWidth={2.5} />
                  Edit
                </button>
              </>
            )}
            <button
              onClick={() => navigate('/accounts-module/agreement_list')}
              className="flex items-center gap-1.5 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold px-4 py-2.5 rounded-lg border border-gray-200 shadow-sm transition-colors"
            >
              <ArrowLeft size={16} strokeWidth={2.5} />
              Agreement List
            </button>
          </div>
        </div>

        {loading && (
          <div className="bg-white rounded-xl border border-gray-200 p-10 flex items-center justify-center text-gray-400 text-sm">
            <Loader2 size={18} className="animate-spin mr-2" />
            Loading agreement...
          </div>
        )}

        {!loading && error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-4 text-sm">{error}</div>
        )}

        {!loading && !error && agreement && (
          <div className="flex flex-col gap-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">Basic Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <InfoField label="Date" value={fmtDate(agreement.date, SHORT_DATE)} />
                <InfoField label="Project" value={agreement.project} />
                <InfoField label="Reference" value={agreement.reference} />
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">Agreement Content</h2>
              <div className="flex flex-col gap-4">
                <InfoField label="Title" value={agreement.title} />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <RichBlock label="Terms & Conditions" html={agreement.termsConditions} />
                  <RichBlock label="Footer" html={agreement.footer} />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">Agreement Party</h2>
              {parties.length === 0 ? (
                <p className="text-sm text-gray-400">No parties added.</p>
              ) : (
                <div className="flex flex-col gap-4">
                  {parties.map((p, i) => (
                    <div key={p.id ?? i} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-3">
                        {p.image ? (
                          <img src={p.image} alt={p.name} className="w-10 h-10 rounded-lg object-cover border border-gray-200" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-300">
                            <User size={18} />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{p.name || 'Unnamed party'}</p>
                          <p className="text-xs text-gray-500">{p.selectParty || '—'}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                        {PARTY_ROW_FIELDS.map((f) => (
                          <div key={f}>
                            <span className="text-gray-500">{PARTY_LABELS[f]}:</span>{' '}
                            <span className="text-gray-800">{p[f] || '—'}</span>
                          </div>
                        ))}
                        <div className="sm:col-span-2 lg:col-span-1">
                          <span className="text-gray-500">Address:</span>{' '}
                          <span className="text-gray-800">{p.address || '—'}</span>
                        </div>
                        {p.details && (
                          <div className="sm:col-span-2 lg:col-span-3">
                            <span className="text-gray-500">Details:</span> <span className="text-gray-800">{p.details}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-gray-100">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400">Payment Details</h2>
              </div>
              {payments.length === 0 ? (
                <p className="text-sm text-gray-400 px-5 py-4">No payments added.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="px-5 py-2.5 text-left font-semibold uppercase tracking-wider text-gray-400 text-xs">Details</th>
                      <th className="px-5 py-2.5 text-left font-semibold uppercase tracking-wider text-gray-400 text-xs w-48">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p, i) => (
                      <tr key={p.id ?? i} className="border-b border-gray-50 last:border-0">
                        <td className="px-5 py-2.5 text-gray-800">{p.particulars || p.details || '—'}</td>
                        <td className="px-5 py-2.5 text-gray-800">{(parseFloat(p.amount) || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td className="px-5 py-2.5 text-sm font-semibold text-gray-700">Total</td>
                      <td className="px-5 py-2.5 text-sm font-bold text-indigo-600">{paymentsTotal.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}