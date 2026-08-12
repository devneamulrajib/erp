import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

export default function ExpenseDonut({ data }) {
  return (
    <PieChart width={320} height={280}>
      <Pie data={data} dataKey="total" innerRadius={65} outerRadius={100} fill="#3b82f6">
        {data.map((_, i) => <Cell key={i} fill="#3b82f6" />)}
      </Pie>
      <Tooltip />
      <Legend />
    </PieChart>
  );
}