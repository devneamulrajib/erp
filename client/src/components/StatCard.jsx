export default function StatCard({ label, value, colorFrom, colorTo }) {
  return (
    <div
      className="rounded-lg p-4 text-white text-center shadow"
      style={{ background: `linear-gradient(135deg, ${colorFrom}, ${colorTo})` }}
    >
      <div className="font-semibold">{label}</div>
      <div className="text-3xl font-bold mt-2">{value}</div>
    </div>
  );
}