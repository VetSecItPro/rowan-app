/**
 * HouseholdBalanceTeaser — Marketing section for the Household Balance feature
 *
 * Animated donut chart + member bars showing fairness visualization.
 * Pure marketing — uses static demo data, not real queries.
 */

'use client';

import { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Scale, ArrowRight, Users, TrendingUp } from 'lucide-react';
import Link from 'next/link';

// ─── Demo Data ───────────────────────────────────────────────────────────────

interface DemoMember {
  name: string;
  tasks: number;
  chores: number;
  total: number;
  percentage: number;
  color: string;
  ringColor: string;
}

const DEMO_MEMBERS: DemoMember[] = [
  { name: 'Sarah', tasks: 8, chores: 6, total: 14, percentage: 45, color: 'from-teal-400 to-cyan-400', ringColor: '#2dd4bf' },
  { name: 'Mike', tasks: 5, chores: 7, total: 12, percentage: 39, color: 'from-blue-400 to-indigo-400', ringColor: '#60a5fa' },
  { name: 'Emma', tasks: 2, chores: 3, total: 5, percentage: 16, color: 'from-purple-400 to-pink-400', ringColor: '#c084fc' },
];

const TOTAL_COMPLETIONS = 31;

// ─── SVG Donut Chart ─────────────────────────────────────────────────────────

function DonutChart({ reduced }: { reduced: boolean | null }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;

  const segments = useMemo(
    () =>
      DEMO_MEMBERS.reduce<{ segmentLength: number; offset: number }[]>(
        (acc, member) => {
          const segmentLength = (member.percentage / 100) * circumference;
          const offset = acc.length > 0 ? acc[acc.length - 1].offset + acc[acc.length - 1].segmentLength : 0;
          return [...acc, { segmentLength, offset }];
        },
        []
      ),
    [circumference]
  );

  return (
    <div className="relative w-40 h-40 sm:w-48 sm:h-48">
      <svg viewBox="0 0 128 128" className="w-full h-full -rotate-90">
        {/* Background ring */}
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke="rgba(55, 65, 81, 0.3)"
          strokeWidth="12"
        />
        {/* Member segments */}
        {DEMO_MEMBERS.map((member, i) => {
          const { segmentLength, offset } = segments[i];

          return (
            <motion.circle
              key={member.name}
              cx="64"
              cy="64"
              r={radius}
              fill="none"
              stroke={member.ringColor}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${segmentLength - 4} ${circumference - segmentLength + 4}`}
              strokeDashoffset={-offset}
              initial={{ pathLength: 0, opacity: 0 }}
              whileInView={{ pathLength: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{
                duration: reduced ? 0.01 : 0.8,
                delay: reduced ? 0 : 0.3 + i * 0.15,
                ease: 'easeOut',
              }}
            />
          );
        })}
      </svg>
      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-2xl sm:text-3xl font-bold text-white"
          initial={{ opacity: 0, scale: 0.5 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: reduced ? 0.01 : 0.5, delay: reduced ? 0 : 0.6 }}
        >
          {TOTAL_COMPLETIONS}
        </motion.span>
        <span className="text-[10px] sm:text-xs text-gray-400 font-medium">this week</span>
      </div>
    </div>
  );
}

// ─── Member Bar ──────────────────────────────────────────────────────────────

function MemberBar({
  member,
  index,
  reduced,
}: {
  member: DemoMember;
  index: number;
  reduced: boolean | null;
}) {
  return (
    <motion.div
      className="flex items-center gap-3"
      initial={{ opacity: 0, x: 20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{
        duration: reduced ? 0.01 : 0.5,
        delay: reduced ? 0 : 0.4 + index * 0.12,
      }}
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full bg-gradient-to-br ${member.color} flex items-center justify-center text-xs font-bold text-white shrink-0`}
      >
        {member.name[0]}
      </div>

      {/* Name + bar */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-white">{member.name}</span>
          <span className="text-xs text-gray-400 tabular-nums">
            {member.total} done
          </span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <motion.div
            className={`h-full bg-gradient-to-r ${member.color} rounded-full`}
            initial={{ width: 0 }}
            whileInView={{ width: `${member.percentage}%` }}
            viewport={{ once: true }}
            transition={{
              duration: reduced ? 0.01 : 0.8,
              delay: reduced ? 0 : 0.5 + index * 0.12,
              ease: 'easeOut',
            }}
          />
        </div>
      </div>

      {/* Percentage */}
      <span className="text-sm font-semibold text-gray-300 w-10 text-right tabular-nums">
        {member.percentage}%
      </span>
    </motion.div>
  );
}

// ─── Balance Pill ────────────────────────────────────────────────────────────

function BalancePill({ reduced }: { reduced: boolean | null }) {
  return (
    <motion.div
      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-500/10 border border-teal-500/20"
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: reduced ? 0.01 : 0.5, delay: reduced ? 0 : 0.9 }}
    >
      <div className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
      <span className="text-sm font-medium text-teal-300">Nicely Balanced</span>
    </motion.div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

/** Renders a teaser section showcasing the Household Balance feature on the landing page. */
export function HouseholdBalanceTeaser() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="relative py-20 sm:py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-5xl mx-auto relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — Visualization */}
          <motion.div
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: prefersReducedMotion ? 0.01 : 0.6 }}
            className="flex flex-col items-center lg:items-start"
          >
            <div className="rounded-2xl border border-gray-700/50 bg-gray-900/80 backdrop-blur-sm p-6 sm:p-8 shadow-xl w-full max-w-sm">
              {/* Card header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-teal-400" />
                  <span className="text-sm font-semibold text-white">Household Balance</span>
                </div>
                <span className="text-xs text-gray-400 bg-gray-800/80 px-2.5 py-1 rounded-full">This Week</span>
              </div>

              {/* Donut + Bars */}
              <div className="flex flex-col items-center gap-6">
                <DonutChart reduced={prefersReducedMotion} />

                <div className="w-full space-y-3">
                  {DEMO_MEMBERS.map((member, i) => (
                    <MemberBar
                      key={member.name}
                      member={member}
                      index={i}
                      reduced={prefersReducedMotion}
                    />
                  ))}
                </div>

                <BalancePill reduced={prefersReducedMotion} />
              </div>
            </div>
          </motion.div>

          {/* Right — Text */}
          <motion.div
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: prefersReducedMotion ? 0.01 : 0.6, delay: 0.15 }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-medium mb-6">
              <Users className="w-3 h-3" />
              Fair & Transparent
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-4">
              See Who Does{' '}
              <span className="bg-gradient-to-r from-teal-400 to-cyan-400 bg-clip-text text-transparent">
                What
              </span>
            </h2>

            <p className="text-gray-400 text-base sm:text-lg max-w-md mb-8">
              No more &quot;I always do everything.&quot; Household Balance tracks completed
              tasks and chores per member so everyone can see the real picture
              — encouraging, never accusatory.
            </p>

            {/* Benefit list */}
            <ul className="space-y-3 mb-8">
              {[
                'Visual breakdown of who completed what this week',
                'Balance score shows how evenly work is shared',
                'Toggle between weekly and monthly views',
                'Points earned from chore difficulty ratings',
              ].map((benefit) => (
                <li key={benefit} className="flex items-start gap-3">
                  <div className="mt-1 w-5 h-5 rounded-full bg-teal-500/10 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-3 h-3 text-teal-400" />
                  </div>
                  <span className="text-sm text-gray-300">{benefit}</span>
                </li>
              ))}
            </ul>

            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-semibold rounded-full transition-all shadow-lg shadow-teal-500/25 active:scale-95 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              Try Household Balance
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
