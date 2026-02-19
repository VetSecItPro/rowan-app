'use client';

import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Scale, Users, Sparkles, TrendingUp, AlertTriangle } from 'lucide-react';
import { useHouseholdBalance } from '@/lib/hooks/useHouseholdBalance';
import type { MemberContribution, BalanceTimeframe, HouseholdBalanceData } from '@/lib/services/household-balance-service';

// ─── Constants ────────────────────────────────────────────────────────────────

const MEMBER_COLORS = [
  '#14b8a6', // teal
  '#8b5cf6', // violet
  '#f59e0b', // amber
  '#ec4899', // pink
  '#3b82f6', // blue
  '#10b981', // emerald
];

const RING_SIZE = 120;
const RING_STROKE = 14;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

// ─── Animation Variants ──────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0, 0, 0.2, 1] as const } },
};

// ─── Helper: Get member color ────────────────────────────────────────────────

function getMemberColor(member: MemberContribution, index: number): string {
  return member.memberColor || MEMBER_COLORS[index % MEMBER_COLORS.length];
}

// ─── Timeframe Toggle ────────────────────────────────────────────────────────

const TimeframeToggle = memo(function TimeframeToggle({
  timeframe,
  onChange,
}: {
  timeframe: BalanceTimeframe;
  onChange: (tf: BalanceTimeframe) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 p-0.5 bg-gray-800/60 rounded-full border border-gray-700/50">
      <button
        onClick={() => onChange('week')}
        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
          timeframe === 'week'
            ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-sm'
            : 'text-gray-400 hover:text-white'
        }`}
      >
        Week
      </button>
      <button
        onClick={() => onChange('month')}
        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
          timeframe === 'month'
            ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-sm'
            : 'text-gray-400 hover:text-white'
        }`}
      >
        Month
      </button>
    </div>
  );
});

// ─── Contribution Ring (SVG Donut Chart) ─────────────────────────────────────

const ContributionRing = memo(function ContributionRing({
  members,
  totalCompletions,
}: {
  members: MemberContribution[];
  totalCompletions: number;
}) {
  // Build arc segments with pre-computed cumulative offsets
  const segments = useMemo(() => {
    const filtered = members.filter(m => m.percentage > 0);
    const dashLengths = filtered.map(m => (m.percentage / 100) * RING_CIRCUMFERENCE);
    return filtered.map((member, index) => {
      const dashLength = dashLengths[index];
      const gapLength = RING_CIRCUMFERENCE - dashLength;
      const offset = dashLengths.slice(0, index).reduce((sum, len) => sum + len, 0);
      return {
        member,
        color: getMemberColor(member, index),
        dashArray: `${dashLength} ${gapLength}`,
        dashOffset: -offset,
      };
    });
  }, [members]);

  return (
    <div className="relative flex-shrink-0" style={{ width: RING_SIZE, height: RING_SIZE }}>
      <svg
        width={RING_SIZE}
        height={RING_SIZE}
        viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        className="transform -rotate-90"
      >
        {/* Background ring */}
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          stroke="rgba(55, 65, 81, 0.5)"
          strokeWidth={RING_STROKE}
        />
        {/* Member segments */}
        {segments.map((seg, i) => (
          <motion.circle
            key={seg.member.memberId}
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            fill="none"
            stroke={seg.color}
            strokeWidth={RING_STROKE}
            strokeDasharray={seg.dashArray}
            strokeDashoffset={seg.dashOffset}
            strokeLinecap="round"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
          />
        ))}
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-2xl font-bold text-white"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.3 }}
        >
          {totalCompletions}
        </motion.span>
        <span className="text-[10px] text-gray-400 -mt-0.5">done</span>
      </div>
    </div>
  );
});

// ─── Member Contribution Bar ─────────────────────────────────────────────────

const MemberBar = memo(function MemberBar({
  member,
  index,
  maxPercentage,
}: {
  member: MemberContribution;
  index: number;
  maxPercentage: number;
}) {
  const color = getMemberColor(member, index);
  // Scale bars relative to the highest contributor for visual clarity
  const barWidth = maxPercentage > 0
    ? (member.percentage / maxPercentage) * 100
    : 0;

  return (
    <motion.div
      variants={itemVariants}
      className="flex items-center gap-3"
    >
      {/* Avatar initial */}
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white"
        style={{ backgroundColor: `${color}30`, border: `1.5px solid ${color}60` }}
      >
        {member.memberName.charAt(0).toUpperCase()}
      </div>

      {/* Name + bar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-gray-200 truncate font-medium">
            {member.memberName}
            {member.isCurrentUser && (
              <span className="text-[10px] text-gray-500 ml-1">(you)</span>
            )}
          </span>
          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
            <span className="text-xs font-semibold text-white">{member.totalCompleted}</span>
            <span className="text-[10px] text-gray-500">{member.percentage}%</span>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-2 bg-gray-700/50 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: color }}
            initial={{ width: 0 }}
            animate={{ width: `${barWidth}%` }}
            transition={{ duration: 0.6, delay: index * 0.1, ease: 'easeOut' }}
          />
        </div>
      </div>
    </motion.div>
  );
});

// ─── Balance Status Pill ─────────────────────────────────────────────────────

const BalancePill = memo(function BalancePill({
  status,
  score,
}: {
  status: HouseholdBalanceData['balanceStatus'];
  score: number;
}) {
  const config = {
    balanced: {
      gradient: 'from-teal-500/20 to-emerald-500/20',
      border: 'border-teal-500/30',
      text: 'text-teal-300',
      icon: Sparkles,
      label: 'Nicely Balanced',
    },
    'slightly-uneven': {
      gradient: 'from-amber-500/20 to-yellow-500/20',
      border: 'border-amber-500/30',
      text: 'text-amber-300',
      icon: TrendingUp,
      label: 'Slightly Uneven',
    },
    uneven: {
      gradient: 'from-orange-500/15 to-amber-500/15',
      border: 'border-orange-500/25',
      text: 'text-orange-300',
      icon: AlertTriangle,
      label: 'Getting Uneven',
    },
  };

  const c = config[status];
  const Icon = c.icon;

  return (
    <motion.div
      variants={itemVariants}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r ${c.gradient} border ${c.border}`}
    >
      <Icon className={`w-3 h-3 ${c.text}`} />
      <span className={`text-xs font-medium ${c.text}`}>{c.label}</span>
      <span className="text-[10px] text-gray-500 ml-0.5">{score}%</span>
    </motion.div>
  );
});

// ─── Loading Skeleton ────────────────────────────────────────────────────────

function BalanceSkeleton() {
  return (
    <div className="flex flex-col items-center gap-4 py-6 animate-pulse">
      <div className="w-[120px] h-[120px] rounded-full bg-gray-700/50" />
      <div className="w-full space-y-3">
        <div className="h-8 bg-gray-700/30 rounded-lg" />
        <div className="h-8 bg-gray-700/30 rounded-lg" />
      </div>
      <div className="h-6 w-32 bg-gray-700/30 rounded-full" />
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function BalanceEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="w-14 h-14 rounded-full bg-teal-900/20 flex items-center justify-center mb-3">
        <Users className="w-7 h-7 text-teal-500/50" />
      </div>
      <p className="text-sm text-gray-400 max-w-[200px]">
        Complete some tasks together to see your household balance!
      </p>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

interface HouseholdBalanceProps {
  spaceId: string;
  userId: string;
}

export const HouseholdBalance = memo(function HouseholdBalance({
  spaceId,
  userId,
}: HouseholdBalanceProps) {
  const { data, loading, timeframe, setTimeframe } = useHouseholdBalance(spaceId, userId);

  if (loading) return <BalanceSkeleton />;

  const hasData = data && data.totalCompletions > 0;
  const maxPercentage = hasData
    ? Math.max(...data.members.map(m => m.percentage))
    : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Timeframe toggle */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-teal-400" />
          <h3 className="text-sm font-semibold text-white">Household Balance</h3>
        </div>
        <TimeframeToggle timeframe={timeframe} onChange={setTimeframe} />
      </div>

      {/* Content */}
      {hasData ? (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex-1 flex flex-col"
        >
          {/* Ring + Bars layout */}
          <div className="flex items-start gap-4 mb-4">
            <ContributionRing
              members={data.members}
              totalCompletions={data.totalCompletions}
            />
            <div className="flex-1 min-w-0 space-y-2.5">
              {data.members.map((member, i) => (
                <MemberBar
                  key={member.memberId}
                  member={member}
                  index={i}
                  maxPercentage={maxPercentage}
                />
              ))}
            </div>
          </div>

          {/* Balance pill + summary */}
          <div className="mt-auto pt-3 border-t border-gray-700/30 flex items-center justify-between">
            <BalancePill status={data.balanceStatus} score={data.balanceScore} />
            <span className="text-[10px] text-gray-500">
              {timeframe === 'week' ? 'This week' : 'This month'}
            </span>
          </div>
        </motion.div>
      ) : (
        <BalanceEmptyState />
      )}
    </div>
  );
});

export default HouseholdBalance;
