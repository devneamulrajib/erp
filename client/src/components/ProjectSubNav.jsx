import { useState } from 'react';
import {
  Folder, Building2, UserSquare2, Banknote, Share2,
  ClipboardList, Receipt, Landmark, FileText, ChevronDown,
} from 'lucide-react';

const SUBNAV_ITEMS = [
  { key: 'projects', label: 'Projects', icon: Folder },
  { key: 'project', label: 'Project', icon: Building2 },
  { key: 'contact', label: 'Contact', icon: UserSquare2 },
  { key: 'investment', label: 'Investment', icon: Banknote },
  { key: 'share-project', label: 'Share Project', icon: Share2 },
  { key: 'requisition', label: 'Requisition', icon: ClipboardList },
  { key: 'billing', label: 'Billing', icon: Receipt },
  { key: 'flat-land', label: 'Flat/Land', icon: Landmark },
  { key: 'document', label: 'Document', icon: FileText },
];

export default function ProjectSubNav() {
  const [active, setActive] = useState('projects');

  return (
    <nav className="flex items-center gap-1 bg-gray-800 px-2 py-1.5 overflow-x-auto">
      {SUBNAV_ITEMS.map(({ key, label, icon: Icon }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            onClick={() => setActive(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
              isActive ? 'bg-indigo-500 text-white' : 'text-gray-200 hover:bg-gray-700'
            }`}
          >
            <Icon size={15} />
            {label}
            <ChevronDown size={13} />
          </button>
        );
      })}
    </nav>
  );
}