import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Pencil, Phone, Trash2, ChevronDown, ChevronUp, Filter as FilterIcon,
  UploadCloud, Send, ArrowLeftRight, UserCheck, Gift, Plus,
} from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmSelectionModal from '../components/ConfirmSelectionModal';
import LeadDetailModal from '../components/LeadDetailModal';
import {
  getLeads, getNextLeadCode, createLead, updateLead, deleteLead,
  bulkDeleteLeads, callAssignLeads, transferLeads,
  sendLeadSms, sendWishSms, convertLeadToCustomer, bulkImportLeads,
} from '../api/lead';
import { getLeadSources } from '../api/leadSource';
import { getLeadCategories } from '../api/leadCategory';
import { getLeadStages } from '../api/leadStage';
import { getCampaigns } from '../api/campaign';
import { getProfessions } from '../api/profession';
import { getProjects } from '../api/project';
import { getUsers } from '../api/user';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const COUNTRY_CODES = [
  { code: '+880', label: '🇧🇩 (+880)' },
  { code: '+91', label: '🇮🇳 (+91)' },
  { code: '+1', label: '🇺🇸 (+1)' },
];
const SMS_TEMPLATES = [
  { id: 'welcome', label: 'Welcome Message', body: 'Thank you for your interest. Our team will contact you shortly.' },
  { id: 'followup', label: 'Follow Up', body: 'Just following up on your recent inquiry. Let us know if you have questions.' },
  { id: 'offer', label: 'Offer Update', body: 'We have a new offer that may interest you. Call us to know more.' },
];

const EMPTY_FORM = {
  date: new Date().toISOString().slice(0, 10),
  previewId: '',
  name: '',
  phoneCountryCode: '+880',
  mobile: '',
  secondaryNumber: '',
  assignUserId: '',
  assignUserName: '',
  crUserId: '',
  crUserName: '',
  leadStage: '',
  leadSourceId: '',
  interestedProjectId: '',
  leadCategoryId: '',
  campaignId: '',
  organization: '',
  designation: '',
  birthDate: '',
  anniversaryDate: '',
  profession: '',
  address: '',
  email: '',
};

export default function LeadPage() {
  const [leads, setLeads] = useState([]);
  const [users, setUsers] = useState([]);
  const [leadSources, setLeadSources] = useState([]);
  const [leadCategories, setLeadCategories] = useState([]);
  const [leadStages, setLeadStages] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [professions, setProfessions] = useState([]);
  const [projects, setProjects] = useState([]);

  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [needSelection, setNeedSelection] = useState(false);

  // Add/Edit Lead
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [sectionOpen, setSectionOpen] = useState({ basic: true, details: true, personal: true });

  // Lead Detail (tabbed modal — Upcoming/Pending, Requirements, Deal Negotiation, Property, Follow-up, Visits, Note)
  const [detailLeadId, setDetailLeadId] = useState(null);

  // Call Assign
  const [callAssignOpen, setCallAssignOpen] = useState(false);
  const [callAssignForm, setCallAssignForm] = useState({ date: '', userType: 'Officer', note: '' });

  // Transfer
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferAssignType, setTransferAssignType] = useState('Officer/SR');
  const [transferFollowup, setTransferFollowup] = useState(false);
  const [transferManualSet, setTransferManualSet] = useState(false);
  const [transferRows, setTransferRows] = useState([{ userId: '', userName: '', quantity: '' }]);
  const [transferTotal, setTransferTotal] = useState('');

  // SMS
  const [smsModal, setSmsModal] = useState(false);
  const [smsTemplateId, setSmsTemplateId] = useState('');
  const [smsMessage, setSmsMessage] = useState('');

  // Convert
  const [convertLeadId, setConvertLeadId] = useState(null);
  const [convertNid, setConvertNid] = useState('');

  // Bulk Import
  const [importModal, setImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importFilters, setImportFilters] = useState({
    leadStage: '', leadCategoryId: '', leadSourceId: '', campaignId: '',
    interestedProjectId: '', userIds: [], crIds: [],
  });

  // Filter
  const [filterModal, setFilterModal] = useState(false);
  const [filters, setFilters] = useState({ srOfficer: '', status: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getLeads();
      setLeads(data);
    } catch (err) {
      console.error('Failed to load leads', err);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    getUsers().then(({ data }) => setUsers(data)).catch(() => setUsers([]));
    getLeadSources().then(({ data }) => setLeadSources(data)).catch(() => setLeadSources([]));
    getLeadCategories().then(({ data }) => setLeadCategories(data)).catch(() => setLeadCategories([]));
    getLeadStages().then(({ data }) => setLeadStages(data)).catch(() => setLeadStages([]));
    getCampaigns().then(({ data }) => setCampaigns(data)).catch(() => setCampaigns([]));
    getProfessions().then(({ data }) => setProfessions(data)).catch(() => setProfessions([]));
    getProjects().then(({ data }) => setProjects(data)).catch(() => setProjects([]));
  }, []);

  const filtered = leads.filter((l) => {
    const q = search.toLowerCase();
    if (q) {
      const matches = (l.name || '').toLowerCase().includes(q)
        || (l.mobile || '').toLowerCase().includes(q)
        || (l.address || '').toLowerCase().includes(q);
      if (!matches) return false;
    }
    if (filters.srOfficer && l.srOfficer !== filters.srOfficer) return false;
    if (filters.status && l.status !== filters.status) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);
  const allOnPageSelected = pageRows.length > 0 && pageRows.every((r) => selectedIds.includes(r._id));

  function toggleSelectAll() {
    if (allOnPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !pageRows.some((r) => r._id === id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...pageRows.map((r) => r._id)])]);
    }
  }

  function toggleSelectOne(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function requireSelection() {
    if (selectedIds.length === 0) {
      setNeedSelection(true);
      return false;
    }
    return true;
  }

  // ---------- Add / Edit Lead ----------
  function openAddModal() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, date: new Date().toISOString().slice(0, 10) });
    setSectionOpen({ basic: true, details: true, personal: true });
    setModalOpen(true); // open immediately — don't block on the network

    getNextLeadCode()
      .then(({ data }) => setForm((f) => ({ ...f, previewId: data.code })))
      .catch(() => { /* non-fatal — Lead Code just stays blank until save */ });
  }

  function openEditModal(lead) {
    setEditingId(lead._id);
    setForm({
      date: lead.date ? new Date(lead.date).toISOString().slice(0, 10) : '',
      previewId: lead.leadId || '',
      name: lead.name || '',
      phoneCountryCode: lead.phoneCountryCode || '+880',
      mobile: lead.mobile || '',
      secondaryNumber: lead.secondaryNumber || '',
      assignUserId: lead.assignUserId || '',
      assignUserName: lead.assignUserName || '',
      crUserId: lead.crUserId || '',
      crUserName: lead.crUserName || '',
      leadStage: lead.leadStage || '',
      leadSourceId: lead.leadSourceId?._id || lead.leadSourceId || '',
      interestedProjectId: lead.interestedProjectId?._id || lead.interestedProjectId || '',
      leadCategoryId: lead.leadCategoryId?._id || lead.leadCategoryId || '',
      campaignId: lead.campaignId?._id || lead.campaignId || '',
      organization: lead.organization || '',
      designation: lead.designation || '',
      birthDate: lead.birthDate ? new Date(lead.birthDate).toISOString().slice(0, 10) : '',
      anniversaryDate: lead.anniversaryDate ? new Date(lead.anniversaryDate).toISOString().slice(0, 10) : '',
      profession: lead.profession || '',
      address: lead.address || '',
      email: lead.email || '',
    });
    setSectionOpen({ basic: true, details: true, personal: true });
    setModalOpen(true);
  }

  function toggleSection(key) {
    setSectionOpen((s) => ({ ...s, [key]: !s[key] }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.mobile) return;
    setSaving(true);
    try {
      const payload = { ...form };
      delete payload.previewId;
      if (editingId) {
        await updateLead(editingId, payload);
      } else {
        await createLead(payload);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      console.error('Failed to save lead', err);
      alert(err.response?.data?.message || 'Failed to save lead');
    } finally {
      setSaving(false);
    }
  }

  // ---------- Delete ----------
  async function handleDeleteOne(id) {
    if (!window.confirm('Delete this lead? This cannot be undone.')) return;
    try {
      await deleteLead(id);
      await load();
    } catch (err) {
      console.error('Failed to delete lead', err);
      alert('Failed to delete lead.');
    }
  }

  async function handleBulkDelete() {
    if (!requireSelection()) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected lead(s)? This cannot be undone.`)) return;
    try {
      await bulkDeleteLeads(selectedIds);
      setSelectedIds([]);
      await load();
    } catch (err) {
      console.error('Failed to bulk delete', err);
      alert('Failed to delete selected leads.');
    }
  }

  // ---------- Call Assign ----------
  function openCallAssign() {
    if (!requireSelection()) return;
    setCallAssignForm({ date: '', userType: 'Officer', note: '' });
    setCallAssignOpen(true);
  }

  async function submitCallAssign() {
    try {
      await callAssignLeads({
        ids: selectedIds,
        date: callAssignForm.date,
        userType: callAssignForm.userType,
        note: callAssignForm.note,
      });
      setCallAssignOpen(false);
      setSelectedIds([]);
      await load();
    } catch (err) {
      console.error('Call assign failed', err);
      alert('Call assign failed.');
    }
  }

  // ---------- Transfer ----------
  function openTransfer() {
    if (!requireSelection()) return;
    setTransferAssignType('Officer/SR');
    setTransferFollowup(false);
    setTransferManualSet(false);
    setTransferRows([{ userId: '', userName: '', quantity: '' }]);
    setTransferTotal('');
    setTransferOpen(true);
  }

  function addTransferRow() {
    setTransferRows((rows) => [...rows, { userId: '', userName: '', quantity: '' }]);
  }

  function updateTransferRow(idx, field, value) {
    setTransferRows((rows) => rows.map((r, i) => {
      if (i !== idx) return r;
      if (field === 'userId') {
        const u = users.find((usr) => usr._id === value);
        return { ...r, userId: value, userName: u?.name || '' };
      }
      return { ...r, [field]: value };
    }));
  }

  async function submitTransfer() {
    const validRows = transferRows.filter((r) => r.userName);
    if (!validRows.length) {
      alert('Select at least one user to transfer to.');
      return;
    }
    try {
      await transferLeads({
        ids: selectedIds,
        assignType: transferAssignType,
        followup: transferFollowup,
        manualSet: transferManualSet,
        transfers: validRows,
        totalTransfer: transferTotal,
      });
      setTransferOpen(false);
      setSelectedIds([]);
      await load();
    } catch (err) {
      console.error('Transfer failed', err);
      alert(err.response?.data?.message || 'Transfer failed.');
    }
  }

  // ---------- SMS ----------
  function openSmsModal() {
    if (!requireSelection()) return;
    setSmsTemplateId('');
    setSmsMessage('');
    setSmsModal(true);
  }

  function applyTemplate(id) {
    setSmsTemplateId(id);
    const t = SMS_TEMPLATES.find((tpl) => tpl.id === id);
    setSmsMessage(t ? t.body : '');
  }

  async function submitSms() {
    if (!smsMessage.trim()) return;
    try {
      await sendLeadSms(selectedIds, smsMessage.trim());
      setSmsModal(false);
      alert('SMS queued (gateway not yet configured — see server console).');
    } catch (err) {
      console.error('Failed to send SMS', err);
      alert('Failed to send SMS.');
    }
  }

  async function handleWishSms() {
    if (!requireSelection()) return;
    try {
      await sendWishSms(selectedIds);
      alert('Wish SMS queued (gateway not yet configured).');
    } catch (err) {
      console.error('Failed to send wish SMS', err);
      alert('Failed to send wish SMS.');
    }
  }

  // ---------- Convert to Customer ----------
  function openConvertModal() {
    if (!requireSelection()) return;
    if (selectedIds.length > 1) {
      alert('Please select exactly one lead to convert at a time.');
      return;
    }
    setConvertNid('');
    setConvertLeadId(selectedIds[0]);
  }

  async function submitConvert() {
    try {
      await convertLeadToCustomer(convertLeadId, convertNid.trim());
      setConvertLeadId(null);
      setSelectedIds([]);
      await load();
      alert('Lead converted to customer.');
    } catch (err) {
      console.error('Failed to convert lead', err);
      alert(err.response?.data?.message || 'Failed to convert lead.');
    }
  }

  // ---------- Bulk Import ----------
  function openImportModal() {
    setImportFile(null);
    setImportFilters({
      leadStage: '', leadCategoryId: '', leadSourceId: '', campaignId: '',
      interestedProjectId: '', userIds: [], crIds: [],
    });
    setImportModal(true);
  }

  async function submitImport() {
    if (!importFile) {
      alert('Please choose a file first.');
      return;
    }
    try {
      const fd = new FormData();
      fd.append('file', importFile);
      Object.entries(importFilters).forEach(([key, val]) => {
        if (Array.isArray(val)) val.forEach((v) => fd.append(key, v));
        else if (val) fd.append(key, val);
      });
      const { data } = await bulkImportLeads(fd);
      setImportModal(false);
      await load();
      alert(`Imported ${data.created} lead(s).`);
    } catch (err) {
      console.error('Bulk import failed', err);
      alert('Bulk import failed.');
    }
  }

  return (
    <div>

      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-500 flex items-center gap-1">
            <Link to="/dashboard" className="text-indigo-600 hover:underline">Home</Link>
            <span>&gt;</span>
            <span className="text-indigo-600 flex items-center gap-0.5">CRM Module <ChevronDown size={14} /></span>
            <span>&gt;</span>
            <span className="text-gray-700">Lead</span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by Name, Mobile, or Address"
            className="border border-gray-300 rounded-md px-3 py-2 text-sm w-72"
          />
          <div className="flex items-center gap-2 flex-wrap">
            <ActionButton color="indigo" onClick={openAddModal}>+ New Lead</ActionButton>
            <ActionButton color="violet" icon={UserCheck} onClick={openCallAssign}>Call Assign</ActionButton>
            <ActionButton color="teal" icon={UploadCloud} onClick={openImportModal}>Bulk Import</ActionButton>
            <ActionButton color="emerald" icon={Send} onClick={openSmsModal}>Send SMS</ActionButton>
            <ActionButton color="cyan" onClick={openConvertModal}>+Convert To Customer</ActionButton>
            <ActionButton color="orange" icon={ArrowLeftRight} onClick={openTransfer}>Transfer</ActionButton>
            <ActionButton color="pink" icon={Gift} onClick={handleWishSms}>Wish SMS</ActionButton>
            <ActionButton color="red" icon={Trash2} onClick={handleBulkDelete}>Delete</ActionButton>
            <ActionButton color="gray" icon={FilterIcon} onClick={() => setFilterModal(true)}>Filter</ActionButton>
          </div>
        </div>

        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm">
            Show
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="border border-gray-300 rounded-md px-2 py-1"
            >
              {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            entries
          </div>
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-indigo-500 text-white text-left text-sm">
              <th className="px-3 py-2 font-medium">SL</th>
              <th className="px-3 py-2 font-medium">
                <input type="checkbox" checked={allOnPageSelected} onChange={toggleSelectAll} />
              </th>
              <th className="px-3 py-2 font-medium">NAME</th>
              <th className="px-3 py-2 font-medium">MOBILE</th>
              <th className="px-3 py-2 font-medium">SR/OFFICER</th>
              <th className="px-3 py-2 font-medium">CR</th>
              <th className="px-3 py-2 font-medium">LAST ACTIVITY</th>
              <th className="px-3 py-2 font-medium">NEXT ACTIVITY</th>
              <th className="px-3 py-2 font-medium text-right">ACTION</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} className="text-center py-6 text-gray-400">Loading...</td></tr>
            ) : pageRows.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-6 text-gray-400">No leads found</td></tr>
            ) : pageRows.map((lead, i) => (
              <tr key={lead._id} className="border-b border-gray-100 text-sm align-top">
                <td className="px-3 py-2">{(page - 1) * pageSize + i + 1}</td>
                <td className="px-3 py-2">
                  <input type="checkbox" checked={selectedIds.includes(lead._id)} onChange={() => toggleSelectOne(lead._id)} />
                </td>
                <td className="px-3 py-2 cursor-pointer" onClick={() => setDetailLeadId(lead._id)}>
                  <div className="text-indigo-600 font-medium hover:underline">ID: {lead.leadId}</div>
                  <div className="hover:underline">Name: {lead.name}</div>
                  <div>Address: {lead.address || ''}</div>
                  {lead.organization && <div>Organization: {lead.organization}</div>}
                  {lead.designation && <div>Designation: {lead.designation}</div>}
                  {lead.profession && <div>Profession: {lead.profession}</div>}
                </td>
                <td className="px-3 py-2">{lead.mobile}</td>
                <td className="px-3 py-2">{lead.srOfficer || '-'}</td>
                <td className="px-3 py-2">{lead.cr || '-'}</td>
                <td className="px-3 py-2">
                  {lead.lastActivity ? (
                    <>
                      <div className="font-medium">{lead.lastActivity.type || 'Activity'}</div>
                      {lead.lastActivity.date && <div>Date: {new Date(lead.lastActivity.date).toLocaleDateString('en-GB')}</div>}
                      {lead.lastActivity.status && <div>Status: {lead.lastActivity.status}</div>}
                      {lead.lastActivity.comment && <div>Comment: {lead.lastActivity.comment}</div>}
                    </>
                  ) : '-'}
                </td>
                <td className="px-3 py-2">{lead.nextActivity ? new Date(lead.nextActivity).toLocaleDateString('en-GB') : '-'}</td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => openEditModal(lead)} className="bg-cyan-500 hover:bg-cyan-600 text-white p-1.5 rounded-md" title="Edit"><Pencil size={14} /></button>
                    <a href={`tel:${lead.mobile}`} className="bg-violet-500 hover:bg-violet-600 text-white p-1.5 rounded-md" title="Call"><Phone size={14} /></a>
                    <button onClick={() => handleDeleteOne(lead._id)} className="bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-md" title="Delete"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
          <div>
            Showing {pageRows.length === 0 ? 0 : (page - 1) * pageSize + 1} to{' '}
            {(page - 1) * pageSize + pageRows.length} of {filtered.length} entries
          </div>
          <div className="flex gap-1">
            <button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1.5 rounded-md border border-gray-300 disabled:opacity-40">Previous</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 6).map((n) => (
              <button key={n} onClick={() => setPage(n)} className={`px-3 py-1.5 rounded-md ${n === page ? 'bg-indigo-500 text-white' : 'border border-gray-300'}`}>{n}</button>
            ))}
            <button disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-3 py-1.5 rounded-md border border-gray-300 disabled:opacity-40">Next</button>
          </div>
        </div>
      </div>

      {/* ---------- Lead Accounts (Add/Edit) ---------- */}
      <Modal open={modalOpen} title="Lead Accounts" onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit}>
          <SectionHeader label="Basic Info" open={sectionOpen.basic} onToggle={() => toggleSection('basic')} />
          {sectionOpen.basic && (
            <div className="bg-gray-50 p-4 rounded-b-md mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <LField label="Date">
                  <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="input" />
                </LField>
                <LField label="Lead Code">
                  <input value={form.previewId} disabled placeholder="Generating..." className="input bg-gray-100" />
                </LField>
                <LField label="Name*">
                  <input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Name" className="input" />
                </LField>
                <LField label="Phone/Mobile *">
                  <div className="flex gap-1">
                    <select
                      value={form.phoneCountryCode}
                      onChange={(e) => setForm((f) => ({ ...f, phoneCountryCode: e.target.value }))}
                      className="input w-28"
                    >
                      {COUNTRY_CODES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                    </select>
                    <input
                      required
                      value={form.mobile}
                      onChange={(e) => setForm((f) => ({ ...f, mobile: e.target.value }))}
                      placeholder="Enter phone number"
                      className="input flex-1"
                    />
                  </div>
                </LField>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                <LField label="Secondary Number">
                  <input value={form.secondaryNumber} onChange={(e) => setForm((f) => ({ ...f, secondaryNumber: e.target.value }))} placeholder="Secondary Number" className="input" />
                </LField>
                <LField label="Assign User/SR">
                  <select
                    value={form.assignUserId}
                    onChange={(e) => {
                      const u = users.find((usr) => usr._id === e.target.value);
                      setForm((f) => ({ ...f, assignUserId: e.target.value, assignUserName: u?.name || '' }));
                    }}
                    className="input"
                  >
                    <option value="">Select User</option>
                    {users.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
                  </select>
                </LField>
                <LField label="If CR">
                  <select
                    value={form.crUserId}
                    onChange={(e) => {
                      const u = users.find((usr) => usr._id === e.target.value);
                      setForm((f) => ({ ...f, crUserId: e.target.value, crUserName: u?.name || '' }));
                    }}
                    className="input"
                  >
                    <option value="">Select User</option>
                    {users.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
                  </select>
                </LField>
                <LField label="Lead Stages">
                  <select value={form.leadStage} onChange={(e) => setForm((f) => ({ ...f, leadStage: e.target.value }))} className="input">
                    <option value="">Select Option</option>
                    {leadStages.map((s) => <option key={s._id} value={s.name}>{s.name}</option>)}
                  </select>
                </LField>
              </div>
            </div>
          )}

          <SectionHeader label="Lead Details" open={sectionOpen.details} onToggle={() => toggleSection('details')} />
          {sectionOpen.details && (
            <div className="bg-gray-50 p-4 rounded-b-md mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <LField label="Lead Source">
                  <select value={form.leadSourceId} onChange={(e) => setForm((f) => ({ ...f, leadSourceId: e.target.value }))} className="input">
                    <option value="">Select Source</option>
                    {leadSources.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                </LField>
                <LField label="Interested Project">
                  <select value={form.interestedProjectId} onChange={(e) => setForm((f) => ({ ...f, interestedProjectId: e.target.value }))} className="input">
                    <option value="">Select Interested Project</option>
                    {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                  </select>
                </LField>
                <LField label="Lead Category">
                  <select value={form.leadCategoryId} onChange={(e) => setForm((f) => ({ ...f, leadCategoryId: e.target.value }))} className="input">
                    <option value="">Select Category</option>
                    {leadCategories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </LField>
                <LField label="Campaign">
                  <select value={form.campaignId} onChange={(e) => setForm((f) => ({ ...f, campaignId: e.target.value }))} className="input">
                    <option value="">Select Campaign</option>
                    {campaigns.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </LField>
              </div>
            </div>
          )}

          <SectionHeader label="Personal Info" open={sectionOpen.personal} onToggle={() => toggleSection('personal')} />
          {sectionOpen.personal && (
            <div className="bg-gray-50 p-4 rounded-b-md mb-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <LField label="Organization">
                  <input value={form.organization} onChange={(e) => setForm((f) => ({ ...f, organization: e.target.value }))} placeholder="Organization" className="input" />
                </LField>
                <LField label="Designation">
                  <input value={form.designation} onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))} placeholder="Designation" className="input" />
                </LField>
                <LField label="Birth Date">
                  <input type="date" value={form.birthDate} onChange={(e) => setForm((f) => ({ ...f, birthDate: e.target.value }))} className="input" />
                </LField>
                <LField label="Anniversary Date">
                  <input type="date" value={form.anniversaryDate} onChange={(e) => setForm((f) => ({ ...f, anniversaryDate: e.target.value }))} className="input" />
                </LField>
                <LField label="Proffession">
                  <select value={form.profession} onChange={(e) => setForm((f) => ({ ...f, profession: e.target.value }))} className="input">
                    <option value="">Select Proffession</option>
                    {professions.map((p) => <option key={p._id} value={p.name}>{p.name}</option>)}
                  </select>
                </LField>
                <LField label="Address">
                  <input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="Address" className="input" />
                </LField>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                <LField label="Email">
                  <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="Email" className="input" />
                </LField>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium px-6 py-2 rounded-md">Close</button>
            <button type="submit" disabled={saving} className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-6 py-2 rounded-md disabled:opacity-50">
              {saving ? 'Saving...' : 'Submit'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ---------- Lead Detail (tabbed) ---------- */}
      {detailLeadId && (
        <LeadDetailModal
          leadId={detailLeadId}
          onClose={() => setDetailLeadId(null)}
          onChanged={load}
        />
      )}

      {/* ---------- Call Assign ---------- */}
      <Modal open={callAssignOpen} title="Call Assign" onClose={() => setCallAssignOpen(false)}>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <LField label="Date">
            <input
              type="datetime-local"
              value={callAssignForm.date}
              onChange={(e) => setCallAssignForm((f) => ({ ...f, date: e.target.value }))}
              className="input"
            />
          </LField>
          <LField label="Assign User Type">
            <select
              value={callAssignForm.userType}
              onChange={(e) => setCallAssignForm((f) => ({ ...f, userType: e.target.value }))}
              className="input"
            >
              <option value="Officer">Officer</option>
              <option value="SR">SR</option>
            </select>
          </LField>
          <LField label="Note">
            <input
              value={callAssignForm.note}
              onChange={(e) => setCallAssignForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="Write Descriptions"
              className="input"
            />
          </LField>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={() => setCallAssignOpen(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium px-6 py-2 rounded-md">Close</button>
          <button onClick={submitCallAssign} className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-6 py-2 rounded-md">Submit</button>
        </div>
      </Modal>

      {/* ---------- Transfer Lead ---------- */}
      <Modal open={transferOpen} title="Transfer Lead" onClose={() => setTransferOpen(false)}>
        <div className="flex items-start justify-between mb-4">
          <div className="grid grid-cols-2 gap-4 flex-1">
            <LField label="Assign User">
              <select
                value=""
                onChange={(e) => updateTransferRow(0, 'userId', e.target.value)}
                className="input"
              >
                <option value="">Select User</option>
                {users.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
              </select>
            </LField>
            <LField label="Assign Type">
              <div className="flex items-center gap-4">
                <select value={transferAssignType} onChange={(e) => setTransferAssignType(e.target.value)} className="input">
                  <option value="Officer/SR">Officer/SR</option>
                  <option value="Officer">Officer</option>
                  <option value="SR">SR</option>
                </select>
                <label className="flex items-center gap-1 text-sm whitespace-nowrap">
                  <input type="checkbox" checked={transferFollowup} onChange={(e) => setTransferFollowup(e.target.checked)} />
                  Followup
                </label>
                <label className="flex items-center gap-1 text-sm whitespace-nowrap">
                  <input type="checkbox" checked={transferManualSet} onChange={(e) => setTransferManualSet(e.target.checked)} />
                  Manual Set
                </label>
              </div>
            </LField>
          </div>
          <div className="ml-6 text-right">
            <div className="text-sm text-gray-500">Selected Lead:</div>
            <div className="text-red-600 font-semibold text-lg">{selectedIds.length}</div>
          </div>
        </div>

        <table className="w-full text-sm mb-2">
          <thead>
            <tr className="bg-indigo-500 text-white text-left">
              <th className="px-3 py-2 font-medium">USER NAME</th>
              <th className="px-3 py-2 font-medium">QUANTITY</th>
              <th className="px-3 py-2 font-medium text-center w-20">
                ACTION
                <button type="button" onClick={addTransferRow} className="ml-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded p-0.5 align-middle">
                  <Plus size={14} />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {transferRows.map((row, idx) => (
              <tr key={idx} className="border-b border-gray-100">
                <td className="px-3 py-2">
                  <select
                    value={row.userId}
                    onChange={(e) => updateTransferRow(idx, 'userId', e.target.value)}
                    className="input"
                  >
                    <option value="">Select User</option>
                    {users.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min="0"
                    disabled={!transferManualSet}
                    value={row.quantity}
                    onChange={(e) => updateTransferRow(idx, 'quantity', e.target.value)}
                    className="input disabled:bg-gray-100"
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  {transferRows.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setTransferRows((rows) => rows.filter((_, i) => i !== idx))}
                      className="text-red-500 text-xs"
                    >
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <LField label="Assign Total Transfer">
          <input value={transferTotal} onChange={(e) => setTransferTotal(e.target.value)} className="input" />
        </LField>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={() => setTransferOpen(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium px-6 py-2 rounded-md">Close</button>
          <button onClick={submitTransfer} className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-6 py-2 rounded-md">Transfer</button>
        </div>
      </Modal>

      {/* ---------- SMS Template ---------- */}
      <Modal open={smsModal} title="SMS Template" onClose={() => setSmsModal(false)}>
        <LField label="SMS Template">
          <select value={smsTemplateId} onChange={(e) => applyTemplate(e.target.value)} className="input">
            <option value="">Select Template</option>
            {SMS_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </LField>
        <div className="mt-4">
          <LField label="SMS">
            <textarea rows={5} value={smsMessage} onChange={(e) => setSmsMessage(e.target.value)} placeholder="Write SMS" className="input resize-y" />
          </LField>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={() => setSmsModal(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium px-6 py-2 rounded-md">Close</button>
          <button onClick={submitSms} className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-6 py-2 rounded-md">Submit</button>
        </div>
      </Modal>

      {/* ---------- Convert to Customer ---------- */}
      <Modal open={!!convertLeadId} title="Convert To Customer" onClose={() => setConvertLeadId(null)}>
        <LField label="NID (required for customer record)">
          <input value={convertNid} onChange={(e) => setConvertNid(e.target.value)} className="input" placeholder="Type NID" />
        </LField>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={() => setConvertLeadId(null)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium px-6 py-2 rounded-md">Close</button>
          <button onClick={submitConvert} className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-6 py-2 rounded-md">Convert</button>
        </div>
      </Modal>

      {/* ---------- Bulk Import ---------- */}
      <Modal open={importModal} title="Bulk Import" onClose={() => setImportModal(false)}>
        <div className="flex justify-end -mt-10 mb-2">
          <a href="/sample-lead-import.xlsx" className="text-indigo-600 text-sm hover:underline">↓ Sample File Download</a>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <LField label="File">
            <input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setImportFile(e.target.files[0])} className="input" />
          </LField>
          <LField label="Lead Stage">
            <select value={importFilters.leadStage} onChange={(e) => setImportFilters((f) => ({ ...f, leadStage: e.target.value }))} className="input">
              <option value="">Select Stage</option>
              {leadStages.map((s) => <option key={s._id} value={s.name}>{s.name}</option>)}
            </select>
          </LField>
          <LField label="Lead Category">
            <select value={importFilters.leadCategoryId} onChange={(e) => setImportFilters((f) => ({ ...f, leadCategoryId: e.target.value }))} className="input">
              <option value="">Select Category</option>
              {leadCategories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </LField>
          <LField label="Lead Source">
            <select value={importFilters.leadSourceId} onChange={(e) => setImportFilters((f) => ({ ...f, leadSourceId: e.target.value }))} className="input">
              <option value="">Select Source</option>
              {leadSources.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </LField>
          <LField label="Campaign">
            <select value={importFilters.campaignId} onChange={(e) => setImportFilters((f) => ({ ...f, campaignId: e.target.value }))} className="input">
              <option value="">Select Campaign</option>
              {campaigns.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </LField>
          <LField label="Interested Project">
            <select value={importFilters.interestedProjectId} onChange={(e) => setImportFilters((f) => ({ ...f, interestedProjectId: e.target.value }))} className="input">
              <option value="">Select</option>
              {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </LField>
          <LField label="User/SR">
            <select
              multiple
              value={importFilters.userIds}
              onChange={(e) => setImportFilters((f) => ({ ...f, userIds: Array.from(e.target.selectedOptions, (o) => o.value) }))}
              className="input h-24"
            >
              {users.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
            </select>
          </LField>
          <LField label="If CR">
            <select
              multiple
              value={importFilters.crIds}
              onChange={(e) => setImportFilters((f) => ({ ...f, crIds: Array.from(e.target.selectedOptions, (o) => o.value) }))}
              className="input h-24"
            >
              {users.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
            </select>
          </LField>
        </div>

        <p className="text-red-500 text-xs mt-4">
          Note: If Lead Source or Campaign is not found in the Excel file, the values selected in this form will be used.
        </p>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={() => setImportModal(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium px-6 py-2 rounded-md">Close</button>
          <button onClick={submitImport} className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-6 py-2 rounded-md">Submit</button>
        </div>
      </Modal>

      {/* ---------- Filter ---------- */}
      <Modal open={filterModal} title="Filter Leads" onClose={() => setFilterModal(false)}>
        <div className="grid grid-cols-1 gap-4">
          <LField label="SR/Officer">
            <input value={filters.srOfficer} onChange={(e) => setFilters((f) => ({ ...f, srOfficer: e.target.value }))} className="input" />
          </LField>
          <LField label="Status">
            <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} className="input">
              <option value="">All</option>
            </select>
          </LField>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={() => { setFilters({ srOfficer: '', status: '' }); setPage(1); }} className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium px-6 py-2 rounded-md">Reset</button>
          <button onClick={() => { setPage(1); setFilterModal(false); }} className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-6 py-2 rounded-md">Apply</button>
        </div>
      </Modal>

      <ConfirmSelectionModal open={needSelection} onClose={() => setNeedSelection(false)} />

      <style>{`
        .input { width: 100%; border: 1px solid #d1d5db; border-radius: 6px; padding: 8px 10px; font-size: 14px; }
        .input:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 2px rgba(99,102,241,0.15); }
      `}</style>
    </div>
  );
}

function LField({ label, children }) {
  return (
    <div>
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

function SectionHeader({ label, open, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between bg-blue-50 text-indigo-700 font-semibold text-sm px-4 py-2 rounded-t-md border border-blue-100"
    >
      {label}
      {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
    </button>
  );
}

const COLOR_MAP = {
  indigo: 'bg-indigo-500 hover:bg-indigo-600',
  violet: 'bg-violet-500 hover:bg-violet-600',
  teal: 'bg-teal-500 hover:bg-teal-600',
  emerald: 'bg-emerald-500 hover:bg-emerald-600',
  cyan: 'bg-cyan-500 hover:bg-cyan-600',
  orange: 'bg-orange-500 hover:bg-orange-600',
  pink: 'bg-pink-500 hover:bg-pink-600',
  red: 'bg-red-500 hover:bg-red-600',
  gray: 'bg-gray-500 hover:bg-gray-600',
};

function ActionButton({ color, icon: Icon, onClick, children }) {
  return (
    <button onClick={onClick} className={`${COLOR_MAP[color]} text-white text-xs font-medium px-3 py-2 rounded-md flex items-center gap-1.5 whitespace-nowrap`}>
      {Icon && <Icon size={13} />}
      {children}
    </button>
  );
}