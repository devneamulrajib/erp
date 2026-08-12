import { AlertTriangle } from 'lucide-react';

export default function ConfirmSelectionModal({ open, onClose, message = 'Please select atleast one checkbox' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg w-full max-w-md mx-4 p-8 text-center">
        <div className="flex justify-center mb-4">
          <AlertTriangle size={56} className="text-orange-400" strokeWidth={1.5} />
        </div>
        <p className="text-lg font-medium text-gray-700 mb-6">{message}</p>
        <button
          onClick={onClose}
          className="bg-sky-400 hover:bg-sky-500 text-white text-sm font-medium px-8 py-2 rounded-md"
        >
          OK
        </button>
      </div>
    </div>
  );
}