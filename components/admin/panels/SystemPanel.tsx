'use client';

import { useState, memo } from 'react';
import { HeartPulse, Download } from 'lucide-react';
import { HealthPanel } from './HealthPanel';
import { ExportPanel } from './ExportPanel';

type SubTab = 'health' | 'export';

const SUB_TABS: { id: SubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'health', label: 'Health', icon: HeartPulse },
  { id: 'export', label: 'Export', icon: Download },
];

export const SystemPanel = memo(function SystemPanel() {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('health');

  return (
    <div className="flex-1 flex flex-col space-y-4 min-h-0">
      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-1 border-b border-gray-700">
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-gray-300 text-white'
                  : 'border-transparent text-gray-400 hover:text-white hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Sub-tab Content */}
      <div className="flex-1 overflow-auto">
        {activeSubTab === 'health' && <HealthPanel />}
        {activeSubTab === 'export' && <ExportPanel />}
      </div>
    </div>
  );
});
