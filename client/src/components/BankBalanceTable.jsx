export default function BankBalanceTable({ accounts, total }) {
  return (
    <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
      <div className="bg-indigo-500 text-white font-semibold text-center py-2">Cash Bank Balance</div>
      <table className="w-full text-sm">
        <tbody>
          {accounts.map((a, i) => (
            <tr key={a._id || i} className="border-b border-gray-100">
              <td className="py-1.5 px-3 text-gray-500 w-6">{i + 1}</td>
              <td className="py-1.5 px-3 text-blue-600">{a.name}</td>
              <td className="py-1.5 px-3 text-gray-500">
                {a.lastUpdated ? new Date(a.lastUpdated).toLocaleDateString('en-GB') : ''}
              </td>
              <td className="py-1.5 px-3 text-right">
                {a.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </td>
            </tr>
          ))}
          <tr className="font-bold">
            <td colSpan={3} className="py-1.5 px-3">Total</td>
            <td className="py-1.5 px-3 text-right">
              {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </td>
          </tr>
        </tbody>
      </table>
      <div className="text-center py-2">
        <button className="border border-indigo-400 text-indigo-600 text-sm px-4 py-1 rounded hover:bg-indigo-50">
          Show More
        </button>
      </div>
    </div>
  );
}