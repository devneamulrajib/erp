import { PieChart, Pie, Cell, Tooltip } from 'recharts';

const PALETTE = ['#2563eb', '#7c3aed', '#0ea5e9', '#a855f7', '#6366f1', '#0891b2'];

export default function ExpenseDonut({ data }) {
  const total = data.reduce((sum, d) => sum + (Number(d.total) || 0), 0);

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:justify-center">
      <div className="relative shrink-0">
        <PieChart width={220} height={220}>
          <Pie data={data} dataKey="total" nameKey="name" innerRadius={68} outerRadius={100} paddingAngle={2} stroke="none">
            {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
          </Pie>
          <Tooltip formatter={(v) => `$${Number(v).toLocaleString()}`} />
        </PieChart>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Spend</span>
          <span className="text-xl font-extrabold tabular-nums text-slate-900">${total.toLocaleString()}</span>
          <span className="text-[10px] font-semibold text-emerald-600">100% audited</span>
        </div>
      </div>

      <div className="w-full space-y-2.5 sm:w-auto sm:min-w-[190px]">
        {data.map((d, i) => (
          <div key={i} className="flex items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: PALETTE[i % PALETTE.length] }} />
              <span className="truncate font-medium text-slate-700">{d.name}</span>
            </div>
            <div className="text-right shrink-0">
              <span className="font-bold tabular-nums text-slate-900">${Number(d.total).toLocaleString()}</span>
              <span className="ml-1 text-[11px] text-slate-400">
                ({total ? Math.round((Number(d.total) / total) * 100) : 0}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}