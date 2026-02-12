'use client';

import { memo } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { useComparison } from './ComparisonContext';

export const ComparisonToggle = memo(function ComparisonToggle() {
  const { compareEnabled, toggleCompare } = useComparison();

  return (
    <button
      onClick={toggleCompare}
      className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
        compareEnabled
          ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/20'
          : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'
      }`}
      title={compareEnabled ? 'Disable period comparison' : 'Compare with previous period'}
    >
      <ArrowLeftRight className="w-4 h-4" />
      <span className="hidden sm:inline">Compare</span>
    </button>
  );
});
