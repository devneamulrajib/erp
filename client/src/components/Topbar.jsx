import { Search, Settings, Sun, Grid3x3, Bell, User } from 'lucide-react';

export default function Topbar() {
  return (
    <header className="flex items-center justify-between bg-white border-b border-gray-200 px-4 py-2">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">S</div>
        <span className="font-semibold text-gray-700 hidden sm:block">Somikoron IT Ltd</span>
      </div>

      <div className="flex-1 max-w-md mx-6">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search Modules..."
            className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 text-gray-500">
        <button className="hover:text-gray-800"><Settings size={18} /></button>
        <button className="hover:text-gray-800"><Sun size={18} /></button>
        <button className="hover:text-gray-800"><Grid3x3 size={18} /></button>
        <button className="hover:text-gray-800"><Bell size={18} /></button>
        <button className="hover:text-gray-800"><User size={18} /></button>
      </div>
    </header>
  );
}