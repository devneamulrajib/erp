import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

// items: [{ label, to? }] — the last item (current page) should omit `to`
export default function Breadcrumb({ items }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 text-sm text-gray-500">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-2">
          {item.to ? (
            <Link to={item.to} className="text-indigo-600 hover:underline">{item.label}</Link>
          ) : (
            <span className="text-gray-700">{item.label}</span>
          )}
          {i < items.length - 1 && <ChevronRight size={14} />}
        </span>
      ))}
    </div>
  );
}