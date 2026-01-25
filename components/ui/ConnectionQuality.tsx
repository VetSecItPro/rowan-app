/**
 * Connection Quality Badge
 *
 * Visual indicator for current network connection quality.
 * Shows wifi/4G/3G/2G/offline icons with appropriate colors.
 */

'use client';

import { Wifi, WifiOff, Signal, SignalLow, SignalMedium, SignalHigh } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import type { ConnectionQuality } from '@/lib/native/network';
import { cn } from '@/lib/utils';

interface ConnectionQualityBadgeProps {
  /** Show text label alongside icon */
  showLabel?: boolean;
  /** Size of the icon */
  size?: 'sm' | 'md' | 'lg';
  /** Additional className */
  className?: string;
}

const QUALITY_CONFIG: Record<ConnectionQuality, {
  icon: React.ElementType;
  label: string;
  color: string;
  bgColor: string;
}> = {
  excellent: {
    icon: Wifi,
    label: 'Excellent',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-400/10',
  },
  good: {
    icon: SignalHigh,
    label: 'Good',
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10',
  },
  poor: {
    icon: SignalLow,
    label: 'Poor',
    color: 'text-amber-400',
    bgColor: 'bg-amber-400/10',
  },
  offline: {
    icon: WifiOff,
    label: 'Offline',
    color: 'text-red-400',
    bgColor: 'bg-red-400/10',
  },
};

const SIZE_CONFIG = {
  sm: {
    icon: 14,
    text: 'text-xs',
    padding: 'px-1.5 py-0.5',
    gap: 'gap-1',
  },
  md: {
    icon: 16,
    text: 'text-sm',
    padding: 'px-2 py-1',
    gap: 'gap-1.5',
  },
  lg: {
    icon: 20,
    text: 'text-base',
    padding: 'px-3 py-1.5',
    gap: 'gap-2',
  },
};

export function ConnectionQualityBadge({
  showLabel = false,
  size = 'sm',
  className,
}: ConnectionQualityBadgeProps) {
  const { quality, connectionType } = useNetworkStatus();

  const config = QUALITY_CONFIG[quality];
  const sizeConfig = SIZE_CONFIG[size];
  const Icon = config.icon;

  // Don't show when connection is excellent (least intrusive)
  if (quality === 'excellent' && !showLabel) {
    return null;
  }

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full',
        sizeConfig.padding,
        sizeConfig.gap,
        config.bgColor,
        className
      )}
      title={`${config.label} connection (${connectionType})`}
    >
      <Icon size={sizeConfig.icon} className={config.color} />
      {showLabel && (
        <span className={cn(sizeConfig.text, config.color, 'font-medium')}>
          {config.label}
        </span>
      )}
    </div>
  );
}

/**
 * Simple connection indicator dot
 */
export function ConnectionDot({ className }: { className?: string }) {
  const { quality } = useNetworkStatus();

  const colors: Record<ConnectionQuality, string> = {
    excellent: 'bg-emerald-400',
    good: 'bg-blue-400',
    poor: 'bg-amber-400',
    offline: 'bg-red-400',
  };

  return (
    <span
      className={cn(
        'inline-block w-2 h-2 rounded-full',
        colors[quality],
        quality === 'offline' && 'animate-pulse',
        className
      )}
      title={`Connection: ${quality}`}
    />
  );
}

/**
 * Network signal bars (cellular-style indicator)
 */
export function SignalBars({
  size = 'md',
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const { quality } = useNetworkStatus();

  const iconSize = SIZE_CONFIG[size].icon;

  const icons: Record<ConnectionQuality, React.ElementType> = {
    excellent: SignalHigh,
    good: SignalMedium,
    poor: SignalLow,
    offline: Signal,
  };

  const colors: Record<ConnectionQuality, string> = {
    excellent: 'text-emerald-400',
    good: 'text-blue-400',
    poor: 'text-amber-400',
    offline: 'text-zinc-500',
  };

  const Icon = icons[quality];

  return (
    <Icon
      size={iconSize}
      className={cn(colors[quality], className)}
      aria-label={`Signal strength: ${quality}`}
    />
  );
}

export type { ConnectionQuality };
