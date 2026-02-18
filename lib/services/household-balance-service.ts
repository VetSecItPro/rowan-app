import { createClient } from '@/lib/supabase/client';
import { startOfWeek, startOfMonth, endOfDay } from 'date-fns';
import { logger } from '@/lib/logger';

// ─── Types ────────────────────────────────────────────────────────────────────

export type BalanceTimeframe = 'week' | 'month';

export interface SpaceMemberInfo {
  id: string;
  name: string;
  avatar?: string;
  color?: string;
  isCurrentUser: boolean;
}

export interface MemberContribution {
  memberId: string;
  memberName: string;
  memberAvatar?: string;
  memberColor?: string;
  isCurrentUser: boolean;
  tasksCompleted: number;
  choresCompleted: number;
  totalCompleted: number;
  pointsEarned: number;
  percentage: number;
}

export interface HouseholdBalanceData {
  members: MemberContribution[];
  totalCompletions: number;
  balanceScore: number;
  balanceStatus: 'balanced' | 'slightly-uneven' | 'uneven';
  timeframe: BalanceTimeframe;
  periodStart: string;
  periodEnd: string;
}

// ─── Balance Score Calculation ────────────────────────────────────────────────

function computeBalanceScore(shares: number[], memberCount: number): number {
  if (memberCount <= 1) return 100;

  const idealShare = 100 / memberCount;
  const squaredDiffs = shares.map(s => (s - idealShare) ** 2);
  const meanSquaredDiff = squaredDiffs.reduce((sum, d) => sum + d, 0) / memberCount;
  const stdDev = Math.sqrt(meanSquaredDiff);

  // Normalize: a stdDev equal to idealShare means fully unbalanced
  const score = Math.max(0, Math.round(100 - (stdDev / idealShare) * 100));
  return score;
}

function getBalanceStatus(score: number): HouseholdBalanceData['balanceStatus'] {
  if (score >= 75) return 'balanced';
  if (score >= 45) return 'slightly-uneven';
  return 'uneven';
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const householdBalanceService = {
  /**
   * Fetches completed tasks and chores within a timeframe and computes
   * per-member contribution stats with a fairness balance score.
   */
  async getBalance(
    spaceId: string,
    members: SpaceMemberInfo[],
    timeframe: BalanceTimeframe
  ): Promise<HouseholdBalanceData> {
    const supabase = createClient();

    const now = new Date();
    const periodStart = timeframe === 'week'
      ? startOfWeek(now, { weekStartsOn: 1 })
      : startOfMonth(now);
    const periodEnd = endOfDay(now);

    const periodStartISO = periodStart.toISOString();
    const periodEndISO = periodEnd.toISOString();

    try {
      // Fetch completed tasks and chores in parallel
      const [tasksResult, choresResult] = await Promise.all([
        supabase
          .from('tasks')
          .select('id, assigned_to, completed_at')
          .eq('space_id', spaceId)
          .eq('status', 'completed')
          .gte('completed_at', periodStartISO)
          .lte('completed_at', periodEndISO),
        supabase
          .from('chores')
          .select('id, assigned_to, completed_at, point_value')
          .eq('space_id', spaceId)
          .eq('status', 'completed')
          .gte('completed_at', periodStartISO)
          .lte('completed_at', periodEndISO),
      ]);

      if (tasksResult.error) throw tasksResult.error;
      if (choresResult.error) throw choresResult.error;

      const tasks = tasksResult.data || [];
      const chores = choresResult.data || [];

      // Build per-member counts
      const memberMap = new Map<string, { tasks: number; chores: number; points: number }>();
      for (const m of members) {
        memberMap.set(m.id, { tasks: 0, chores: 0, points: 0 });
      }

      for (const task of tasks) {
        if (task.assigned_to && memberMap.has(task.assigned_to)) {
          memberMap.get(task.assigned_to)!.tasks++;
        }
      }

      for (const chore of chores) {
        if (chore.assigned_to && memberMap.has(chore.assigned_to)) {
          const entry = memberMap.get(chore.assigned_to)!;
          entry.chores++;
          entry.points += chore.point_value ?? 10;
        }
      }

      const totalCompletions = tasks.length + chores.length;

      // Build member contributions
      const contributions: MemberContribution[] = members.map(m => {
        const stats = memberMap.get(m.id) || { tasks: 0, chores: 0, points: 0 };
        const total = stats.tasks + stats.chores;
        return {
          memberId: m.id,
          memberName: m.name,
          memberAvatar: m.avatar,
          memberColor: m.color,
          isCurrentUser: m.isCurrentUser,
          tasksCompleted: stats.tasks,
          choresCompleted: stats.chores,
          totalCompleted: total,
          pointsEarned: stats.points,
          percentage: totalCompletions > 0
            ? Math.round((total / totalCompletions) * 100)
            : 0,
        };
      });

      // Sort by totalCompleted descending (top contributors first)
      contributions.sort((a, b) => b.totalCompleted - a.totalCompleted);

      // Compute balance score
      const shares = contributions.map(c => c.percentage);
      const balanceScore = totalCompletions === 0
        ? 100
        : computeBalanceScore(shares, members.length);

      return {
        members: contributions,
        totalCompletions,
        balanceScore,
        balanceStatus: totalCompletions === 0 ? 'balanced' : getBalanceStatus(balanceScore),
        timeframe,
        periodStart: periodStartISO,
        periodEnd: periodEndISO,
      };
    } catch (err) {
      logger.error('Failed to compute household balance', err, {
        component: 'householdBalanceService',
        action: 'getBalance',
        spaceId,
        timeframe,
      });
      throw err;
    }
  },
};
