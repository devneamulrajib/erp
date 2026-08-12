import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function PurchaseConsumptionChart({ labels, purchase, consumption }) {
  const data = labels.map((label, i) => ({
    name: label,
    Purchase: purchase[i],
    Consumption: consumption[i],
  }));

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="font-semibold mb-2">Purchase vs Consumption</h3>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="Purchase" fill="#f59e0b" />
          <Bar dataKey="Consumption" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}