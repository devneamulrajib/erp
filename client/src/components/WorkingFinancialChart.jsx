import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function WorkingFinancialChart({ data }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="font-semibold mb-2">Working & Financial Progress</h3>
      {data.length === 0 ? (
        <div className="text-gray-400 text-sm text-center py-16">No project progress data yet</div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} margin={{ bottom: 60 }}>
            <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} height={80} tick={{ fontSize: 11 }} />
            <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
            <Tooltip />
            <Legend />
            <Bar dataKey="runningProgress" fill="#f59e0b" name="Running Progress (%)" />
            <Bar dataKey="financialProgress" fill="#3b82f6" name="Financial Progress (%)" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}