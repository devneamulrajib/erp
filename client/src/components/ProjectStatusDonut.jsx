import { PieChart, Pie, Cell } from 'recharts';

const STATUS_COLORS = { onTrack: '#22c55e', atRisk: '#f59e0b', inTrouble: '#ef4444' };

export default function ProjectStatusDonut({ data }) {
  const total = data.total || 0;
  const chartData = [
    { key: 'onTrack', value: data.onTrack || 0 },
    { key: 'atRisk', value: data.atRisk || 0 },
    { key: 'inTrouble', value: data.inTrouble || 0 },
  ];
  const hasData = total > 0;
  const pct = (n) => (total ? Math.round((n / total) * 100) : 0);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="font-semibold text-center text-gray-400">PROJECT STATUS SUMMARY</h3>
      <p className="text-center text-gray-400 text-xs mb-2">Current Overview</p>
      <div className="relative flex justify-center">
        <PieChart width={220} height={220}>
          <Pie
            data={hasData ? chartData : [{ key: 'empty', value: 1 }]}
            dataKey="value"
            innerRadius={65}
            outerRadius={95}
            startAngle={90}
            endAngle={-270}
          >
            {hasData
              ? chartData.map((d) => <Cell key={d.key} fill={STATUS_COLORS[d.key]} />)
              : <Cell fill="#e5e7eb" />}
          </Pie>
        </PieChart>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-gray-700">{total} Total</span>
        </div>
      </div>
      <div className="mt-3 space-y-1 text-sm">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-green-500" />On Track</span>
          <span>{data.onTrack || 0} / {pct(data.onTrack)}%</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" />At Risk</span>
          <span>{data.atRisk || 0} / {pct(data.atRisk)}%</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-red-500" />In Trouble</span>
          <span>{data.inTrouble || 0} / {pct(data.inTrouble)}%</span>
        </div>
      </div>
    </div>
  );
}