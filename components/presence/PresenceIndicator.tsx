import { cn } from '@/lib/utils';
import type { PresenceStatus } from '@/lib/types';

interface PresenceIndicatorProps {
  status: PresenceStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

/** Renders online/offline presence status dots for space members. */
export function PresenceIndicator({
  status,
  size = 'md',
  showLabel = false,
  className
}: PresenceIndicatorProps) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  const statusClasses = {
    online: 'bg-green-500 shadow-green-500/50',
    offline: 'bg-gray-600'
  };

  const labels = {
    online: 'Online',
    offline: 'Offline'
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative">
        <div
          className={cn(
            'rounded-full border-2 border-gray-800',
            sizeClasses[size],
            statusClasses[status],
            status === 'online' && 'shadow-sm animate-pulse'
          )}
        />
        {status === 'online' && (
          <div
            className={cn(
              'absolute inset-0 rounded-full bg-green-500 animate-ping opacity-20',
              sizeClasses[size]
            )}
          />
        )}
      </div>
      {showLabel && (
        <span className={cn(
          'text-sm font-medium',
          status === 'online' ? 'text-green-400' : 'text-gray-400'
        )}>
          {labels[status]}
        </span>
      )}
    </div>
  );
}