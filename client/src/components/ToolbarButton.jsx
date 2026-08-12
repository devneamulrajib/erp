export default function ToolbarButton({ icon: Icon, label, onClick, color = 'bg-cyan-500 hover:bg-cyan-600' }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 ${color} text-white text-sm font-medium px-3 py-1.5 rounded-md`}
    >
      {Icon && <Icon size={14} />}
      {label}
    </button>
  );
}