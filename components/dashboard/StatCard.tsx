'use client';

import React, { memo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  ChevronRight,
  Clock,
  AlertCircle,
  CheckSquare,
  type LucideIcon,
} from 'lucide-react';

// ─── Animation Variants ─────────────────────────────────────────────────────

const mobileCardAnimation = {
  hidden: {
    opacity: 0,
    y: 12,
  },
  visible: (index: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.25,
      delay: index * 0.04,
      ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
    },
  }),
};

// ─── Sub-Components ──────────────────────────────────────────────────────────

/** Renders a horizontal progress bar with percentage fill and label. */
export const ProgressBar = memo(function ProgressBar({
  value,
  max,
  color = 'blue',
  showLabel = true,
}: {
  value: number;
  max: number;
  color?: string;
  showLabel?: boolean;
}) {
  const percentage = max > 0 ? Math.round((value / max) * 100) : 0;
  // Use complete class strings to ensure Tailwind doesn't purge them
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
    teal: 'bg-teal-500',
    amber: 'bg-amber-500',
    indigo: 'bg-indigo-500',
  };

  return (
    <div className="w-full">
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div
          className={`${colorClasses[color] || 'bg-blue-500'} h-2 rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-xs text-gray-400 mt-1">{percentage}% complete</p>
      )}
    </div>
  );
});

/** Displays an up/down trend arrow with percentage change value. */
export const TrendIndicator = memo(function TrendIndicator({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  if (value === 0) return null;

  const isPositive = value > 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const colorClass = isPositive ? 'text-green-400' : 'text-red-400';

  return (
    <div className={`flex items-center gap-1 text-xs ${colorClass} font-medium`}>
      <Icon className="w-3 h-3" />
      <span>
        {Math.abs(value)} {label}
      </span>
    </div>
  );
});

// ─── Card Config Types ───────────────────────────────────────────────────────

export interface StatDetailRow {
  left: string;
  right?: string;
}

export interface StatAlert {
  text: string;
  /** Complete Tailwind text color class, e.g. "text-orange-400" */
  colorClass: string;
  icon: 'clock' | 'alert' | 'check';
}

export interface StatHighlight {
  label: string;
  title: string;
  subtitle?: string;
  /** Complete Tailwind bg class, e.g. "bg-purple-900/20" */
  bgClass: string;
  /** Complete Tailwind text class for label, e.g. "text-purple-300" */
  labelClass: string;
}

export interface StatCardConfig {
  href: string;
  title: string;
  /** Complete Tailwind class for the card link wrapper, including hover border + shadow */
  linkClass: string;
  /** Complete Tailwind text color class for the title, e.g. "text-blue-400" */
  titleClass: string;
  /** Complete Tailwind text color class for the footer, e.g. "text-blue-400" */
  footerClass: string;
  icon: LucideIcon;
  /** Complete gradient class, e.g. "from-blue-500 to-blue-600" */
  iconGradient: string;
  mainValue: number | string;
  mainLabel: string;
  trend: number;
  trendLabel: string;
  details?: StatDetailRow[];
  alerts?: StatAlert[];
  extraText?: string;
  progress?: { value: number; max: number; color: string; showLabel?: boolean };
  highlight?: StatHighlight;
  recentItems?: Array<{ id: string; title: string }>;
  /** Custom content rendered between standard sections and footer */
  customContent?: React.ReactNode;
}

// ─── Alert Icon Map ──────────────────────────────────────────────────────────

const alertIcons: Record<string, LucideIcon> = {
  clock: Clock,
  alert: AlertCircle,
  check: CheckSquare,
};

// ─── StatCard Component ──────────────────────────────────────────────────────

/** Renders a dashboard statistics card with value, trend, and optional progress bar. */
export const StatCard = memo(function StatCard({
  config,
  index,
}: {
  config: StatCardConfig;
  index: number;
}) {
  return (
    <motion.div
      variants={mobileCardAnimation}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2, margin: '-50px' }}
      custom={index}
      className="h-full"
    >
      <Link
        href={config.href}
        className={`group bg-gray-800/40 border-2 border-gray-700/20 rounded-xl xl:rounded-2xl p-4 sm:p-6 shadow-lg hover:-translate-y-1 sm:hover:-translate-y-2 transition-all duration-300 flex flex-col min-h-[340px] h-full ${config.linkClass}`}
      >
        {/* Header: Title + Trend + Icon */}
        <div className="flex items-start justify-between mb-3 sm:mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1 sm:mb-2">
              <h3 className={`text-base sm:text-lg font-bold ${config.titleClass}`}>
                {config.title}
              </h3>
              {config.trend !== 0 && (
                <TrendIndicator value={config.trend} label={config.trendLabel} />
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl sm:text-3xl font-bold text-white">
                {config.mainValue}
              </p>
              <p className="text-sm text-gray-400">{config.mainLabel}</p>
            </div>
          </div>
          <div
            className={`w-10 h-10 xl:w-12 xl:h-12 bg-gradient-to-br ${config.iconGradient} rounded-xl xl:rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform flex-shrink-0`}
          >
            <config.icon className="w-5 h-5 xl:w-6 xl:h-6 text-white" />
          </div>
        </div>

        {/* Detail rows */}
        {config.details && config.details.length > 0 && (
          <div className="space-y-2 mb-3">
            {config.details.map((row, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-400">{row.left}</span>
                {row.right && <span className="text-gray-400">{row.right}</span>}
              </div>
            ))}
          </div>
        )}

        {/* Alerts (due today, overdue, unread, etc.) */}
        {config.alerts && config.alerts.length > 0 && (
          <div className="space-y-1 mb-2">
            {config.alerts.map((alert, i) => {
              const Icon = alertIcons[alert.icon];
              return (
                <p
                  key={i}
                  className={`text-sm ${alert.colorClass} flex items-center gap-1 font-medium`}
                >
                  {Icon && <Icon className="w-3 h-3" />}
                  {alert.text}
                </p>
              );
            })}
          </div>
        )}

        {/* Extra descriptive text */}
        {config.extraText && (
          <p className="text-xs text-gray-400 mb-2">{config.extraText}</p>
        )}

        {/* Progress bar */}
        {config.progress && (
          <ProgressBar
            value={config.progress.value}
            max={config.progress.max}
            color={config.progress.color}
            showLabel={config.progress.showLabel}
          />
        )}

        {/* Highlight box (next event, next meal, etc.) */}
        {config.highlight && (
          <div className={`p-3 ${config.highlight.bgClass} rounded-lg mb-3`}>
            <p className={`text-xs ${config.highlight.labelClass} font-medium mb-1`}>
              {config.highlight.label}
            </p>
            <p className="text-sm text-white font-medium truncate">
              {config.highlight.title}
            </p>
            {config.highlight.subtitle && (
              <p className="text-xs text-gray-400">{config.highlight.subtitle}</p>
            )}
          </div>
        )}

        {/* Recent items list */}
        {config.recentItems && config.recentItems.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <p className="text-xs text-gray-400 mb-2 font-medium">Recent:</p>
            {config.recentItems.slice(0, 2).map((item) => (
              <p key={item.id} className="text-xs text-gray-300 truncate">
                • {item.title}
              </p>
            ))}
          </div>
        )}

        {/* Custom content (for complex cards like Projects & Budget, Goals) */}
        {config.customContent}

        {/* Footer "View all" link */}
        <div
          className={`mt-auto pt-3 flex items-center justify-end ${config.footerClass} text-sm font-medium group-hover:gap-2 transition-all`}
        >
          <span>View all</span>
          <ChevronRight className="w-4 h-4" />
        </div>
      </Link>
    </motion.div>
  );
});
