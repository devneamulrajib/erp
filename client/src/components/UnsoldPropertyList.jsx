export default function UnsoldPropertyList({ properties }) {
  return (
    <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
      <div className="bg-red-500 text-white font-semibold text-center py-2">Unsold Property</div>
      <table className="w-full text-sm">
        <tbody>
          {properties.map((p, i) => (
            <tr key={p._id || i} className="border-b border-gray-100">
              <td className="py-1.5 px-3 text-gray-500 w-6">{i + 1}</td>
              <td className="py-1.5 px-3 text-blue-600">{i + 1}</td>
              <td className="py-1.5 px-3">{p.name}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="text-center py-2">
        <button className="bg-indigo-500 text-white text-sm px-6 py-1.5 rounded hover:bg-indigo-600">
          More
        </button>
      </div>
    </div>
  );
}