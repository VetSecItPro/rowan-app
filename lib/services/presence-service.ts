import { createClient } from '@/lib/supabase/server';
import type { SpaceMemberWithPresence } from '@/lib/types';
import { PresenceStatus } from '@/lib/types';
import { logger } from '@/lib/logger';

// =============================================
// SIMPLE PRESENCE SERVICE (CACHED, NOT REAL-TIME)
// =============================================

/**
 * Simple presence service for family/small team use (max 6 members)
 * Uses cached updates instead of real-time WebSockets for better battery life
 */

/**
 * Update user presence status
 * Call this on user activity (page loads, clicks, etc.)
 */
export async function updateUserPresence(
  spaceId: string,
  status: PresenceStatus = PresenceStatus.ONLINE
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Upsert presence record (insert or update)
    const { error: upsertError } = await supabase
      .from('user_presence')
      .upsert({
        user_id: user.id,
        space_id: spaceId,
        status: status,
        last_activity: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,space_id'
      });

    if (upsertError) {
      logger.error('[presence-service] updateUserPresence error:', upsertError, { component: 'lib-presence-service', action: 'service_call' });
      return { success: false, error: 'Failed to update presence' };
    }

    return { success: true };
  } catch (error) {
    logger.error('[presence-service] updateUserPresence error:', error, { component: 'lib-presence-service', action: 'service_call' });
    return { success: false, error: 'Failed to update presence' };
  }
}

/**
 * Get all space members with their presence status
 * This replaces the mock data in settings
 */
export async function getSpaceMembersWithPresence(
  spaceId: string
): Promise<{ success: true; data: SpaceMemberWithPresence[] } | { success: false; error: string }> {
  try {
    const supabase = await createClient();

    // Use the database view we created
    const { data, error } = await supabase
      .from('space_members_with_presence')
      .select('space_id, user_id, role, joined_at, name, email, avatar_url, presence_status, last_activity, presence_updated_at')
      .eq('space_id', spaceId);

    if (error) {
      logger.error('[presence-service] getSpaceMembersWithPresence error:', error, { component: 'lib-presence-service', action: 'service_call' });
      return { success: false, error: 'Failed to fetch space members' };
    }

    // Transform data to match our TypeScript interface
    const members: SpaceMemberWithPresence[] = (data || []).map((member: Record<string, unknown>) => ({
      space_id: member.space_id,
      user_id: member.user_id,
      role: member.role,
      joined_at: member.joined_at,
      name: member.name || 'Unknown User',
      email: member.email || '',
      avatar_url: member.avatar_url,
      presence_status: member.presence_status || 'offline',
      last_activity: member.last_activity,
      presence_updated_at: member.presence_updated_at,
    }));

    return { success: true, data: members };
  } catch (error) {
    logger.error('[presence-service] getSpaceMembersWithPresence error:', error, { component: 'lib-presence-service', action: 'service_call' });
    return { success: false, error: 'Failed to fetch space members' };
  }
}

/**
 * Mark user as offline (call on page unload, logout, etc.)
 */
export async function markUserOffline(spaceId: string): Promise<void> {
  try {
    await updateUserPresence(spaceId, PresenceStatus.OFFLINE);
  } catch (error) {
    logger.error('[presence-service] markUserOffline error:', error, { component: 'lib-presence-service', action: 'service_call' });
    // Don't throw - this is often called on page unload
  }
}

/**
 * Get presence summary for a space (for header display)
 */
export async function getSpacePresenceSummary(
  spaceId: string
): Promise<{ total: number; online: number; members: SpaceMemberWithPresence[] }> {
  try {
    const result = await getSpaceMembersWithPresence(spaceId);

    if (!result.success) {
      return { total: 0, online: 0, members: [] };
    }

    const members = result.data;
    const online = members.filter(m => m.presence_status === 'online').length;

    return {
      total: members.length,
      online: online,
      members: members,
    };
  } catch (error) {
    logger.error('[presence-service] getSpacePresenceSummary error:', error, { component: 'lib-presence-service', action: 'service_call' });
    return { total: 0, online: 0, members: [] };
  }
}

/**
 * Cleanup inactive users (call this periodically)
 * This runs the database function to mark inactive users offline
 */
export async function cleanupInactiveUsers(): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    // Call the database function
    const { error } = await supabase.rpc('mark_inactive_users_offline');

    if (error) {
      logger.error('[presence-service] cleanupInactiveUsers error:', error, { component: 'lib-presence-service', action: 'service_call' });
      return { success: false, error: 'Failed to cleanup inactive users' };
    }

    return { success: true };
  } catch (error) {
    logger.error('[presence-service] cleanupInactiveUsers error:', error, { component: 'lib-presence-service', action: 'service_call' });
    return { success: false, error: 'Failed to cleanup inactive users' };
  }
}

/**
 * Check if user is currently online in any space
 */
export async function isUserOnline(userId: string): Promise<boolean> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('user_presence')
      .select('status')
      .eq('user_id', userId)
      .eq('status', 'online')
      .limit(1);

    return !error && data && data.length > 0;
  } catch (error) {
    logger.error('[presence-service] isUserOnline error:', error, { component: 'lib-presence-service', action: 'service_call' });
    return false;
  }
}

// =============================================
// PRESENCE MANAGEMENT UTILITIES
// =============================================

/**
 * Initialize presence tracking for a user in a space.
 * Returns a cleanup function that MUST be called to avoid memory leaks.
 * Prefer using the usePresence() hook in React components instead.
 */
export async function initializePresence(spaceId: string): Promise<() => void> {
  try {
    await updateUserPresence(spaceId, PresenceStatus.ONLINE);

    const interval = setInterval(async () => {
      try {
        await updateUserPresence(spaceId, PresenceStatus.ONLINE);
      } catch (error) {
        logger.error('Presence update error:', error, { component: 'lib-presence-service', action: 'service_call' });
      }
    }, 2 * 60 * 1000);

    const handleBeforeUnload = () => {
      clearInterval(interval);
      markUserOffline(spaceId);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        markUserOffline(spaceId);
      } else {
        updateUserPresence(spaceId, PresenceStatus.ONLINE);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', handleBeforeUnload);
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    // Return cleanup function
    return () => {
      clearInterval(interval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      markUserOffline(spaceId);
    };
  } catch (error) {
    logger.error('[presence-service] initializePresence error:', error, { component: 'lib-presence-service', action: 'service_call' });
    return () => {}; // no-op cleanup
  }
}

/**
 * Simple presence hook data structure
 * Use this in React components
 */
export interface PresenceHookData {
  members: SpaceMemberWithPresence[];
  onlineCount: number;
  isLoading: boolean;
  error: string | null;
  refreshPresence: () => Promise<void>;
}