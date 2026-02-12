// Centralized hex color constants — Tailwind equivalents for contexts
// that require raw hex values (database, emails, PDFs, charts, OG images).
//
// Usage: import { COLORS } from '@/lib/constants/colors'
//        color: COLORS.emerald[500]

export const COLORS = {
  red: {
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
  },
  orange: {
    400: '#fb923c',
    500: '#f97316',
  },
  amber: {
    400: '#fbbf24',
    500: '#f59e0b',
  },
  yellow: {
    400: '#facc15',
    500: '#eab308',
  },
  lime: {
    500: '#84cc16',
  },
  green: {
    400: '#4ade80',
    500: '#22c55e',
  },
  emerald: {
    400: '#34d399',
    500: '#10b981',
  },
  cyan: {
    400: '#22d3ee',
    500: '#06b6d4',
  },
  sky: {
    500: '#0ea5e9',
  },
  blue: {
    400: '#60a5fa',
    500: '#3b82f6',
  },
  indigo: {
    400: '#818cf8',
    500: '#6366f1',
  },
  violet: {
    500: '#8b5cf6',
  },
  purple: {
    400: '#c084fc',
    500: '#a855f7',
  },
  pink: {
    400: '#f472b6',
    500: '#ec4899',
  },
  gray: {
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  slate: {
    500: '#64748b',
  },
  white: '#ffffff',
  black: '#000000',
} as const;

// Feature-specific color tokens for Rowan
export const FEATURE_COLORS = {
  tasks: COLORS.blue[500],
  calendar: COLORS.purple[500] ?? '#a855f7',
  reminders: COLORS.pink[500],
  messages: COLORS.green[500] ?? '#22c55e',
  shopping: COLORS.emerald[500],
  meals: COLORS.orange[500],
  household: COLORS.amber[500],
  goals: COLORS.indigo[500],
  location: COLORS.cyan[500],
} as const;
