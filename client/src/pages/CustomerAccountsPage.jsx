import { useEffect, useMemo, useState, useCallback } from 'react';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import Modal from '../components/Modal';
import SelectColumnsDropdown from '../components/SelectColumnsDropdown';
import { getChartOfGroupOptions } from '../api/chartOfGroup';
import { resolveFileUrl } from '../api/axios';
import {
  getContacts,
  getNextContactCode,
  createContact,
  updateContact,
  deleteContact,
} from '../api/contactAccounts';
import {
  Pencil,
  Trash2,
  Search,
  Users,
  Plus,
  User,
  Building2,
  Info,
  X,
  Eye,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Tag as TagIcon,
  KeyRound,
  LayoutGrid,
} from 'lucide-react';
import PortalAccessModal from '../components/PortalAccessModal';

const COLUMNS = [
  { key: 'id', label: 'ID' },
  { key: 'code', label: 'Code' },
  { key: 'name', label: 'Name' },
  { key: 'business', label: 'Business' },
  { key: 'mobile', label: 'Mobile' },
  { key: 'email', label: 'Email' },
  { key: 'nid', label: 'NID' },
  { key: 'under', label: 'Under' },
  { key: 'image', label: 'Image' },
  { key: 'action', label: 'Action' },
];

const ALL_VISIBLE = COLUMNS.reduce(
  (acc, c) => ({ ...acc, [c.key]: true }),
  {}
);

const EMPTY_FORM = {
  code: '',
  name: '',
  mobile: '',
  email: '',
  nid: '',
  address: '',
  buyerReference: '',
  creditLimit: '',
  businessName: '',
  chartOfGroup: '',
};

const FIELD_INFO = {
  code: "A unique ID automatically given to this customer, like a customer number. You don't need to type it yourself.",
  name: "The customer's full name.",
  mobile:
    "The customer's phone number, used to contact them about orders, payments, or updates.",
  email:
    "The customer's email address, for sending invoices, receipts, or updates.",
  nid: 'A government ID (National ID, Birth Certificate, or Passport) used to verify who this customer really is. Common for high-value or legal transactions like property deals.',
  address: "Where the customer lives or is based.",
  buyerReference:
    'A note on how this customer came to you, or who referred them (e.g. a company name or referral source). Helps you track where business is coming from.',
  creditLimit:
    "The maximum amount this customer can owe you before paying. For example, setting this to 50,000 means the system can warn or block further sales once the customer's unpaid balance reaches that amount. Leave blank if you don't want to limit credit.",
  businessName:
    "If the customer is buying on behalf of a company rather than as an individual, enter that company's name here.",
  chartOfGroup:
    "Which accounting group this customer's ledger belongs to (e.g. 'Customer Accounts'). This determines how their balance is organized in your financial reports.",
  image:
    'A photo of the customer or their ID document, for quick visual reference.',
};

function FieldLabel({ children, infoKey, required }) {
  const [open, setOpen] = useState(false);
  const info = FIELD_INFO[infoKey];

  return (
    <div className="relative flex items-center gap-1 mb-1.5">
      <label className="block text-xs font-medium text-slate-500">
        {children}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>

      {info && (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-slate-300 hover:text-indigo-500 transition-colors"
            title="What is this?"
          >
            <Info size={13} />
          </button>

          {open && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setOpen(false)}
              />

              <div className="absolute left-0 top-6 z-50 w-64 bg-slate-800 text-white text-xs leading-relaxed rounded-lg shadow-lg p-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="absolute top-1.5 right-1.5 text-slate-400 hover:text-white"
                >
                  <X size={12} />
                </button>

                <p className="pr-3">{info}</p>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon, tone, onClick, active }) {
  const tones = {
    indigo: 'from-indigo-500 to-indigo-600 shadow-indigo-500/25',
    emerald: 'from-emerald-500 to-emerald-600 shadow-emerald-500/25',
    violet: 'from-violet-500 to-violet-600 shadow-violet-500/25',
  };
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`relative overflow-hidden rounded-xl px-4 py-3.5 text-left bg-gradient-to-br ${tones[tone]} shadow-lg ${
        onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.99] transition-transform' : ''
      } ${active ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-50' : ''}`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-medium uppercase tracking-wide text-white/80">{label}</span>
        <span className="text-white/70">{icon}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="absolute -right-3 -bottom-3 w-16 h-16 rounded-full bg-white/10" />
    </Comp>
  );
}

export default function CustomerAccountsPage() {
  const [items, setItems] = useState([]);
  const [groupOptions, setGroupOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [visibleColumns, setVisibleColumns] = useState(ALL_VISIBLE);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [formError, setFormError] = useState('');
  const [portalItem, setPortalItem] = useState(null);

  const [viewItem, setViewItem] = useState(null);

  function openViewModal(item) {
    setViewItem(item);
  }

  function closeViewModal() {
    setViewItem(null);
  }

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const { data } = await getContacts('Customer');
      setItems(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Failed to load customers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    getChartOfGroupOptions()
      .then((data) => {
        setGroupOptions(Array.isArray(data) ? data : []);
      })
      .catch(console.error);
  }, []);

  async function openCreateModal() {
    setEditingId(null);
    setImageFile(null);
    setFormError('');
    setForm(EMPTY_FORM);
    setModalOpen(true);

    try {
      const { data } = await getNextContactCode('Customer');

      setForm((f) => ({
        ...f,
        code: data.code,
      }));
    } catch {
      setForm((f) => ({
        ...f,
        code: '',
      }));
    }
  }

  function openEditModal(item) {
    setEditingId(item.id);
    setImageFile(null);
    setFormError('');

    setForm({
      code: item.code || '',
      name: item.name || '',
      mobile: item.mobile || '',
      email: item.email || '',
      nid: item.nid || '',
      address: item.address || '',
      buyerReference: item.buyerReference || '',
      creditLimit: item.creditLimit ?? '',
      businessName: item.businessName || '',
      chartOfGroup:
        item.chartOfGroup?.id || item.chartOfGroup || '',
    });

    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.name || !form.mobile || !form.chartOfGroup) return;

    setSubmitting(true);
    setFormError('');

    try {
      const fd = new FormData();

      Object.entries(form).forEach(([key, val]) => {
        fd.append(key, val ?? '');
      });

      fd.append('contactType', 'Customer');

      if (imageFile) {
        fd.append('image', imageFile);
      }

      if (editingId) {
        await updateContact(editingId, fd);
      } else {
        await createContact(fd);
      }

      setModalOpen(false);
      await load();
    } catch (err) {
      console.error(err);

      setFormError(
        err.response?.data?.message || 'Failed to save customer.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(item) {
    if (!window.confirm(`Delete customer "${item.name}"?`)) return;

    setDeletingId(item.id);

    try {
      await deleteContact(item.id);

      setItems((prev) =>
        prev.filter((r) => r.id !== item.id)
      );
    } catch (err) {
      console.error(err);

      alert(
        err.response?.data?.message ||
          'Failed to delete customer.'
      );
    } finally {
      setDeletingId(null);
    }
  }

  function toggleColumn(key, checked) {
    setVisibleColumns((prev) => ({
      ...prev,
      [key]: checked,
    }));
  }

  const filteredRows = useMemo(() => {
    const q = search.toLowerCase();

    return items.filter(
      (r) =>
        r.name?.toLowerCase().includes(q) ||
        r.code?.toLowerCase().includes(q) ||
        r.mobile?.toLowerCase().includes(q) ||
        r.businessName?.toLowerCase().includes(q)
    );
  }, [items, search]);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRows.length / pageSize)
  );

  const pagedRows = useMemo(
    () =>
      filteredRows.slice(
        (page - 1) * pageSize,
        page * pageSize
      ),
    [filteredRows, page, pageSize]
  );

  return (
    <div className="min-h-screen w-full bg-slate-50 text-left">
      <Topbar />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          <div>
            <Breadcrumb
              items={[
                { label: 'Home', to: '/dashboard' },
                {
                  label: 'Contact',
                  to: '/dashboard/accounts',
                },
                { label: 'Customer Accounts' },
              ]}
            />

            <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">
              Customer Accounts
            </h1>

            <p className="text-sm text-slate-500 mt-0.5">
              Manage your customer contacts and account details
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 transition-colors w-full sm:w-auto"
          >
            <Plus size={16} strokeWidth={2.5} />
            Create Customer
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">
            {error}
          </div>
        )}

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <SummaryCard
            label="Total Customers"
            value={items.length}
            icon={<Users size={16} />}
            tone="indigo"
            active={!search}
            onClick={search ? () => setSearch('') : undefined}
          />
          <SummaryCard
            label="Matching Search"
            value={filteredRows.length}
            icon={<Search size={16} />}
            tone="emerald"
          />
          <SummaryCard
            label="Showing"
            value={`${pagedRows.length} / ${filteredRows.length}`}
            icon={<LayoutGrid size={16} />}
            tone="violet"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>Show</span>

              <select
                value={pageSize}
                onChange={(e) =>
                  setPageSize(Number(e.target.value))
                }
                className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              >
                {[10, 25, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>

              <span>entries</span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <SelectColumnsDropdown
                columns={COLUMNS}
                visible={visibleColumns}
                onToggle={toggleColumn}
                onClearAll={() =>
                  setVisibleColumns(
                    COLUMNS.reduce(
                      (acc, c) => ({
                        ...acc,
                        [c.key]: false,
                      }),
                      {}
                    )
                  )
                }
                onSelectAll={() =>
                  setVisibleColumns(ALL_VISIBLE)
                }
              />

              <div className="relative">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search customers..."
                  className="border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm w-full sm:w-64 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
                  {visibleColumns.id && (
                    <th className="px-2 py-2.5 text-left font-medium text-[11px] uppercase tracking-wide">
                      ID
                    </th>
                  )}

                  {visibleColumns.code && (
                    <th className="px-2 py-2.5 text-left font-medium text-[11px] uppercase tracking-wide">
                      Code
                    </th>
                  )}

                  {visibleColumns.name && (
                    <th className="px-2 py-2.5 text-left font-medium text-[11px] uppercase tracking-wide">
                      Name
                    </th>
                  )}

                  {visibleColumns.business && (
                    <th className="px-2 py-2.5 text-left font-medium text-[11px] uppercase tracking-wide">
                      Business
                    </th>
                  )}

                  {visibleColumns.mobile && (
                    <th className="px-2 py-2.5 text-left font-medium text-[11px] uppercase tracking-wide">
                      Mobile
                    </th>
                  )}

                  {visibleColumns.email && (
                    <th className="px-2 py-2.5 text-left font-medium text-[11px] uppercase tracking-wide">
                      Email
                    </th>
                  )}

                  {visibleColumns.nid && (
                    <th className="px-2 py-2.5 text-left font-medium text-[11px] uppercase tracking-wide">
                      NID
                    </th>
                  )}

                  {visibleColumns.under && (
                    <th className="px-2 py-2.5 text-left font-medium text-[11px] uppercase tracking-wide">
                      Under
                    </th>
                  )}

                  {visibleColumns.image && (
                    <th className="px-2 py-2.5 text-left font-medium text-[11px] uppercase tracking-wide">
                      Img
                    </th>
                  )}

                  {visibleColumns.action && (
                    <th className="px-2 py-2.5 text-right font-medium text-[11px] uppercase tracking-wide">
                      Action
                    </th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={COLUMNS.length}
                      className="text-center py-16 text-slate-400"
                    >
                      Loading...
                    </td>
                  </tr>
                ) : pagedRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={COLUMNS.length}
                      className="text-center py-16"
                    >
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <Users
                          size={28}
                          strokeWidth={1.5}
                        />

                        <p className="text-sm">
                          No customers found. Try adjusting
                          your search, or create one.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  pagedRows.map((row, i) => (
                    <tr
                      key={row.id}
                      className="hover:bg-slate-50/70 transition-colors whitespace-nowrap"
                    >
                      {visibleColumns.id && (
                        <td className="px-2 py-2.5 text-slate-400 font-mono">
                          #
                          {(page - 1) * pageSize +
                            i +
                            1}
                        </td>
                      )}

                      {visibleColumns.code && (
                        <td className="px-2 py-2.5">
                          <span className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-600 px-2 py-0.5 font-mono font-medium ring-1 ring-inset ring-indigo-600/10">
                            {row.code}
                          </span>
                        </td>
                      )}

                      {visibleColumns.name && (
                        <td className="px-2 py-2.5 max-w-[110px]">
                          <button
                            onClick={() =>
                              openEditModal(row)
                            }
                            className="inline-flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 font-medium hover:underline underline-offset-2 truncate"
                            title={row.name}
                          >
                            <User
                              size={12}
                              className="text-slate-400 shrink-0"
                            />
                            <span className="truncate">{row.name}</span>
                          </button>
                        </td>
                      )}

                      {visibleColumns.business && (
                        <td className="px-2 py-2.5 text-slate-600 max-w-[100px] truncate" title={row.businessName || ''}>
                          {row.businessName || '-'}
                        </td>
                      )}

                      {visibleColumns.mobile && (
                        <td className="px-2 py-2.5 text-slate-600">
                          {row.mobile}
                        </td>
                      )}

                      {visibleColumns.email && (
                        <td className="px-2 py-2.5 text-slate-600 max-w-[130px] truncate" title={row.email || ''}>
                          {row.email || '-'}
                        </td>
                      )}

                      {visibleColumns.nid && (
                        <td className="px-2 py-2.5 text-slate-600">
                          {row.nid || '-'}
                        </td>
                      )}

                      {visibleColumns.under && (
                        <td className="px-2 py-2.5 max-w-[110px]">
                          <span
                            className="inline-flex items-center gap-1 text-slate-600 truncate"
                            title={row.chartOfGroup?.name || ''}
                          >
                            <Building2
                              size={11}
                              className="text-slate-400 shrink-0"
                            />
                            <span className="truncate">
                              {row.chartOfGroup?.name || '-'}
                            </span>
                          </span>
                        </td>
                      )}

                      {visibleColumns.image && (
                        <td className="px-2 py-2.5">
                          {row.image ? (
                            <img
                              src={resolveFileUrl(
                                row.image
                              )}
                              alt={row.name}
                              className="w-6 h-6 rounded-md object-cover ring-1 ring-slate-200"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-slate-300">
                              <User size={11} />
                            </div>
                          )}
                        </td>
                      )}

                      {visibleColumns.action && (
                        <td className="px-2 py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() =>
                                openViewModal(row)
                              }
                              className="w-7 h-7 flex items-center justify-center rounded-md bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 transition-colors"
                              title="View"
                            >
                              <Eye size={12} />
                            </button>

                            <button
                              onClick={() =>
                                openEditModal(row)
                              }
                              className="w-7 h-7 flex items-center justify-center rounded-md bg-slate-100 hover:bg-indigo-100 text-slate-500 hover:text-indigo-600 transition-colors"
                              title="Edit"
                            >
                              <Pencil size={12} />
                            </button>

                            <button
                              onClick={() =>
                                setPortalItem(row)
                              }
                              className="w-7 h-7 flex items-center justify-center rounded-md bg-slate-100 hover:bg-emerald-100 text-slate-500 hover:text-emerald-600 transition-colors"
                              title="Portal Access"
                            >
                              <KeyRound size={12} />
                            </button>

                            <button
                              onClick={() =>
                                handleDelete(row)
                              }
                              disabled={
                                deletingId === row.id
                              }
                              className="w-7 h-7 flex items-center justify-center rounded-md bg-slate-100 hover:bg-red-100 text-slate-500 hover:text-red-600 transition-colors disabled:opacity-50"
                              title="Delete"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-t border-slate-100">
            <span className="text-sm text-slate-500">
              Showing{' '}
              <span className="font-medium text-slate-700">
                {filteredRows.length === 0
                  ? 0
                  : (page - 1) * pageSize + 1}
              </span>{' '}
              to{' '}
              <span className="font-medium text-slate-700">
                {Math.min(
                  page * pageSize,
                  filteredRows.length
                )}
              </span>{' '}
              of{' '}
              <span className="font-medium text-slate-700">
                {filteredRows.length}
              </span>{' '}
              entries
            </span>

            <div className="flex flex-wrap gap-1.5">
              <button
                disabled={page === 1}
                onClick={() =>
                  setPage((p) => Math.max(1, p - 1))
                }
                className="px-3 py-1.5 rounded-lg text-sm bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-colors"
              >
                Previous
              </button>

              {Array.from(
                { length: totalPages },
                (_, i) => i + 1
              ).map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                    n === page
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                      : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {n}
                </button>
              ))}

              <button
                disabled={page === totalPages}
                onClick={() =>
                  setPage((p) =>
                    Math.min(totalPages, p + 1)
                  )
                }
                className="px-3 py-1.5 rounded-lg text-sm bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        title={
          editingId ? 'Edit Customer' : 'New Customer'
        }
        onClose={closeModal}
      >
        <form onSubmit={handleSubmit}>
          {formError && (
            <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <FieldLabel infoKey="code">
                Code
              </FieldLabel>

              <input
                value={form.code}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    code: e.target.value,
                  }))
                }
                readOnly={!!editingId}
                placeholder="Code"
                className={`w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-mono transition ${
                  editingId
                    ? 'bg-slate-50 text-slate-500'
                    : 'bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400'
                }`}
              />
            </div>

            <div>
              <FieldLabel
                infoKey="name"
                required
              >
                Name
              </FieldLabel>

              <input
                required
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    name: e.target.value,
                  }))
                }
                placeholder="Customer name"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>

            <div>
              <FieldLabel
                infoKey="mobile"
                required
              >
                Mobile
              </FieldLabel>

              <input
                required
                value={form.mobile}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    mobile: e.target.value,
                  }))
                }
                placeholder="Mobile"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <FieldLabel infoKey="email">
                E-mail
              </FieldLabel>

              <input
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    email: e.target.value,
                  }))
                }
                placeholder="Email"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>

            <div>
              <FieldLabel infoKey="nid">
                NID/Birth Cert./Passport
              </FieldLabel>

              <input
                value={form.nid}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    nid: e.target.value,
                  }))
                }
                placeholder="NID"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>

            <div>
              <FieldLabel infoKey="address">
                Address
              </FieldLabel>

              <input
                value={form.address}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    address: e.target.value,
                  }))
                }
                placeholder="Address"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <FieldLabel infoKey="buyerReference">
                Buyer Reference
              </FieldLabel>

              <input
                value={form.buyerReference}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    buyerReference: e.target.value,
                  }))
                }
                placeholder="Buyer reference"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>

            <div>
              <FieldLabel infoKey="creditLimit">
                Credit Limit
              </FieldLabel>

              <input
                type="number"
                value={form.creditLimit}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    creditLimit: e.target.value,
                  }))
                }
                placeholder="Credit limit"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>

            <div>
              <FieldLabel infoKey="businessName">
                Business/Organization
              </FieldLabel>

              <input
                value={form.businessName}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    businessName: e.target.value,
                  }))
                }
                placeholder="Business name"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
            <div>
              <FieldLabel
                infoKey="chartOfGroup"
                required
              >
                Chart Of Group
              </FieldLabel>

              <select
                required
                value={form.chartOfGroup}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    chartOfGroup: e.target.value,
                  }))
                }
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              >
                <option value="">
                  Select one option
                </option>

                {groupOptions.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <FieldLabel infoKey="image">
                Image
              </FieldLabel>

              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setImageFile(
                    e.target.files?.[0] || null
                  )
                }
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 shadow-sm shadow-indigo-600/20 transition-colors"
            >
              {submitting
                ? 'Saving...'
                : editingId
                ? 'Save Changes'
                : 'Create Customer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Customer Modal */}
      <Modal
        open={!!viewItem}
        title="Customer Details"
        onClose={closeViewModal}
      >
        {viewItem && (
          <div>
            <div className="flex items-center gap-4 mb-6 pb-5 border-b border-slate-100">
              {viewItem.image ? (
                <img
                  src={resolveFileUrl(viewItem.image)}
                  alt={viewItem.name}
                  className="w-16 h-16 rounded-xl object-cover ring-1 ring-slate-200"
                />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center text-slate-300">
                  <User size={24} />
                </div>
              )}

              <div>
                <div className="text-lg font-semibold text-slate-900">
                  {viewItem.name}
                </div>

                <span className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-600 px-2.5 py-1 text-xs font-mono font-medium ring-1 ring-inset ring-indigo-600/10 mt-1">
                  {viewItem.code}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="flex items-start gap-2.5">
                <Phone
                  size={15}
                  className="text-slate-400 mt-0.5"
                />

                <div>
                  <div className="text-xs text-slate-400 mb-0.5">
                    Mobile
                  </div>

                  <div className="text-sm text-slate-800">
                    {viewItem.mobile || '-'}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Mail
                  size={15}
                  className="text-slate-400 mt-0.5"
                />

                <div>
                  <div className="text-xs text-slate-400 mb-0.5">
                    E-mail
                  </div>

                  <div className="text-sm text-slate-800">
                    {viewItem.email || '-'}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <TagIcon
                  size={15}
                  className="text-slate-400 mt-0.5"
                />

                <div>
                  <div className="text-xs text-slate-400 mb-0.5">
                    NID/Birth Cert./Passport
                  </div>

                  <div className="text-sm text-slate-800">
                    {viewItem.nid || '-'}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <MapPin
                  size={15}
                  className="text-slate-400 mt-0.5"
                />

                <div>
                  <div className="text-xs text-slate-400 mb-0.5">
                    Address
                  </div>

                  <div className="text-sm text-slate-800">
                    {viewItem.address || '-'}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <User
                  size={15}
                  className="text-slate-400 mt-0.5"
                />

                <div>
                  <div className="text-xs text-slate-400 mb-0.5">
                    Buyer Reference
                  </div>

                  <div className="text-sm text-slate-800">
                    {viewItem.buyerReference || '-'}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <CreditCard
                  size={15}
                  className="text-slate-400 mt-0.5"
                />

                <div>
                  <div className="text-xs text-slate-400 mb-0.5">
                    Credit Limit
                  </div>

                  <div className="text-sm text-slate-800">
                    {viewItem.creditLimit ?? '-'}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Building2
                  size={15}
                  className="text-slate-400 mt-0.5"
                />

                <div>
                  <div className="text-xs text-slate-400 mb-0.5">
                    Business/Organization
                  </div>

                  <div className="text-sm text-slate-800">
                    {viewItem.businessName || '-'}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Building2
                  size={15}
                  className="text-slate-400 mt-0.5"
                />

                <div>
                  <div className="text-xs text-slate-400 mb-0.5">
                    Chart Of Group
                  </div>

                  <div className="text-sm text-slate-800">
                    {viewItem.chartOfGroup?.name || '-'}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={closeViewModal}
                className="px-4 py-2.5 rounded-lg text-sm font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Portal Access */}
      <PortalAccessModal
        open={!!portalItem}
        customer={portalItem}
        onClose={() => setPortalItem(null)}
        onSuccess={load}
        onNeedsEmail={(c) => {
          setPortalItem(null);
          openEditModal(c);
        }}
      />
    </div>
  );
}