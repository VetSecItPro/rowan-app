import { useState, useEffect, useCallback, useRef } from 'react';
import {
  householdBalanceService,
  type HouseholdBalanceData,
  type BalanceTimeframe,
  type SpaceMemberInfo,
} from '@/lib/services/household-balance-service';
import { logger } from '@/lib/logger';

/**
 * Fetches space members and household balance data for the dashboard widget.
 * Self-contained — only needs spaceId and userId, fetches members internally.
 */
export function useHouseholdBalance(
  spaceId: string | undefined,
  userId: string | undefined
): {
  data: HouseholdBalanceData | null;
  loading: boolean;
  error: string | null;
  timeframe: BalanceTimeframe;
  setTimeframe: (tf: BalanceTimeframe) => void;
  refresh: () => void;
} {
  const [data, setData] = useState<HouseholdBalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<BalanceTimeframe>('week');
  const membersRef = useRef<SpaceMemberInfo[]>([]);

  const fetchData = useCallback(async () => {
    if (!spaceId || !userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Fetch members if we don't have them yet
      if (membersRef.current.length === 0) {
        const res = await fetch(`/api/spaces/members?space_id=${spaceId}`);
        if (!res.ok) throw new Error('Failed to load space members');
        const membersData = await res.json();

        membersRef.current = (membersData.data || membersData.members || []).map(
          (m: { id: string; name: string; avatar?: string; color_theme?: string; isCurrentUser?: boolean }) => ({
            id: m.id,
            name: m.name || 'Unknown',
            avatar: m.avatar,
            color: m.color_theme,
            isCurrentUser: m.isCurrentUser || m.id === userId,
          })
        );
      }

      if (membersRef.current.length === 0) {
        setLoading(false);
        return;
      }

      const result = await householdBalanceService.getBalance(spaceId, membersRef.current, timeframe);
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load household balance';
      logger.error('Failed to fetch household balance', err, {
        component: 'useHouseholdBalance',
        action: 'fetchData',
        spaceId,
        timeframe,
      });
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [spaceId, userId, timeframe]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, timeframe, setTimeframe, refresh: fetchData };
}
