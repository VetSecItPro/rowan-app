// Phase 14: Chore Rewards - Rewards Catalog Service
// Handles reward catalog management and redemptions

import { createClient } from '@/lib/supabase/client';
import type {
  RewardCatalogItem,
  RewardRedemption,
  CreateRewardInput,
  UpdateRewardInput,
  CreateRedemptionInput,
  RedemptionStatus,
  DEFAULT_REWARDS,
} from '@/lib/types/rewards';
import { DEFAULT_REWARDS as DEFAULTS } from '@/lib/types/rewards';
import { pointsService } from './points-service';

/**
 * Rewards Service
 * Manages the rewards catalog and redemption workflow
 */
export const rewardsService = {
  // =============================================================================
  // REWARDS CATALOG
  // =============================================================================

  /**
   * Get all rewards for a space
   */
  async getRewards(spaceId: string, activeOnly: boolean = true): Promise<RewardCatalogItem[]> {
    const supabase = createClient();

    let query = supabase
      .from('rewards_catalog')
      .select('*')
      .eq('space_id', spaceId)
      .order('cost_points', { ascending: true });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch rewards: ${error.message}`);
    }

    return data || [];
  },

  /**
   * Get a single reward by ID
   */
  async getReward(rewardId: string): Promise<RewardCatalogItem | null> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('rewards_catalog')
      .select('*')
      .eq('id', rewardId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Failed to fetch reward: ${error.message}`);
    }

    return data;
  },

  /**
   * Create a new reward
   */
  async createReward(input: CreateRewardInput): Promise<RewardCatalogItem> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('rewards_catalog')
      .insert({
        space_id: input.space_id,
        name: input.name,
        description: input.description || null,
        cost_points: input.cost_points,
        category: input.category,
        image_url: input.image_url || null,
        emoji: input.emoji || '🎁',
        max_redemptions_per_week: input.max_redemptions_per_week || null,
        created_by: input.created_by,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create reward: ${error.message}`);
    }

    return data;
  },

  /**
   * Update a reward
   */
  async updateReward(rewardId: string, input: UpdateRewardInput): Promise<RewardCatalogItem> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('rewards_catalog')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', rewardId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update reward: ${error.message}`);
    }

    return data;
  },

  /**
   * Delete a reward (soft delete by deactivating)
   */
  async deleteReward(rewardId: string): Promise<void> {
    const supabase = createClient();

    const { error } = await supabase
      .from('rewards_catalog')
      .update({ is_active: false })
      .eq('id', rewardId);

    if (error) {
      throw new Error(`Failed to delete reward: ${error.message}`);
    }
  },

  /**
   * Initialize default rewards for a space
   */
  async initializeDefaultRewards(spaceId: string, createdBy: string): Promise<RewardCatalogItem[]> {
    const supabase = createClient();

    // Check if space already has rewards
    const { count } = await supabase
      .from('rewards_catalog')
      .select('id', { count: 'exact', head: true })
      .eq('space_id', spaceId);

    if (count && count > 0) {
      // Space already has rewards, skip initialization
      return this.getRewards(spaceId);
    }

    // Create default rewards
    const rewardsToCreate = DEFAULTS.map((reward) => ({
      space_id: spaceId,
      name: reward.name,
      description: reward.description || null,
      cost_points: reward.cost_points,
      category: reward.category,
      emoji: reward.emoji || '🎁',
      max_redemptions_per_week: reward.max_redemptions_per_week || null,
      created_by: createdBy,
    }));

    const { data, error } = await supabase
      .from('rewards_catalog')
      .insert(rewardsToCreate)
      .select();

    if (error) {
      throw new Error(`Failed to initialize rewards: ${error.message}`);
    }

    return data || [];
  },

  // =============================================================================
  // REDEMPTIONS
  // =============================================================================

  /**
   * Get redemptions for a space
   */
  async getRedemptions(
    spaceId: string,
    options: {
      userId?: string;
      status?: RedemptionStatus;
      limit?: number;
    } = {}
  ): Promise<RewardRedemption[]> {
    const supabase = createClient();

    let query = supabase
      .from('reward_redemptions')
      .select(`
        *,
        reward:rewards_catalog(*),
        user:users!reward_redemptions_user_id_fkey(id, display_name, avatar_url)
      `)
      .eq('space_id', spaceId)
      .order('created_at', { ascending: false });

    if (options.userId) {
      query = query.eq('user_id', options.userId);
    }

    if (options.status) {
      query = query.eq('status', options.status);
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch redemptions: ${error.message}`);
    }

    return (data || []) as RewardRedemption[];
  },

  /**
   * Get pending redemptions count for a space
   */
  async getPendingRedemptionsCount(spaceId: string): Promise<number> {
    const supabase = createClient();

    const { count, error } = await supabase
      .from('reward_redemptions')
      .select('id', { count: 'exact', head: true })
      .eq('space_id', spaceId)
      .eq('status', 'pending');

    if (error) {
      throw new Error(`Failed to count redemptions: ${error.message}`);
    }

    return count || 0;
  },

  /**
   * Redeem a reward
   */
  async redeemReward(
    userId: string,
    spaceId: string,
    rewardId: string
  ): Promise<RewardRedemption> {
    const supabase = createClient();

    // Get the reward
    const reward = await this.getReward(rewardId);
    if (!reward) {
      throw new Error('Reward not found');
    }

    if (!reward.is_active) {
      throw new Error('This reward is no longer available');
    }

    // Check user has enough points
    const balance = await pointsService.getPointsBalance(userId, spaceId);
    if (balance < reward.cost_points) {
      throw new Error(`Not enough points. You need ${reward.cost_points} but have ${balance}`);
    }

    // Check weekly redemption limit
    if (reward.max_redemptions_per_week) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from('reward_redemptions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('reward_id', rewardId)
        .gte('created_at', weekStart.toISOString())
        .neq('status', 'cancelled')
        .neq('status', 'denied');

      if (count && count >= reward.max_redemptions_per_week) {
        throw new Error(
          `You've already redeemed this ${reward.max_redemptions_per_week} time(s) this week`
        );
      }
    }

    // Create redemption record
    const { data: redemption, error: redemptionError } = await supabase
      .from('reward_redemptions')
      .insert({
        user_id: userId,
        space_id: spaceId,
        reward_id: rewardId,
        points_spent: reward.cost_points,
        status: 'pending',
      })
      .select(`
        *,
        reward:rewards_catalog(*)
      `)
      .single();

    if (redemptionError) {
      throw new Error(`Failed to create redemption: ${redemptionError.message}`);
    }

    // Deduct points
    await pointsService.spendPoints(
      userId,
      spaceId,
      redemption.id,
      reward.cost_points,
      reward.name
    );

    return redemption as RewardRedemption;
  },

  /**
   * Approve a redemption
   */
  async approveRedemption(
    redemptionId: string,
    approvedBy: string
  ): Promise<RewardRedemption> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('reward_redemptions')
      .update({
        status: 'approved',
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
      })
      .eq('id', redemptionId)
      .eq('status', 'pending')
      .select(`
        *,
        reward:rewards_catalog(*)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to approve redemption: ${error.message}`);
    }

    return data as RewardRedemption;
  },

  /**
   * Mark redemption as fulfilled
   */
  async fulfillRedemption(redemptionId: string): Promise<RewardRedemption> {
    const supabase = createClient();

    const { data, error } = await supabase
      .from('reward_redemptions')
      .update({
        status: 'fulfilled',
        fulfilled_at: new Date().toISOString(),
      })
      .eq('id', redemptionId)
      .in('status', ['pending', 'approved'])
      .select(`
        *,
        reward:rewards_catalog(*)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to fulfill redemption: ${error.message}`);
    }

    return data as RewardRedemption;
  },

  /**
   * Deny a redemption (refunds points)
   */
  async denyRedemption(
    redemptionId: string,
    deniedBy: string,
    reason?: string
  ): Promise<RewardRedemption> {
    const supabase = createClient();

    // Get redemption details first
    const { data: existing, error: fetchError } = await supabase
      .from('reward_redemptions')
      .select('*, reward:rewards_catalog(*)')
      .eq('id', redemptionId)
      .single();

    if (fetchError || !existing) {
      throw new Error('Redemption not found');
    }

    if (existing.status !== 'pending') {
      throw new Error('Can only deny pending redemptions');
    }

    // Update status
    const { data, error } = await supabase
      .from('reward_redemptions')
      .update({
        status: 'denied',
        approved_by: deniedBy,
        approved_at: new Date().toISOString(),
        notes: reason || 'Request denied',
      })
      .eq('id', redemptionId)
      .select(`
        *,
        reward:rewards_catalog(*)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to deny redemption: ${error.message}`);
    }

    // Refund points
    await pointsService.awardPoints({
      user_id: existing.user_id,
      space_id: existing.space_id,
      source_type: 'adjustment',
      source_id: redemptionId,
      points: existing.points_spent,
      reason: `Refund: ${existing.reward?.name || 'Reward'} request denied`,
      metadata: { refund_reason: reason },
    });

    return data as RewardRedemption;
  },

  /**
   * Cancel a redemption (by the user who requested it)
   */
  async cancelRedemption(
    redemptionId: string,
    userId: string
  ): Promise<RewardRedemption> {
    const supabase = createClient();

    // Get redemption details
    const { data: existing, error: fetchError } = await supabase
      .from('reward_redemptions')
      .select('*, reward:rewards_catalog(*)')
      .eq('id', redemptionId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !existing) {
      throw new Error('Redemption not found');
    }

    if (existing.status !== 'pending') {
      throw new Error('Can only cancel pending redemptions');
    }

    // Update status
    const { data, error } = await supabase
      .from('reward_redemptions')
      .update({
        status: 'cancelled',
        notes: 'Cancelled by user',
      })
      .eq('id', redemptionId)
      .select(`
        *,
        reward:rewards_catalog(*)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to cancel redemption: ${error.message}`);
    }

    // Refund points
    await pointsService.awardPoints({
      user_id: existing.user_id,
      space_id: existing.space_id,
      source_type: 'adjustment',
      source_id: redemptionId,
      points: existing.points_spent,
      reason: `Refund: Cancelled ${existing.reward?.name || 'reward'} request`,
    });

    return data as RewardRedemption;
  },

  // =============================================================================
  // ANALYTICS
  // =============================================================================

  /**
   * Get reward redemption stats
   */
  async getRedemptionStats(
    spaceId: string,
    period: 'week' | 'month' | 'all' = 'month'
  ): Promise<{
    totalRedemptions: number;
    totalPointsSpent: number;
    topRewards: { rewardId: string; rewardName: string; count: number }[];
    byCategory: Record<string, number>;
  }> {
    const supabase = createClient();

    // Get period start
    let periodStart = new Date();
    if (period === 'week') {
      periodStart.setDate(periodStart.getDate() - periodStart.getDay());
    } else if (period === 'month') {
      periodStart.setDate(1);
    } else {
      periodStart = new Date(0);
    }
    periodStart.setHours(0, 0, 0, 0);

    const { data: redemptions, error } = await supabase
      .from('reward_redemptions')
      .select('points_spent, reward:rewards_catalog(id, name, category)')
      .eq('space_id', spaceId)
      .in('status', ['approved', 'fulfilled'])
      .gte('created_at', periodStart.toISOString());

    if (error) {
      throw new Error(`Failed to fetch stats: ${error.message}`);
    }

    const totalRedemptions = redemptions?.length || 0;
    const totalPointsSpent = (redemptions || []).reduce((sum, r) => sum + r.points_spent, 0);

    // Count by reward
    const rewardCounts: Record<string, { name: string; count: number }> = {};
    const categoryCounts: Record<string, number> = {};

    for (const r of redemptions || []) {
      const reward = r.reward as { id: string; name: string; category: string } | null;
      if (reward) {
        if (!rewardCounts[reward.id]) {
          rewardCounts[reward.id] = { name: reward.name, count: 0 };
        }
        rewardCounts[reward.id].count++;

        categoryCounts[reward.category] = (categoryCounts[reward.category] || 0) + 1;
      }
    }

    const topRewards = Object.entries(rewardCounts)
      .map(([rewardId, { name, count }]) => ({ rewardId, rewardName: name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalRedemptions,
      totalPointsSpent,
      topRewards,
      byCategory: categoryCounts,
    };
  },
};
