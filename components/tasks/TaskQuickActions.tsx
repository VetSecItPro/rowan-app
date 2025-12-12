'use client';

import { CheckCircle, Clock, UserPlus, Repeat, MessageSquare, Paperclip } from 'lucide-react';
import { quickActionsService } from '@/lib/services/quick-actions-service';

interface TaskQuickActionsProps {
  taskId: string;
  spaceId: string;
  userId: string;
  onAction: (action: string) => void;
}

export function TaskQuickActions({ taskId, spaceId, userId, onAction }: TaskQuickActionsProps) {
  const actions = [
    { id: 'complete', label: 'Complete', icon: CheckCircle, color: 'text-green-600' },
    { id: 'snooze', label: 'Snooze', icon: Clock, color: 'text-amber-600' },
    { id: 'assign', label: 'Assign', icon: UserPlus, color: 'text-blue-600' },
    { id: 'repeat', label: 'Repeat', icon: Repeat, color: 'text-purple-600' },
    { id: 'comment', label: 'Comment', icon: MessageSquare, color: 'text-gray-600' },
    { id: 'attach', label: 'Attach', icon: Paperclip, color: 'text-pink-600' },
  ];

  async function handleAction(actionId: string) {
    try {
      await quickActionsService.trackAction(spaceId, userId, actionId, taskId);
      onAction(actionId);
    } catch (error) {
      console.error('Error tracking action:', error);
    }
  }

  return (
    <div className="flex items-center gap-3 sm:gap-2 flex-wrap">
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={() => handleAction(action.id)}
          className="btn-touch flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors active:scale-95"
        >
          <action.icon className={`w-3.5 h-3.5 ${action.color}`} />
          {action.label}
        </button>
      ))}
    </div>
  );
}
