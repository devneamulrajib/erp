export default function OverflowMaterialTable({ rows }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="bg-gray-100 text-center font-semibold py-2 border-b border-gray-200">
        Overflow Material
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-indigo-500 text-white">
              <th className="px-3 py-2 text-left font-medium">SL</th>
              <th className="px-3 py-2 text-left font-medium">Description</th>
              <th className="px-3 py-2 text-left font-medium">Budget Qty</th>
              <th className="px-3 py-2 text-left font-medium">Budget Amount</th>
              <th className="px-3 py-2 text-left font-medium">Issue Qty</th>
              <th className="px-3 py-2 text-left font-medium">Issue Amount</th>
              <th className="px-3 py-2 text-left font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-6 text-gray-400">
                  No data available in table
                </td>
              </tr>
            ) : (
              rows.map((r, i) => (
                <tr key={r._id} className="border-t border-gray-100">
                  <td className="px-3 py-2">{i + 1}</td>
                  <td className="px-3 py-2">{r.description}</td>
                  <td className="px-3 py-2">{r.budgetQty}</td>
                  <td className="px-3 py-2">{r.budgetAmount}</td>
                  <td className="px-3 py-2">{r.issueQty}</td>
                  <td className="px-3 py-2">{r.issueAmount}</td>
                  <td className="px-3 py-2">{r.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="px-3 py-2 text-xs text-gray-400 border-t border-gray-100">
        Showing {rows.length} to {rows.length} of {rows.length} entries
      </div>
    </div>
  );
}