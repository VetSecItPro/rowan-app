'use client';

import { Home, Check, MoreVertical, Clock, AlertCircle, Pause } from 'lucide-react';
import { Chore } from '@/lib/types';
import { format } from 'date-fns';
import { useState } from 'react';

interface ChoreCardProps {
  chore: Chore;
  onStatusChange: (choreId: string, status: string) => void;
  onEdit: (chore: Chore) => void;
  onDelete: (choreId: string) => void;
}

export function ChoreCard({ chore, onStatusChange, onEdit, onDelete }: ChoreCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-lg transition-all">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <button onClick={() => {
            let newStatus = 'pending';
            if (chore.status === 'pending') {
              newStatus = 'in-progress';
            } else if (chore.status === 'in-progress') {
              newStatus = 'blocked';
            } else if (chore.status === 'blocked') {
              newStatus = 'on-hold';
            } else if (chore.status === 'on-hold') {
              newStatus = 'completed';
            } else if (chore.status === 'completed') {
              newStatus = 'pending';
            }
            onStatusChange(chore.id, newStatus);
          }} className={`mt-1 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center ${
            chore.status === 'completed' ? 'bg-green-500 border-green-500' :
            chore.status === 'in-progress' ? 'bg-amber-500 border-amber-500' :
            chore.status === 'blocked' ? 'bg-red-500 border-red-500' :
            chore.status === 'on-hold' ? 'bg-purple-500 border-purple-500' :
            'border-gray-300 dark:border-gray-600'
          }`}>
            {chore.status === 'completed' && <Check className="w-3 h-3 text-white" />}
            {chore.status === 'in-progress' && <Clock className="w-3 h-3 text-white" />}
            {chore.status === 'blocked' && <AlertCircle className="w-3 h-3 text-white" />}
            {chore.status === 'on-hold' && <Pause className="w-3 h-3 text-white" />}
          </button>
          <div className="flex-1">
            <h3 className={`font-semibold text-gray-900 dark:text-white ${chore.status === 'completed' ? 'line-through opacity-60' : ''}`}>{chore.title}</h3>
            {chore.description && <p className="text-sm text-gray-600 dark:text-gray-400">{chore.description}</p>}
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-600 dark:text-gray-400">
              <span className="capitalize">{chore.frequency}</span>
              {chore.due_date && <span>{format(new Date(chore.due_date), 'MMM d')}</span>}
            </div>
          </div>
        </div>
        <div className="relative">
          <button onClick={() => setShowMenu(!showMenu)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"><MoreVertical className="w-4 h-4" /></button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-gray-800 border rounded-lg shadow-lg z-20">
                <button onClick={() => { onEdit(chore); setShowMenu(false); }} className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg">Edit</button>
                <button onClick={() => { onDelete(chore.id); setShowMenu(false); }} className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-lg">Delete</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
