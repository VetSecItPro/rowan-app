'use client';

import { Trophy, Target, TrendingUp, Flame, CheckCircle, Calendar } from 'lucide-react';

interface StatCardsProps {
  totalGoals: number;
  completionRate: number;
  currentStreak: number;
  avgTimeToComplete: number;
  totalMilestones: number;
  mostProductiveMonth: {
    month: string;
    year: number;
    completions: number;
  } | null;
}

export default function StatCards({
  totalGoals,
  completionRate,
  currentStreak,
  avgTimeToComplete,
  totalMilestones,
  mostProductiveMonth,
}: StatCardsProps) {
  const stats = [
    {
      label: 'Total Goals',
      value: totalGoals.toString(),
      icon: Target,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
    },
    {
      label: 'Completion Rate',
      value: `${Math.round(completionRate)}%`,
      icon: Trophy,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      label: 'Current Streak',
      value: `${currentStreak} days`,
      icon: Flame,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    },
    {
      label: 'Avg Time to Complete',
      value: `${avgTimeToComplete} days`,
      icon: TrendingUp,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      label: 'Total Milestones',
      value: totalMilestones.toString(),
      icon: CheckCircle,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    },
    {
      label: 'Most Productive',
      value: mostProductiveMonth
        ? `${mostProductiveMonth.month} ${mostProductiveMonth.year}`
        : 'N/A',
      subValue: mostProductiveMonth
        ? `${mostProductiveMonth.completions} completions`
        : undefined,
      icon: Calendar,
      color: 'text-pink-600 dark:text-pink-400',
      bgColor: 'bg-pink-50 dark:bg-pink-900/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.label}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {stat.label}
                </p>
                <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                  {stat.value}
                </p>
                {stat.subValue && (
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {stat.subValue}
                  </p>
                )}
              </div>
              <div className={`flex-shrink-0 ${stat.bgColor} rounded-full p-3`}>
                <Icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
