export default function CommentsTable({ comments }) {
  return (
    <div className="mt-6">
      <h3 className="font-semibold text-lg mb-2 text-left">Latest Comments</h3>
      <div className="bg-white rounded-lg overflow-hidden border border-gray-200">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="bg-indigo-500 text-white">
              <th className="py-2 px-3 font-semibold">USER</th>
              <th className="py-2 px-3 font-semibold">TITLE</th>
              <th className="py-2 px-3 font-semibold">COMMENTS</th>
              <th className="py-2 px-3 font-semibold">ATTACHMENTS</th>
              <th className="py-2 px-3 font-semibold">DATE & TIME</th>
            </tr>
          </thead>
          <tbody>
            {comments.length === 0 && (
              <tr><td colSpan={5} className="py-4 px-3 text-center text-gray-400">No comments yet</td></tr>
            )}
            {comments.map((c, i) => (
              <tr key={c._id || i} className="border-b border-gray-100">
                <td className="py-2 px-3">{c.user}</td>
                <td className="py-2 px-3">{c.title}</td>
                <td className="py-2 px-3">{c.comment}</td>
                <td className="py-2 px-3">{(c.attachments || []).join(', ')}</td>
                <td className="py-2 px-3 text-gray-500">
                  {c.createdAt ? new Date(c.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}