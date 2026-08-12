import { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { getFlats } from '../api/flat';
import { getCustomers } from '../api/customer';
import { getFlatSale, getNextFlatSaleCode, createFlatSale, updateFlatSale } from '../api/flatSale';
import Topbar from '../components/Topbar';
import ModuleNav from '../components/ModuleNav';
import Breadcrumb from '../components/Breadcrumb';
import CustomerAddModal from '../components/CustomerAddModal';
import { Plus, X } from 'lucide-react';

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function addMonths(dateStr, months) {
  const d = dateStr ? new Date(dateStr) : new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export default function FlatSaleForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [projects, setProjects] = useState([]);
  const [sites, setSites] = useState([]);
  const [flats, setFlats] = useState([]);
  const [customers, setCustomers] = useState([]);
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
    getCustomers().then(setCustomers).catch(() => {});
  }, []);

  // Flats available for the chosen project (plus, in edit mode, the flat
  // already attached to this sale so it still shows up even though it's Booked)
  const loadFlats = useCallback(async () => {
    if (!project) { setFlats([]); return; }
    try {
      const data = await getFlats({ project, status: 'Available' });
      let list = Array.isArray(data) ? data : data.flats || [];
      if (isEdit && flatId && !list.some((f) => f._id === flatId)) {
        const current = await getFlats({ project });
        const currentList = Array.isArray(current) ? current : current.flats || [];
        const match = currentList.find((f) => f._id === flatId);
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
      setProject(sale.project?._id || sale.project || '');
      setSite(sale.site?._id || sale.site || '');
      setFlatId(sale.flat?._id || sale.flat || '');
      setCollectionOfficer(sale.collectionOfficer || '');
      setCustomerId(sale.customer?._id || sale.customer || '');
      setProjectType(sale.projectType || '');
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
    () => flats.find((f) => f._id === flatId),
    [flats, flatId]
  );

  // Auto-fill rate from the flat's listed price the first time it's picked
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
    setCustomerId(customer._id);
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
    <div className="min-h-screen w-full bg-gray-50 text-left">
      <Topbar />
      <ModuleNav />

      <div className="flex items-center justify-between pr-4">
        <Breadcrumb
          items={[
            { label: 'Home', to: '/dashboard' },
            { label: 'Flat/Land', to: '/inventory-module/flat-sale' },
            { label: 'Flat/Land Sale' },
          ]}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setCustomerModalOpen(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-2 rounded-md"
          >
            Contacts Add
          </button>
          <button
            type="button"
            onClick={() => navigate('/inventory-module/flat-sale')}
            className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-md"
          >
            Flat/Land Sale list
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="px-4 pb-10">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-4">{error}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* Left column */}
          <div className="space-y-4">
            <Field label="Date">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input" />
            </Field>
            <Field label="Code">
              <input value={code} readOnly className="input bg-gray-50" />
            </Field>
            <Field label="Booking No">
              <input value={bookingNo} onChange={(e) => setBookingNo(e.target.value)} className="input" />
            </Field>
            <Field label="Project" required>
              <select value={project} onChange={(e) => { setProject(e.target.value); setFlatId(''); }} className="input">
                <option value="">Select Project</option>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Flat/Land No" required>
              <select value={flatId} onChange={(e) => { setFlatId(e.target.value); setRate(''); }} className="input" disabled={!project}>
                <option value="">Select Flat/Land No</option>
                {flats.map((f) => (
                  <option key={f._id} value={f._id}>{f.flatLandNo}</option>
                ))}
              </select>
            </Field>
            <Field label="Collection Officer">
              <input value={collectionOfficer} onChange={(e) => setCollectionOfficer(e.target.value)} className="input" />
            </Field>
            <Field label="If Attachment">
              <input
                type="file"
                onChange={(e) => setAttachmentName(e.target.files?.[0]?.name || '')}
                className="input"
              />
            </Field>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            <Field label="Customer" required>
              <div className="flex gap-2">
                <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="input flex-1">
                  <option value="">Select One Option</option>
                  {customers.map((c) => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setCustomerModalOpen(true)}
                  className="px-3 rounded-md bg-indigo-500 hover:bg-indigo-600 text-white"
                  title="Add new customer"
                >
                  <Plus size={16} />
                </button>
              </div>
            </Field>
            <Field label="Project Type">
              <input value={projectType} onChange={(e) => setProjectType(e.target.value)} className="input" placeholder="Select Project Type" />
            </Field>
            <Field label="Site">
              <select value={site} onChange={(e) => setSite(e.target.value)} className="input">
                <option value="">Select Site</option>
                {sites.map((s) => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Sales By">
              <input value={salesBy} onChange={(e) => setSalesBy(e.target.value)} className="input" />
            </Field>
            <Field label="Ledger">
              <input value={ledger} onChange={(e) => setLedger(e.target.value)} className="input" />
            </Field>
          </div>

          {/* Flat/Plot info panel */}
          <div className="bg-white border border-gray-200 rounded-md p-4">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
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

        {/* Installments + totals */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex-1">
                <label className="block text-sm text-gray-600 mb-1">No Of Installment</label>
                <input
                  type="number"
                  min="0"
                  value={noOfInstallment}
                  onChange={(e) => setNoOfInstallment(e.target.value)}
                  className="input"
                />
              </div>
              <button
                type="button"
                onClick={generateInstallments}
                className="mt-6 px-3 py-2 rounded-md bg-indigo-500 hover:bg-indigo-600 text-white"
              >
                <Plus size={16} />
              </button>
              <label className="mt-6 flex items-center gap-1.5 text-sm text-gray-700">
                <input type="checkbox" checked={ifManual} onChange={(e) => setIfManual(e.target.checked)} />
                If Manual
              </label>
            </div>

            <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-indigo-500 text-white">
                    <th className="px-2 py-2 text-left font-medium">SL.</th>
                    <th className="px-2 py-2 text-left font-medium">Date</th>
                    <th className="px-2 py-2 text-left font-medium">Type</th>
                    <th className="px-2 py-2 text-left font-medium">Amount</th>
                    <th className="px-2 py-2 text-left font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {installments.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-4 text-gray-400">No installments yet</td></tr>
                  ) : (
                    installments.map((row, i) => (
                      <tr key={i} className="border-t border-gray-100">
                        <td className="px-2 py-1.5">{i + 1}</td>
                        <td className="px-2 py-1.5">
                          <input type="date" value={row.date} onChange={(e) => updateInstallment(i, 'date', e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1 text-xs" />
                        </td>
                        <td className="px-2 py-1.5">
                          <input value={row.type} onChange={(e) => updateInstallment(i, 'type', e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1 text-xs" />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="number" value={row.amount} onChange={(e) => updateInstallment(i, 'amount', e.target.value)} className="w-full border border-gray-200 rounded px-2 py-1 text-xs" />
                        </td>
                        <td className="px-2 py-1.5">
                          <button type="button" onClick={() => removeInstallment(i)} className="text-red-500 hover:text-red-700">
                            <X size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200 font-medium">
                    <td className="px-2 py-1.5" colSpan={3}>Total</td>
                    <td className="px-2 py-1.5">{installmentTotal.toLocaleString()}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Rate">
                <input type="number" value={rate} onChange={(e) => setRate(e.target.value)} className="input" />
              </Field>
              <Field label="Subtotal">
                <input value={subtotal.toLocaleString()} readOnly className="input bg-gray-50" />
              </Field>
              <Field label="Parking">
                <input type="number" value={parking} onChange={(e) => setParking(e.target.value)} className="input" />
              </Field>
              <Field label="Utility Charge">
                <input type="number" value={utilityCharge} onChange={(e) => setUtilityCharge(e.target.value)} className="input" />
              </Field>
              <Field label="Other Cost">
                <input type="number" value={otherCost} onChange={(e) => setOtherCost(e.target.value)} className="input" />
              </Field>
              <Field label="Discount">
                <input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} className="input" />
              </Field>
              <Field label="Grand Total">
                <input value={grandTotal.toLocaleString()} readOnly className="input bg-gray-50 font-medium" />
              </Field>
              <Field label="Due Amount">
                <input value={dueAmount.toLocaleString()} readOnly className="input bg-gray-50 text-red-600 font-medium" />
              </Field>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Payment Info</h3>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Booking Money">
                  <input type="number" value={bookingMoney} onChange={(e) => setBookingMoney(e.target.value)} className="input" />
                </Field>
                <Field label={<span>Method <label className="ml-2 text-xs font-normal"><input type="checkbox" checked={ifCheque} onChange={(e) => setIfCheque(e.target.checked)} className="mr-1" />If Cheque</label></span>}>
                  <input value={ifCheque ? 'Cheque' : 'Cash'} readOnly className="input bg-gray-50" />
                </Field>
                {ifCheque && (
                  <Field label="Cheque Receipt No">
                    <input value={chequeReceiptNo} onChange={(e) => setChequeReceiptNo(e.target.value)} className="input" />
                  </Field>
                )}
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="bg-indigo-500 hover:bg-indigo-600 text-white font-medium px-8 py-2.5 rounded-md disabled:opacity-50"
        >
          {submitting ? 'Saving...' : 'Submit'}
        </button>
      </form>

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
      <label className="block text-sm text-gray-700 mb-1">
        {label}{required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between border-b border-gray-100 pb-1">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-800">{value ?? '-'}</span>
    </div>
  );
}