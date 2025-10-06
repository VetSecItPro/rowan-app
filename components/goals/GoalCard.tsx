'use client';

import { Target, TrendingUp, MoreVertical } from 'lucide-react';
import { Goal } from '@/lib/services/goals-service';
import { format } from 'date-fns';
import { useState } from 'react';

interface GoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onDelete: (goalId: string) => void;
}

export function GoalCard({ goal, onEdit, onDelete }: GoalCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6 hover:shadow-lg transition-all duration-200">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="w-10 h-10 bg-gradient-goals rounded-lg flex items-center justify-center">
            <Target className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{goal.title}</h3>
            {goal.description && <p className="text-sm text-gray-600 dark:text-gray-400">{goal.description}</p>}
          </div>
        </div>
        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <MoreVertical className="w-5 h-5" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-gray-800 border rounded-lg shadow-xl z-20">
                <button onClick={() => { onEdit(goal); setShowMenu(false); }} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg">Edit</button>
                <button onClick={() => { onDelete(goal.id); setShowMenu(false); }} className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-lg">Delete</button>
              </div>
            </>
          )}
        </div>
      </div>
      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm text-gray-600 dark:text-gray-400">Progress</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">{goal.progress}%</span>
          </div>
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-goals transition-all duration-300" style={{ width: `${goal.progress}%` }} />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className={`px-3 py-1 text-xs font-medium rounded-full ${
            goal.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
            goal.status === 'active' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
            'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300'
          }`}>{goal.status}</span>
          {goal.target_date && <span className="text-xs text-gray-500">{format(new Date(goal.target_date), 'MMM d, yyyy')}</span>}
        </div>
      </div>
    </div>
  );
}
