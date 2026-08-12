import { Calendar, Users } from 'lucide-react';

export default function ProjectCard({ project }) {
  const statusColors = {
    'ON TRACK': { border: 'border-green-500', bg: 'bg-green-500', bar: 'bg-green-500' },
    'AT RISK': { border: 'border-amber-500', bg: 'bg-amber-500', bar: 'bg-amber-500' },
    'IN TROUBLE': { border: 'border-red-500', bg: 'bg-red-500', bar: 'bg-red-500' },
    DELAYED: { border: 'border-yellow-500', bg: 'bg-yellow-500', bar: 'bg-yellow-500' },
    DONE: { border: 'border-blue-500', bg: 'bg-blue-500', bar: 'bg-blue-500' },
  };
  const colors = statusColors[project.status] || statusColors['ON TRACK'];
  const budgetPercent = project.budget ? Math.round((project.budgetUsed / project.budget) * 100) : 0;

  return (
    <div className={`flex border-2 ${colors.border} rounded-lg overflow-hidden mb-3 bg-white`}>
      <div className={`${colors.bg} text-white text-xs font-bold px-1.5 flex items-center justify-center [writing-mode:vertical-rl] rotate-180`}>
        {project.status}
      </div>
      <div className="p-3 flex-1 text-left">
        <div className="font-semibold text-blue-700 mb-2">{project.name}</div>

        <div className="grid grid-cols-3 gap-2 text-xs items-center mb-2">
          <div>
            <div className="text-gray-500 mb-1">% Complete</div>
            <div className="h-1.5 bg-gray-200 rounded-full">
              <div className={`h-1.5 ${colors.bar} rounded-full`} style={{ width: `${project.percentComplete}%` }} />
            </div>
            <div className="font-semibold mt-0.5">{project.percentComplete.toFixed(2)}%</div>
          </div>
          <div className="flex items-center gap-1 text-gray-600">
            <span className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center"><Calendar size={12} /></span>
            {project.months} Months
          </div>
          <div className="text-gray-600">
            <div>Total Tasks <span className="inline-block bg-blue-100 text-blue-700 px-1.5 rounded">{project.totalTasks}</span></div>
            <div>Completed <span className="inline-block bg-green-100 text-green-700 px-1.5 rounded">{project.completedTasks}</span></div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs items-center">
          <div>
            <div className="text-gray-500 mb-1">Project Budget</div>
            <div className="h-1.5 bg-gray-200 rounded-full">
              <div className="h-1.5 bg-gray-400 rounded-full" style={{ width: `${budgetPercent}%` }} />
            </div>
            <div className="font-semibold mt-0.5">{budgetPercent}%</div>
          </div>
          <div className="flex items-center gap-1 text-gray-600">
            <span className="w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center"><Users size={12} /></span>
            {project.members} Members
          </div>
          <div />
        </div>
      </div>
    </div>
  );
}