import { useState } from 'react';

const RANGES = ['Today', 'Weekly', 'Monthly', 'Yearly', 'All'];

export default function TimeFilterTabs({ onChange }) {
  const [active, setActive] = useState('Today');

  function handleClick(range) {
    setActive(range);
    if (onChange) onChange(range);
  }

  return (
    <div className="flex gap-1">
      {RANGES.map((range) => (
        <button
          key={range}
          onClick={() => handleClick(range)}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            active === range ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          {range}
        </button>
      ))}
    </div>
  );
}