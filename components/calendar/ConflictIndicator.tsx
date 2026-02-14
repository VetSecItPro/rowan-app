'use client';

import { AlertTriangle, Clock, Calendar } from 'lucide-react';
import { EventConflict } from '@/lib/services/conflict-detection-service';

interface ConflictIndicatorProps {
  conflicts: EventConflict[];
  compact?: boolean;
}

/** Displays a visual indicator when calendar events have scheduling conflicts. */
export function ConflictIndicator({ conflicts, compact = false }: ConflictIndicatorProps) {
  if (conflicts.length === 0) return null;

  // Get highest severity
  const highestSeverity = conflicts.some(c => c.severity === 'high')
    ? 'high'
    : conflicts.some(c => c.severity === 'medium')
    ? 'medium'
    : 'low';

  const getIcon = () => {
    switch (highestSeverity) {
      case 'high':
        return <AlertTriangle className={compact ? "w-3 h-3" : "w-4 h-4"} />;
      case 'medium':
        return <Clock className={compact ? "w-3 h-3" : "w-4 h-4"} />;
      case 'low':
        return <Calendar className={compact ? "w-3 h-3" : "w-4 h-4"} />;
    }
  };

  const getColorClasses = () => {
    switch (highestSeverity) {
      case 'high':
        return 'bg-red-500 text-white';
      case 'medium':
        return 'bg-orange-500 text-white';
      case 'low':
        return 'bg-yellow-500 text-white';
    }
  };

  const getTooltip = () => {
    return conflicts.map(c => c.message).join('\n');
  };

  if (compact) {
    return (
      <div
        className={`flex items-center justify-center rounded-full p-1 ${getColorClasses()}`}
        title={getTooltip()}
      >
        {getIcon()}
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${getColorClasses()}`}
      title={getTooltip()}
    >
      {getIcon()}
      <span className="text-xs font-medium">
        {conflicts.length} conflict{conflicts.length > 1 ? 's' : ''}
      </span>
    </div>
  );
}
