import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

export default function InflowOutflowChart({ labels, inflow, outflow }) {
  const data = labels.map((label, i) => ({ label, In: inflow[i], Out: outflow[i] }));
  return (
    <BarChart width={320} height={280} data={data}>
      <XAxis dataKey="label" />
      <YAxis />
      <Tooltip />
      <Legend />
      <Bar dataKey="In" fill="#f59e0b" name="In Flow" />
      <Bar dataKey="Out" fill="#3b82f6" name="Out Flow" />
    </BarChart>
  );
}