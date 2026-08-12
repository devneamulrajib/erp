import { PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function PurchaseDonutChart({ labels, values }) {
  const total = values.reduce((sum, v) => sum + v, 0);
  const hasData = total > 0;
  const chartData = labels.map((label, i) => ({ name: label, value: values[i] }));

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="font-semibold text-center">Purchase</h3>
      <p className="text-center text-gray-400 text-xs mb-2">Last 12 Months</p>
      <div className="flex justify-center">
        <PieChart width={220} height={220}>
          <Pie
            data={hasData ? chartData : [{ name: 'empty', value: 1 }]}
            dataKey="value"
            innerRadius={65}
            outerRadius={95}
          >
            {hasData
              ? chartData.map((d, i) => <Cell key={d.name} fill={COLORS[i % COLORS.length]} />)
              : <Cell fill="#3b82f6" />}
          </Pie>
        </PieChart>
      </div>
      <div className="flex justify-center flex-wrap gap-3 mt-2 text-sm">
        {labels.map((label, i) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}