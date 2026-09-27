import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';

export default function InflowOutflowChart({ labels, inflow, outflow }) {
  const data = labels.map((label, i) => ({ label, In: inflow[i], Out: outflow[i] }));
  const net = (inflow.reduce((s, v) => s + (Number(v) || 0), 0)) - (outflow.reduce((s, v) => s + (Number(v) || 0), 0));

  return (
    <div>
      <div className="mb-3 flex items-center justify-end gap-4 text-xs font-semibold text-slate-500">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> In Flow</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-600" /> Out Flow</span>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)}
          />
          <Tooltip
            formatter={(v) => `$${Number(v).toLocaleString()}`}
            contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 12 }}
          />
          <Bar dataKey="In" fill="#f59e0b" name="In Flow" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Out" fill="#2563eb" name="Out Flow" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>

      <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
        <span className="text-slate-500">Liquidity ratio maintains a healthy buffer</span>
        <span className={`font-bold tabular-nums ${net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          {net >= 0 ? '+' : ''}${net.toLocaleString()} Net
        </span>
      </div>
    </div>
  );
}