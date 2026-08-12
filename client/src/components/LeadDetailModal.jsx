import { useState, useEffect, useCallback } from 'react';
import { X, MessageCircle, Phone, MessageSquare, Paperclip, Plus, Trash2 } from 'lucide-react';
import {
  getLead, updateLeadStage, addRequirement, deleteRequirement,
  addDealNegotiation, deleteDealNegotiation,
  assignFlatToLead, unassignFlatFromLead,
  addFollowUp, addVisit, addLeadNote, deleteLeadNote,
} from '../api/lead';
import { getAreas } from '../api/area';
import { getFlats } from '../api/flat';
import { getUsers } from '../api/user';
import { getCommunicationStatuses } from '../api/communicationStatus';

const TABS = ['Upcoming/Pending', 'Requirements', 'Deal Negotiation', 'Property', 'Follow-up', 'Visits', 'Note'];

export default function LeadDetailModal({ leadId, onClose, onChanged }) {
  const [lead, setLead] = useState(null);
  const [tab, setTab] = useState('Upcoming/Pending');
  const [areas, setAreas] = useState([]);
  const [users, setUsers] = useState([]);
  const [commStatuses, setCommStatuses] = useState([]);

  const reload = useCallback(async () => {
    if (!leadId) return;
    const { data } = await getLead(leadId);
    setLead(data);
  }, [leadId]);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    getAreas().then(({ data }) => setAreas(data)).catch(() => setAreas([]));
    getUsers().then(({ data }) => setUsers(data)).catch(() => setUsers([]));
    getCommunicationStatuses().then(({ data }) => setCommStatuses(data)).catch(() => setCommStatuses([]));
  }, []);

  if (!leadId) return null;
  if (!lead) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-lg px-8 py-6 text-gray-500">Loading...</div>
      </div>
    );
  }

  async function refreshAfter(fn) {
    await fn();
    await reload();
    onChanged?.();
  }

  const initials = (lead.name || '?').slice(0, 2).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-6 overflow-y-auto">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-6xl mx-4 mb-6">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">
          <X size={18} />
        </button>

        <div className="flex flex-col md:flex-row">
          {/* Left profile panel */}
          <div className="w-full md:w-[340px] border-r border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-semibold">{lead.name}</h3>
            </div>

            <div className="flex justify-center gap-2 mb-3">
              <span className="bg-black text-white text-xs font-medium px-3 py-1 rounded">Lead</span>
              <span className="bg-cyan-500 text-white text-xs font-medium px-3 py-1 rounded">
                {lead.leadCategoryId?.name || 'Category'}
              </span>
            </div>

            <div className="flex flex-col items-center mb-4">
              <div className="w-16 h-16 rounded-full bg-orange-400 text-white flex items-center justify-center text-xl font-bold mb-2">
                {initials}
              </div>
              <div className="flex gap-4 text-center text-xs text-gray-500">
                <a href={`https://wa.me/${lead.mobile}`} className="flex flex-col items-center gap-1">
                  <MessageCircle size={20} className="text-green-500" /> WhatsApp
                </a>
                <a href={`tel:${lead.mobile}`} className="flex flex-col items-center gap-1">
                  <Phone size={20} className="text-violet-500" /> Call
                </a>
                <span className="flex flex-col items-center gap-1">
                  <MessageSquare size={20} className="text-indigo-500" /> Message
                </span>
                <span className="flex flex-col items-center gap-1">
                  <Paperclip size={20} className="text-red-400" /> Attachment
                </span>
              </div>
            </div>

            <div className="bg-blue-50 rounded px-3 py-2 mb-3 text-sm">
              <div><b>ID:</b> {lead.leadId}</div>
              <div><b>Added By:</b> {lead.addedBy}</div>
            </div>

            <div className="space-y-2 text-sm">
              <Field label="Name" value={lead.name} />
              <Field label="Phone" value={lead.mobile} />
              <Field label="Email" value={lead.email} />
              <Field label="Organization" value={lead.organization} />
              <Field label="Designation" value={lead.designation} />
              <Field label="Profession" value={lead.profession} />
              <Field label="Address" value={lead.address} />
              <Field label="SR" value={lead.assignUserName} />
              <Field label="CR" value={lead.crUserName} />
              <Field label="Project" value={lead.interestedProjectId?.name} />
              <Field label="Created At" value={lead.createdAt ? new Date(lead.createdAt).toLocaleString('en-GB') : ''} />
            </div>
          </div>

          {/* Right tab panel */}
          <div className="flex-1 p-5 min-w-0">
            <div className="flex flex-wrap gap-4 border-b border-gray-100 mb-4">
              {TABS.map((t) => {
                const count = t === 'Requirements' ? lead.requirements.length
                  : t === 'Deal Negotiation' ? lead.dealNegotiations.length
                  : t === 'Property' ? lead.assignedFlats.length
                  : t === 'Follow-up' ? lead.followUps.length
                  : t === 'Visits' ? lead.visits.length
                  : t === 'Note' ? lead.notes.length : 0;
                return (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`relative pb-2 text-sm font-medium ${tab === t ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}
                  >
                    {t}
                    {count > 0 && (
                      <span className="absolute -top-2 -right-3 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {tab === 'Upcoming/Pending' && (
              <UpcomingPendingTab lead={lead} users={users} commStatuses={commStatuses} refreshAfter={refreshAfter} />
            )}
            {tab === 'Requirements' && (
              <RequirementsTab lead={lead} areas={areas} refreshAfter={refreshAfter} />
            )}
            {tab === 'Deal Negotiation' && (
              <DealNegotiationTab lead={lead} refreshAfter={refreshAfter} />
            )}
            {tab === 'Property' && (
              <PropertyTab lead={lead} refreshAfter={refreshAfter} />
            )}
            {tab === 'Follow-up' && <FollowUpTab lead={lead} />}
            {tab === 'Visits' && <VisitsTab lead={lead} />}
            {tab === 'Note' && <NoteTab lead={lead} refreshAfter={refreshAfter} />}
          </div>
        </div>
      </div>
      <style>{`.input { width: 100%; border: 1px solid #d1d5db; border-radius: 6px; padding: 6px 8px; font-size: 13px; }`}</style>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-500 w-24 shrink-0">{label}</span>
      <span className="border border-gray-200 rounded px-2 py-1 flex-1 text-gray-700 truncate">{value || '-'}</span>
    </div>
  );
}

// ---------------- Upcoming/Pending ----------------
function UpcomingPendingTab({ lead, users, commStatuses, refreshAfter }) {
  const [stage, setStage] = useState(lead.leadStage || '');
  const [possibility, setPossibility] = useState(lead.possibility || '');
  const [activity, setActivity] = useState('Followup');
  const [status, setStatus] = useState('');
  const [comment, setComment] = useState('');
  const [nextActivity, setNextActivity] = useState('Followup');
  const [nextDate, setNextDate] = useState('');
  const [nextUserId, setNextUserId] = useState('');
  const [nextNote, setNextNote] = useState('');

  async function saveStage() {
    await refreshAfter(() => updateLeadStage(lead._id, { leadStage: stage, possibility }));
  }

  async function toggleJunk() {
    await refreshAfter(() => updateLeadStage(lead._id, { isJunk: !lead.isJunk }));
  }

  async function toggleSold() {
    await refreshAfter(() => updateLeadStage(lead._id, { isSold: !lead.isSold }));
  }

  async function submit() {
    if (!status) { alert('Status is required'); return; }
    const user = users.find((u) => u._id === nextUserId);
    if (activity === 'Followup') {
      await refreshAfter(() => addFollowUp(lead._id, {
        status, comment,
        followUpDate: nextDate || undefined,
        note: nextNote,
        assignUserId: nextUserId || undefined,
        assignUserName: user?.name || 'Admin',
      }));
    } else {
      await refreshAfter(() => addVisit(lead._id, {
        status, comment,
        date: nextDate || undefined,
        note: nextNote,
        assignUserId: nextUserId || undefined,
        assignUserName: user?.name || 'Admin',
      }));
    }
    setStatus(''); setComment(''); setNextDate(''); setNextNote('');
  }

  return (
    <div className="space-y-5 text-sm">
      <div>
        <h4 className="text-indigo-700 font-semibold mb-2">Stage</h4>
        <div className="flex flex-wrap items-center gap-3">
          <select value={stage} onChange={(e) => setStage(e.target.value)} onBlur={saveStage} className="input w-40">
            <option value="">Select stage</option>
            <option value="Lead">Lead</option>
            <option value="Requirements">Requirements</option>
            <option value="Deal Negotiation">Deal Negotiation</option>
            <option value="Closed">Closed</option>
          </select>
          <button onClick={toggleJunk} className={`px-4 py-2 rounded-md text-sm font-medium ${lead.isJunk ? 'bg-red-500 text-white' : 'bg-pink-100 text-red-500'}`}>
            {lead.isJunk ? '✓ Junk' : 'Move to junk'}
          </button>
          <button onClick={toggleSold} className={`px-4 py-2 rounded-md text-sm font-medium ${lead.isSold ? 'bg-green-700 text-white' : 'bg-green-600 text-white'}`}>
            {lead.isSold ? '✓ Sold' : 'Mark as Sold'}
          </button>
          <div className="flex items-center gap-1">
            <span className="text-gray-500">Possibility</span>
            <input value={possibility} onChange={(e) => setPossibility(e.target.value)} onBlur={saveStage} className="input w-24" />
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-indigo-700 font-semibold mb-2">Current Activity:</h4>
        <div className="flex gap-6">
          <label className="flex items-center gap-1"><input type="radio" checked={activity === 'Followup'} onChange={() => setActivity('Followup')} /> Followup</label>
          <label className="flex items-center gap-1"><input type="radio" checked={activity === 'Task/Visit'} onChange={() => setActivity('Task/Visit')} /> Task/Visit</label>
        </div>
      </div>

      <div>
        <h4 className="text-indigo-700 font-semibold mb-2">Add {activity === 'Followup' ? 'Followup' : 'Task/Visit'}</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Status*</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="input">
              <option value="">Select Communication</option>
              {commStatuses.map((c) => <option key={c._id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Comment*</label>
            <input value={comment} onChange={(e) => setComment(e.target.value)} className="input" />
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-indigo-700 font-semibold mb-2">Next Activity:</h4>
        <div className="flex gap-6">
          <label className="flex items-center gap-1"><input type="radio" checked={nextActivity === 'Followup'} onChange={() => setNextActivity('Followup')} /> Followup</label>
          <label className="flex items-center gap-1"><input type="radio" checked={nextActivity === 'Task/Visit'} onChange={() => setNextActivity('Task/Visit')} /> Task/Visit</label>
        </div>
      </div>

      <div>
        <h4 className="text-indigo-700 font-semibold mb-2">Next {nextActivity === 'Followup' ? 'Followup' : 'Task/Visit'}</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input type="datetime-local" value={nextDate} onChange={(e) => setNextDate(e.target.value)} className="input" />
          <select value={nextUserId} onChange={(e) => setNextUserId(e.target.value)} className="input">
            <option value="">Assign User</option>
            {users.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
          </select>
          <input placeholder="Note" value={nextNote} onChange={(e) => setNextNote(e.target.value)} className="input" />
        </div>
      </div>

      <div className="flex justify-end">
        <button onClick={submit} className="bg-indigo-500 hover:bg-indigo-600 text-white px-5 py-2 rounded-md text-sm font-medium">
          Save Activity
        </button>
      </div>
    </div>
  );
}

// ---------------- Requirements ----------------
function RequirementsTab({ lead, areas, refreshAfter }) {
  const [form, setForm] = useState({ priceRange: '', size: '', area: '', type: '', description: '' });

  async function submit() {
    if (!form.priceRange && !form.size && !form.type) return;
    await refreshAfter(() => addRequirement(lead._id, form));
    setForm({ priceRange: '', size: '', area: '', type: '', description: '' });
  }

  async function remove(id) {
    await refreshAfter(() => deleteRequirement(lead._id, id));
  }

  return (
    <div>
      <div className="bg-green-50 border border-green-100 rounded p-3 grid grid-cols-1 sm:grid-cols-4 gap-3 mb-2">
        <LMini label="Price">
          <input value={form.priceRange} onChange={(e) => setForm((f) => ({ ...f, priceRange: e.target.value }))} placeholder="e.g. 50-70 Lac" className="input" />
        </LMini>
        <LMini label="Size">
          <input value={form.size} onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))} placeholder="Size" className="input" />
        </LMini>
        <LMini label="Area">
          <select value={form.area} onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))} className="input">
            <option value="">Select Area</option>
            {areas.map((a) => <option key={a._id} value={a._id}>{a.name}</option>)}
          </select>
        </LMini>
        <LMini label="Type">
          <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} className="input">
            <option value="">Select Type</option>
            <option value="Flat">Flat</option>
            <option value="Land">Land</option>
          </select>
        </LMini>
        <div className="sm:col-span-4">
          <LMini label="Description">
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className="input resize-y" rows={2} />
          </LMini>
        </div>
        <div className="sm:col-span-4 flex justify-end">
          <button onClick={submit} className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm px-4 py-1.5 rounded-md flex items-center gap-1">
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="bg-indigo-500 text-white text-left">
            <th className="px-3 py-2">PRICE</th>
            <th className="px-3 py-2">DESCRIPTION</th>
            <th className="px-3 py-2">SIZE</th>
            <th className="px-3 py-2">AREA</th>
            <th className="px-3 py-2">TYPE</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {lead.requirements.length === 0 ? (
            <tr><td colSpan={6} className="text-center py-4 text-gray-400">No requirements added</td></tr>
          ) : lead.requirements.map((r) => (
            <tr key={r._id} className="border-b border-gray-100">
              <td className="px-3 py-2">{r.priceRange}</td>
              <td className="px-3 py-2">{r.description}</td>
              <td className="px-3 py-2">{r.size}</td>
              <td className="px-3 py-2">{r.area?.name || '-'}</td>
              <td className="px-3 py-2">{r.type}</td>
              <td className="px-3 py-2">
                <button onClick={() => remove(r._id)} className="text-red-500"><Trash2 size={14} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LMini({ label, children }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

// ---------------- Deal Negotiation ----------------
function DealNegotiationTab({ lead, refreshAfter }) {
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ clientOfferPrice: '', listedPrice: '', finalPrice: '', activityType: 'Negotiation', status: 'Pending', round: 1 });

  async function submit() {
    await refreshAfter(() => addDealNegotiation(lead._id, form));
    setForm({ clientOfferPrice: '', listedPrice: '', finalPrice: '', activityType: 'Negotiation', status: 'Pending', round: 1 });
    setAdding(false);
  }

  async function remove(id) {
    await refreshAfter(() => deleteDealNegotiation(lead._id, id));
  }

  return (
    <div>
      <div className="flex justify-end mb-2">
        <button onClick={() => setAdding((a) => !a)} className="bg-indigo-500 hover:bg-indigo-600 text-white p-1.5 rounded-md">
          <Plus size={16} />
        </button>
      </div>

      {adding && (
        <div className="bg-gray-50 border border-gray-200 rounded p-3 grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
          <input type="number" placeholder="Client Offer" value={form.clientOfferPrice} onChange={(e) => setForm((f) => ({ ...f, clientOfferPrice: e.target.value }))} className="input" />
          <input type="number" placeholder="Listed Price" value={form.listedPrice} onChange={(e) => setForm((f) => ({ ...f, listedPrice: e.target.value }))} className="input" />
          <input type="number" placeholder="Final Price" value={form.finalPrice} onChange={(e) => setForm((f) => ({ ...f, finalPrice: e.target.value }))} className="input" />
          <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} className="input">
            <option value="Pending">Pending</option>
            <option value="Accepted">Accepted</option>
            <option value="Rejected">Rejected</option>
            <option value="Countered">Countered</option>
          </select>
          <button onClick={submit} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-md text-sm">Save</button>
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="bg-indigo-500 text-white text-left">
            <th className="px-3 py-2">#</th>
            <th className="px-3 py-2">FLAT/LAND</th>
            <th className="px-3 py-2">ACTIVITY TYPE</th>
            <th className="px-3 py-2">CLIENT OFFER</th>
            <th className="px-3 py-2">LISTED</th>
            <th className="px-3 py-2">FINAL</th>
            <th className="px-3 py-2">STATUS</th>
            <th className="px-3 py-2">ROUND</th>
            <th className="px-3 py-2">CREATED BY</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {lead.dealNegotiations.length === 0 ? (
            <tr><td colSpan={10} className="text-center py-4 text-gray-400">No negotiations yet</td></tr>
          ) : lead.dealNegotiations.map((d, i) => (
            <tr key={d._id} className="border-b border-gray-100">
              <td className="px-3 py-2">{i + 1}</td>
              <td className="px-3 py-2">{d.flat?.flatLandNo || '-'}</td>
              <td className="px-3 py-2">{d.activityType}</td>
              <td className="px-3 py-2">{d.clientOfferPrice}</td>
              <td className="px-3 py-2">{d.listedPrice}</td>
              <td className="px-3 py-2">{d.finalPrice}</td>
              <td className="px-3 py-2">{d.status}</td>
              <td className="px-3 py-2">{d.round}</td>
              <td className="px-3 py-2">{d.createdBy}</td>
              <td className="px-3 py-2">
                <button onClick={() => remove(d._id)} className="text-red-500"><Trash2 size={14} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------- Property ----------------
function PropertyTab({ lead, refreshAfter }) {
  const [projectId, setProjectId] = useState(lead.interestedProjectId?._id || '');
  const [available, setAvailable] = useState([]);

  async function loadAvailable() {
    if (!projectId) return;
    const { data } = await getFlats({ project: projectId, status: 'Available' });
    setAvailable(data);
  }

  async function assign(flatId) {
    await refreshAfter(() => assignFlatToLead(lead._id, flatId));
  }

  async function unassign(flatId) {
    await refreshAfter(() => unassignFlatFromLead(lead._id, flatId));
  }

  return (
    <div>
      <div className="flex items-end gap-2 mb-4">
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">Project</label>
          <input value={lead.interestedProjectId?.name || projectId} onChange={(e) => setProjectId(e.target.value)} placeholder="Select Project" className="input" />
        </div>
        <button onClick={loadAvailable} className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-md text-sm whitespace-nowrap">
          See Flat/Land
        </button>
      </div>

      {available.length > 0 && (
        <div className="mb-4">
          <h5 className="text-sm font-semibold text-gray-600 mb-2">Available in this project</h5>
          <table className="w-full text-sm mb-2">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="px-3 py-2">FLAT NO</th>
                <th className="px-3 py-2">SIZE</th>
                <th className="px-3 py-2">BED</th>
                <th className="px-3 py-2">BATH</th>
                <th className="px-3 py-2">FACING</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {available.map((f) => (
                <tr key={f._id} className="border-b border-gray-100">
                  <td className="px-3 py-2">{f.flatLandNo}</td>
                  <td className="px-3 py-2">{f.size}</td>
                  <td className="px-3 py-2">{f.bedroom}</td>
                  <td className="px-3 py-2">{f.bathroom}</td>
                  <td className="px-3 py-2">{f.facing || '-'}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => assign(f._id)} className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs px-3 py-1 rounded">
                      Assign
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h5 className="text-sm font-semibold text-gray-600 mb-2">Assigned to this lead</h5>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-indigo-500 text-white text-left">
            <th className="px-3 py-2">ID</th>
            <th className="px-3 py-2">PROJECT</th>
            <th className="px-3 py-2">FLAT NO</th>
            <th className="px-3 py-2">SIZE</th>
            <th className="px-3 py-2">BEDROOMS</th>
            <th className="px-3 py-2">BATHROOMS</th>
            <th className="px-3 py-2">FACING</th>
            <th className="px-3 py-2">SALE STATUS</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {lead.assignedFlats.length === 0 ? (
            <tr><td colSpan={9} className="text-center py-4 text-gray-400">No property assigned</td></tr>
          ) : lead.assignedFlats.map((f) => (
            <tr key={f._id} className="border-b border-gray-100">
              <td className="px-3 py-2">{f.code}</td>
              <td className="px-3 py-2">{f.project?.name || '-'}</td>
              <td className="px-3 py-2">{f.flatLandNo}</td>
              <td className="px-3 py-2">{f.size}</td>
              <td className="px-3 py-2">{f.bedroom}</td>
              <td className="px-3 py-2">{f.bathroom}</td>
              <td className="px-3 py-2">{f.facing || '-'}</td>
              <td className="px-3 py-2">{f.status}</td>
              <td className="px-3 py-2">
                <button onClick={() => unassign(f._id)} className="text-red-500"><Trash2 size={14} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------- Follow-up (history) ----------------
function FollowUpTab({ lead }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-indigo-500 text-white text-left">
          <th className="px-3 py-2">DATE</th>
          <th className="px-3 py-2">FOLLOW-UP DATE</th>
          <th className="px-3 py-2">NOTE</th>
          <th className="px-3 py-2">COMMENT</th>
          <th className="px-3 py-2">ASSIGN USER</th>
          <th className="px-3 py-2">STATUS</th>
        </tr>
      </thead>
      <tbody>
        {lead.followUps.length === 0 ? (
          <tr><td colSpan={6} className="text-center py-4 text-gray-400">No follow-ups yet</td></tr>
        ) : lead.followUps.map((f) => (
          <tr key={f._id} className="border-b border-gray-100">
            <td className="px-3 py-2">{f.createdAt ? new Date(f.createdAt).toLocaleString('en-GB') : '-'}</td>
            <td className="px-3 py-2">{f.followUpDate ? new Date(f.followUpDate).toLocaleString('en-GB') : '-'}</td>
            <td className="px-3 py-2">{f.note || '-'}</td>
            <td className="px-3 py-2">{f.comment || '-'}</td>
            <td className="px-3 py-2">{f.assignUserName || '-'}</td>
            <td className="px-3 py-2">{f.status || '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ---------------- Visits (history) ----------------
function VisitsTab({ lead }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-indigo-500 text-white text-left">
          <th className="px-3 py-2">DATE</th>
          <th className="px-3 py-2">NOTE</th>
          <th className="px-3 py-2">COMMENT</th>
          <th className="px-3 py-2">ASSIGN USER</th>
          <th className="px-3 py-2">STATUS</th>
        </tr>
      </thead>
      <tbody>
        {lead.visits.length === 0 ? (
          <tr><td colSpan={5} className="text-center py-4 text-gray-400">No visits/tasks yet</td></tr>
        ) : lead.visits.map((v) => (
          <tr key={v._id} className="border-b border-gray-100">
            <td className="px-3 py-2">{v.date ? new Date(v.date).toLocaleString('en-GB') : '-'}</td>
            <td className="px-3 py-2">{v.note || '-'}</td>
            <td className="px-3 py-2">{v.comment || '-'}</td>
            <td className="px-3 py-2">{v.assignUserName || '-'}</td>
            <td className="px-3 py-2">{v.status || '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ---------------- Note ----------------
function NoteTab({ lead, refreshAfter }) {
  const [text, setText] = useState('');

  async function submit() {
    if (!text.trim()) return;
    await refreshAfter(() => addLeadNote(lead._id, { note: text.trim() }));
    setText('');
  }

  async function remove(id) {
    await refreshAfter(() => deleteLeadNote(lead._id, id));
  }

  return (
    <div>
      <div className="bg-green-50 border border-green-100 rounded p-3 flex gap-2 mb-3">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Note" className="input flex-1" />
        <button onClick={submit} className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-1.5 rounded-md text-sm">Add</button>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-indigo-500 text-white text-left">
            <th className="px-3 py-2 w-16">SL</th>
            <th className="px-3 py-2">DATE</th>
            <th className="px-3 py-2">NOTE</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {lead.notes.length === 0 ? (
            <tr><td colSpan={4} className="text-center py-4 text-gray-400">No notes yet</td></tr>
          ) : lead.notes.map((n, i) => (
            <tr key={n._id} className="border-b border-gray-100">
              <td className="px-3 py-2">{i + 1}</td>
              <td className="px-3 py-2">{n.createdAt ? new Date(n.createdAt).toLocaleString('en-GB') : '-'}</td>
              <td className="px-3 py-2">{n.note}</td>
              <td className="px-3 py-2">
                <button onClick={() => remove(n._id)} className="text-red-500"><Trash2 size={14} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}