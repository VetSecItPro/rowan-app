'use client';

import React from 'react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Color palette — 10 dark-mode-friendly colors for deterministic assignment
// ---------------------------------------------------------------------------
const AVATAR_PALETTE = [
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#6366f1', // indigo
] as const;

/**
 * Deterministic hash of a name string to pick a palette color.
 * Uses a simple djb2-style hash so the same name always gets the same color.
 */
function colorFromName(name: string): string {
  let hash = 5381;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 33) ^ name.charCodeAt(i);
  }
  const index = Math.abs(hash) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[index];
}

// ---------------------------------------------------------------------------
// Size config
// ---------------------------------------------------------------------------
const SIZE_MAP = {
  sm: { container: 'w-6 h-6', text: 'text-[10px]', px: 24 },
  md: { container: 'w-8 h-8', text: 'text-xs', px: 32 },
  lg: { container: 'w-10 h-10', text: 'text-sm', px: 40 },
} as const;

// ---------------------------------------------------------------------------
// MemberAvatar
// ---------------------------------------------------------------------------
export interface MemberAvatarProps {
  /** Full name -- first letter used as initial */
  name: string;
  /** Avatar diameter variant */
  size?: 'sm' | 'md' | 'lg';
  /** Override background color (hex). Defaults to deterministic color from name. */
  color?: string;
  className?: string;
  /** Show name on hover (default true) */
  showTooltip?: boolean;
}

/** Renders a space member avatar with initials fallback and online indicator. */
export function MemberAvatar({
  name,
  size = 'md',
  color,
  className,
  showTooltip = true,
}: MemberAvatarProps) {
  const bgColor = color ?? colorFromName(name);
  const initial = name.charAt(0).toUpperCase();
  const sizeConfig = SIZE_MAP[size];

  return (
    <div className={cn('relative group inline-flex', className)}>
      <div
        className={cn(
          'rounded-full border border-gray-700 flex items-center justify-center font-semibold text-white select-none',
          sizeConfig.container,
          sizeConfig.text
        )}
        style={{ backgroundColor: bgColor }}
        aria-label={name}
      >
        {initial}
      </div>

      {/* CSS tooltip — no JS library required */}
      {showTooltip && (
        <span
          role="tooltip"
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 whitespace-nowrap rounded-md bg-gray-700 px-2 py-1 text-[11px] font-medium text-gray-100 opacity-0 scale-95 transition-all duration-150 group-hover:opacity-100 group-hover:scale-100 z-50"
        >
          {name}
          {/* Tooltip arrow */}
          <span className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-700" />
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MemberAvatarGroup
// ---------------------------------------------------------------------------
export interface MemberAvatarGroupProps {
  members: Array<{ name: string; color?: string }>;
  /** Max avatars to show before "+N" overflow (default 3) */
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const OVERLAP_MAP = {
  sm: '-ml-1.5',
  md: '-ml-2',
  lg: '-ml-2.5',
} as const;

/** Renders a stacked group of member avatars with overflow count. */
export function MemberAvatarGroup({
  members,
  max = 3,
  size = 'md',
  className,
}: MemberAvatarGroupProps) {
  const visible = members.slice(0, max);
  const overflowCount = members.length - max;
  const sizeConfig = SIZE_MAP[size];
  const overlap = OVERLAP_MAP[size];

  return (
    <div className={cn('flex items-center', className)}>
      {visible.map((member, index) => (
        <div
          key={member.name}
          className={cn(index > 0 && overlap)}
          style={{ zIndex: visible.length - index }}
        >
          <MemberAvatar
            name={member.name}
            size={size}
            color={member.color}
            showTooltip
          />
        </div>
      ))}

      {overflowCount > 0 && (
        <div
          className={cn(
            'relative group inline-flex',
            overlap
          )}
          style={{ zIndex: 0 }}
        >
          <div
            className={cn(
              'rounded-full border border-gray-700 bg-gray-700 flex items-center justify-center font-semibold text-gray-300 select-none',
              sizeConfig.container,
              sizeConfig.text
            )}
            aria-label={`${overflowCount} more members`}
          >
            +{overflowCount}
          </div>

          {/* Tooltip listing remaining names */}
          <span
            role="tooltip"
            className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 whitespace-nowrap rounded-md bg-gray-700 px-2 py-1 text-[11px] font-medium text-gray-100 opacity-0 scale-95 transition-all duration-150 group-hover:opacity-100 group-hover:scale-100 z-50"
          >
            {members
              .slice(max)
              .map((m) => m.name)
              .join(', ')}
            <span className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-700" />
          </span>
        </div>
      )}
    </div>
  );
}
