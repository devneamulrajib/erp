import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { getFlats } from '../api/flat';
import { getCustomers } from '../api/customer';
import { getFlatSale, getNextFlatSaleCode, createFlatSale, updateFlatSale } from '../api/flatSale';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import CustomerAddModal from '../components/CustomerAddModal';
import { Plus, X, UserPlus, List } from 'lucide-react';

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function addMonths(dateStr, months) {
  const d = dateStr ? new Date(dateStr) : new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

const inputClass =
  'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition';
const inputReadonlyClass =
  'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-slate-50 text-slate-500';

export default function FlatSaleForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [projects, setProjects] = useState([]);
  const [sites, setSites] = useState([]);
  const [flats, setFlats] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [projectTypes, setProjectTypes] = useState([]);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [code, setCode] = useState('');
  const [bookingNo, setBookingNo] = useState('');
  const [project, setProject] = useState('');
  const [site, setSite] = useState('');
  const [flatId, setFlatId] = useState('');
  const [collectionOfficer, setCollectionOfficer] = useState('');
  const [attachmentName, setAttachmentName] = useState('');

  const [customerId, setCustomerId] = useState('');
  const [projectType, setProjectType] = useState('');
  const [salesBy, setSalesBy] = useState('');
  const [ledger, setLedger] = useState('Flat Sales');

  const [rate, setRate] = useState('');
  const [parking, setParking] = useState('');
  const [utilityCharge, setUtilityCharge] = useState('');
  const [otherCost, setOtherCost] = useState('');
  const [discount, setDiscount] = useState('');

  const [bookingMoney, setBookingMoney] = useState('');
  const [ifCheque, setIfCheque] = useState(false);
  const [chequeReceiptNo, setChequeReceiptNo] = useState('');

  const [noOfInstallment, setNoOfInstallment] = useState('');
  const [ifManual, setIfManual] = useState(false);
  const [installments, setInstallments] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/projects').then((res) => setProjects(res.data)).catch(() => {});
    api.get('/sites').then((res) => setSites(res.data)).catch(() => {});
    api.get('/project-types').then((res) => setProjectTypes(res.data)).catch(() => {});
    getCustomers().then(setCustomers).catch(() => {});
  }, []);

  const loadFlats = useCallback(async () => {
    if (!project) { setFlats([]); return; }
    try {
      const data = await getFlats({ project, status: 'Available' });
      let list = Array.isArray(data) ? data : data.flats || [];
      if (isEdit && flatId && !list.some((f) => f.id === flatId)) {
        const current = await getFlats({ project });
        const currentList = Array.isArray(current) ? current : current.flats || [];
        const match = currentList.find((f) => f.id === flatId);
        if (match) list = [...list, match];
      }
      setFlats(list);
    } catch {
      setFlats([]);
    }
  }, [project, isEdit, flatId]);

  useEffect(() => {
    loadFlats();
  }, [loadFlats]);

  useEffect(() => {
    if (isEdit) return;
    getNextFlatSaleCode().then(setCode).catch(() => {});
  }, [isEdit]);

  useEffect(() => {
    if (!isEdit) return;
    getFlatSale(id).then((sale) => {
      setDate(sale.date || '');
      setCode(sale.code || '');
      setBookingNo(sale.bookingNo || '');
      setProject(sale.project?.id || sale.project || '');
      setSite(sale.site?.id || sale.site || '');
      setFlatId(sale.flat?.id || sale.flat || '');
      setCollectionOfficer(sale.collectionOfficer || '');
      setCustomerId(sale.customer?.id || sale.customer || '');
      setProjectType(sale.projectType?.id || sale.projectType || '');
      setSalesBy(sale.salesBy || '');
      setLedger(sale.ledger || 'Flat Sales');
      setRate(sale.rate ?? '');
      setParking(sale.parking ?? '');
      setUtilityCharge(sale.utilityCharge ?? '');
      setOtherCost(sale.otherCost ?? '');
      setDiscount(sale.discount ?? '');
      setBookingMoney(sale.bookingMoney ?? '');
      setIfCheque(sale.paymentMethod === 'Cheque');
      setChequeReceiptNo(sale.chequeReceiptNo || '');
      setInstallments(sale.installments || []);
    }).catch((err) => {
      console.error(err);
      setError('Failed to load Flat/Land sale.');
    });
  }, [id, isEdit]);

  const selectedFlat = useMemo(
    () => flats.find((f) => f.id === flatId),
    [flats, flatId]
  );

  useEffect(() => {
    if (selectedFlat && rate === '') {
      setRate(selectedFlat.price ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFlat]);

  const flatSize = selectedFlat?.size ? num(selectedFlat.size) : 0;
  const subtotal = num(rate) * flatSize;
  const grandTotal = subtotal + num(parking) + num(utilityCharge) + num(otherCost) - num(discount);
  const dueAmount = grandTotal - num(bookingMoney);
  const installmentTotal = installments.reduce((sum, r) => sum + num(r.amount), 0);

  function generateInstallments() {
    const n = Math.max(0, parseInt(noOfInstallment, 10) || 0);
    if (ifManual || n === 0) {
      setInstallments((prev) => [...prev, { date: date, type: 'Installment', amount: '' }]);
      return;
    }
    const perInstallment = n > 0 ? Math.round((grandTotal - num(bookingMoney)) / n) : 0;
    const rows = Array.from({ length: n }, (_, i) => ({
      date: addMonths(date, i + 1),
      type: 'Installment',
      amount: perInstallment,
    }));
    setInstallments(rows);
  }

  function updateInstallment(index, key, value) {
    setInstallments((prev) => prev.map((r, i) => (i === index ? { ...r, [key]: value } : r)));
  }
  function removeInstallment(index) {
    setInstallments((prev) => prev.filter((_, i) => i !== index));
  }

  function handleCustomerCreated(customer) {
    setCustomers((prev) => [customer, ...prev]);
    setCustomerId(customer.id);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!project || !flatId || !customerId) {
      setError('Project, Flat/Land No and Customer are required');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        code, date, bookingNo, project, site, flat: flatId, customer: customerId,
        projectType, collectionOfficer, salesBy, ledger, attachment: attachmentName,
        rate: num(rate), parking: num(parking), utilityCharge: num(utilityCharge),
        otherCost: num(otherCost), discount: num(discount),
        bookingMoney: num(bookingMoney),
        paymentMethod: ifCheque ? 'Cheque' : 'Cash',
        chequeReceiptNo,
        installments: installments.map((r) => ({ ...r, amount: num(r.amount) })),
      };
      if (isEdit) {
        await updateFlatSale(id, payload);
      } else {
        await createFlatSale(payload);
      }
      navigate('/inventory-module/flat-sale');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save Flat/Land sale');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 text-left">
      <Topbar />

      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <Breadcrumb
              items={[
                { label: 'Home', to: '/dashboard' },
                { label: 'Flat/Land', to: '/inventory-module/flat-sale' },
                { label: 'Flat/Land Sale' },
              ]}
            />
            <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">
              {isEdit ? 'Edit Flat/Land Sale' : 'New Flat/Land Sale'}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Capture booking, pricing, and installment details</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCustomerModalOpen(true)}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-emerald-600/20 transition-colors"
            >
              <UserPlus size={16} />
              Contacts Add
            </button>
            <button
              type="button"
              onClick={() => navigate('/inventory-module/flat-sale')}
              className="inline-flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
            >
              <List size={16} />
              Sale List
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="pb-10">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">{error}</div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Booking Info</h3>
              <Field label="Date">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Code">
                <input value={code} readOnly className={inputReadonlyClass} />
              </Field>
              <Field label="Booking No">
                <input value={bookingNo} onChange={(e) => setBookingNo(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Project" required>
                <select value={project} onChange={(e) => { setProject(e.target.value); setFlatId(''); }} className={inputClass}>
                  <option value="">Select Project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Flat/Land No" required>
                <select value={flatId} onChange={(e) => { setFlatId(e.target.value); setRate(''); }} className={inputClass} disabled={!project}>
                  <option value="">Select Flat/Land No</option>
                  {flats.map((f) => (
                    <option key={f.id} value={f.id}>{f.flatLandNo}</option>
                  ))}
                </select>
              </Field>
              <Field label="Collection Officer">
                <input value={collectionOfficer} onChange={(e) => setCollectionOfficer(e.target.value)} className={inputClass} />
              </Field>
              <Field label="If Attachment">
                <input
                  type="file"
                  onChange={(e) => setAttachmentName(e.target.files?.[0]?.name || '')}
                  className="w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:text-indigo-600 file:text-sm file:font-medium hover:file:bg-indigo-100 border border-slate-200 rounded-lg px-1 py-1 bg-white"
                />
              </Field>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Customer & Sale</h3>
              <Field label="Customer" required>
                <div className="flex gap-2">
                  <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={`${inputClass} flex-1`}>
                    <option value="">Select One Option</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setCustomerModalOpen(true)}
                    className="w-10 h-10 flex items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex-shrink-0"
                    title="Add new customer"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </Field>
              <Field label="Project Type">
                <select value={projectType} onChange={(e) => setProjectType(e.target.value)} className={inputClass}>
                  <option value="">Select Project Type</option>
                  {projectTypes.map((pt) => (
                    <option key={pt.id} value={pt.id}>{pt.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Site">
                <select value={site} onChange={(e) => setSite(e.target.value)} className={inputClass}>
                  <option value="">Select Site</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Sales By">
                <input value={salesBy} onChange={(e) => setSalesBy(e.target.value)} className={inputClass} />
              </Field>
              <Field label="Ledger">
                <input value={ledger} onChange={(e) => setLedger(e.target.value)} className={inputClass} />
              </Field>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Unit Details</h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
                <InfoRow label="Flat No" value={selectedFlat?.flatLandNo} />
                <InfoRow label="Flat Size" value={selectedFlat?.size} />
                <InfoRow label="Plot No" value="-" />
                <InfoRow label="Plot Size" value="-" />
                <InfoRow label="Block Name" value="-" />
                <InfoRow label="Road No" value="-" />
                <InfoRow label="Bedroom" value={selectedFlat?.bedroom} />
                <InfoRow label="Bathroom" value={selectedFlat?.bathroom} />
                <InfoRow label="Drawing" value={selectedFlat?.drawing} />
                <InfoRow label="Dining" value={selectedFlat?.dining} />
                <InfoRow label="Kitchen" value={selectedFlat?.kitchen} />
                <InfoRow label="Balcony" value={selectedFlat?.balcony} />
                <InfoRow label="Parking" value={selectedFlat?.parking} />
                <InfoRow label="Basement" value={selectedFlat?.basement} />
                <InfoRow label="Facing" value={selectedFlat?.facing} />
                <InfoRow label="Note" value={selectedFlat?.amenities} />
                <InfoRow label="Unit" value={selectedFlat?.unit} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Installments</h3>
              <div className="flex items-end gap-3 mb-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">No Of Installment</label>
                  <input
                    type="number"
                    min="0"
                    value={noOfInstallment}
                    onChange={(e) => setNoOfInstallment(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <button
                  type="button"
                  onClick={generateInstallments}
                  className="w-10 h-10 flex items-center justify-center rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex-shrink-0"
                >
                  <Plus size={16} />
                </button>
                <label className="flex items-center gap-1.5 text-sm text-slate-600 h-10 flex-shrink-0">
                  <input type="checkbox" checked={ifManual} onChange={(e) => setIfManual(e.target.checked)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30" />
                  If Manual
                </label>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500">
                      <th className="px-3 py-2.5 text-left font-medium uppercase tracking-wide">SL.</th>
                      <th className="px-3 py-2.5 text-left font-medium uppercase tracking-wide">Date</th>
                      <th className="px-3 py-2.5 text-left font-medium uppercase tracking-wide">Type</th>
                      <th className="px-3 py-2.5 text-left font-medium uppercase tracking-wide">Amount</th>
                      <th className="px-3 py-2.5 text-left font-medium uppercase tracking-wide">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {installments.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-6 text-slate-400">No installments yet</td></tr>
                    ) : (
                      installments.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-3 py-2 text-slate-400 font-mono">{i + 1}</td>
                          <td className="px-3 py-2">
                            <input type="date" value={row.date} onChange={(e) => updateInstallment(i, 'date', e.target.value)} className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                          </td>
                          <td className="px-3 py-2">
                            <input value={row.type} onChange={(e) => updateInstallment(i, 'type', e.target.value)} className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                          </td>
                          <td className="px-3 py-2">
                            <input type="number" value={row.amount} onChange={(e) => updateInstallment(i, 'amount', e.target.value)} className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30" />
                          </td>
                          <td className="px-3 py-2">
                            <button type="button" onClick={() => removeInstallment(i)} className="w-6 h-6 flex items-center justify-center rounded-md bg-red-50 hover:bg-red-100 text-red-500 transition-colors">
                              <X size={13} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-slate-200 font-medium bg-slate-50/50">
                      <td className="px-3 py-2.5" colSpan={3}>Total</td>
                      <td className="px-3 py-2.5 text-slate-900">{installmentTotal.toLocaleString()}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Pricing</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Rate">
                    <input type="number" value={rate} onChange={(e) => setRate(e.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Subtotal">
                    <input value={subtotal.toLocaleString()} readOnly className={inputReadonlyClass} />
                  </Field>
                  <Field label="Parking">
                    <input type="number" value={parking} onChange={(e) => setParking(e.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Utility Charge">
                    <input type="number" value={utilityCharge} onChange={(e) => setUtilityCharge(e.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Other Cost">
                    <input type="number" value={otherCost} onChange={(e) => setOtherCost(e.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Discount">
                    <input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} className={inputClass} />
                  </Field>
                  <Field label="Grand Total">
                    <input value={grandTotal.toLocaleString()} readOnly className={`${inputReadonlyClass} font-semibold text-slate-900`} />
                  </Field>
                  <Field label="Due Amount">
                    <input value={dueAmount.toLocaleString()} readOnly className={`${inputReadonlyClass} text-red-600 font-semibold`} />
                  </Field>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Payment Info</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Booking Money">
                    <input type="number" value={bookingMoney} onChange={(e) => setBookingMoney(e.target.value)} className={inputClass} />
                  </Field>
                  <Field label={
                    <span className="flex items-center justify-between">
                      Method
                      <label className="flex items-center gap-1 text-xs font-normal text-slate-500">
                        <input type="checkbox" checked={ifCheque} onChange={(e) => setIfCheque(e.target.checked)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30" />
                        If Cheque
                      </label>
                    </span>
                  }>
                    <input value={ifCheque ? 'Cheque' : 'Cash'} readOnly className={inputReadonlyClass} />
                  </Field>
                  {ifCheque && (
                    <Field label="Cheque Receipt No">
                      <input value={chequeReceiptNo} onChange={(e) => setChequeReceiptNo(e.target.value)} className={inputClass} />
                    </Field>
                  )}
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-8 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 disabled:opacity-50 transition-colors"
          >
            {submitting ? 'Saving...' : 'Submit'}
          </button>
        </form>
      </div>

      <CustomerAddModal
        open={customerModalOpen}
        onClose={() => setCustomerModalOpen(false)}
        onCreated={handleCustomerCreated}
      />
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between border-b border-slate-100 pb-1.5">
      <span className="text-slate-400">{label}</span>
      <span className="text-slate-700 font-medium">{value ?? '-'}</span>
    </div>
  );
}