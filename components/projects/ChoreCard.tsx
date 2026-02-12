'use client';

import { Check, MoreVertical } from 'lucide-react';
import { Chore } from '@/lib/types';
import { formatTimestamp } from '@/lib/utils/date-utils';
import { useState } from 'react';

interface ChoreCardProps {
  chore: Chore;
  onStatusChange: (choreId: string, status: string) => void;
  onEdit: (chore: Chore) => void;
  onDelete: (choreId: string) => void;
  onUpdateProgress?: (chore: Chore) => void;
}

export function ChoreCard({ chore, onStatusChange, onEdit, onDelete, onUpdateProgress }: ChoreCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:shadow-lg transition-all">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <button onClick={() => onStatusChange(chore.id, chore.status === 'completed' ? 'pending' : 'completed')} aria-label={`Toggle chore status: ${chore.status === 'completed' ? 'Completed' : 'Pending'}`} className={`btn-touch mt-1 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center active:scale-95 hover:scale-110 transition-transform ${chore.status === 'completed' ? 'bg-green-500 border-green-500' : 'border-gray-600'}`}>
            {chore.status === 'completed' && <Check className="w-3 h-3 text-white" />}
          </button>
          <div className="flex-1">
            <h3 className={`font-semibold text-white ${chore.status === 'completed' ? 'line-through opacity-60' : ''}`}>{chore.title}</h3>
            {chore.description && <p className="text-sm text-gray-400 mt-1">{chore.description}</p>}

            {/* Progress Bar */}
            {chore.completion_percentage !== undefined && chore.completion_percentage > 0 && (
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400">Progress</span>
                  <span className="text-xs font-semibold text-gray-300">{chore.completion_percentage}%</span>
                </div>
                <div className="h-2 bg-gray-600 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${chore.completion_percentage < 30
                        ? 'bg-gradient-to-r from-red-400 to-red-500'
                        : chore.completion_percentage < 70
                          ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                          : 'bg-gradient-to-r from-green-400 to-green-500'
                      }`}
                    style={{ width: `${chore.completion_percentage}%` }}
                  />
                </div>
              </div>
            )}

            {chore.notes && (
              <p className="text-xs text-gray-400 mt-2 italic">Note: {chore.notes}</p>
            )}

            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
              <span className="capitalize">{chore.frequency}</span>
              {chore.due_date && <span>{formatTimestamp(chore.due_date, 'MMM d')}</span>}
            </div>
          </div>
        </div>
        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)} aria-label="Chore options menu" className="p-2 text-gray-400 hover:text-gray-300 transition-colors"><MoreVertical className="w-5 h-5" /></button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 mt-1 w-40 dropdown-mobile bg-gray-800 border border-gray-700 rounded-2xl shadow-lg z-20 overflow-hidden">
                <button onClick={() => { onEdit(chore); setShowMenu(false); }} className="btn-touch w-full px-4 py-2 text-left text-sm hover:bg-gray-700 transition-colors">Edit</button>
                {onUpdateProgress && (
                  <button onClick={() => { onUpdateProgress(chore); setShowMenu(false); }} className="btn-touch w-full px-4 py-2 text-left text-sm hover:bg-gray-700 transition-colors">Update Progress</button>
                )}
                <button onClick={() => { onDelete(chore.id); setShowMenu(false); }} className="btn-touch w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-900/20 transition-colors">Delete</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
