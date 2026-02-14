'use client';

// Phase 14: Rewards Management Component
// Allows parents to create, edit, and delete rewards for the family shop

import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, X, Check, Loader2, Gift } from 'lucide-react';
import { rewardsService } from '@/lib/services/rewards';
import { sanitizePlainText } from '@/lib/sanitize';
import type { RewardCatalogItem, RewardCategory } from '@/lib/types/rewards';
import { Tooltip } from '@/components/ui/Tooltip';
import { logger } from '@/lib/logger';

interface RewardsManagementProps {
  spaceId: string;
  userId: string;
  className?: string;
}

const CATEGORY_OPTIONS: { value: RewardCategory; label: string; icon: string; description: string }[] = [
  { value: 'screen_time', label: 'Screen Time', icon: '📱', description: 'Extra device time, gaming hours' },
  { value: 'treats', label: 'Treats', icon: '🍦', description: 'Snacks, desserts, special foods' },
  { value: 'activities', label: 'Activities', icon: '🎮', description: 'Fun outings, games, experiences' },
  { value: 'money', label: 'Money', icon: '💵', description: 'Allowance bonuses, spending money' },
  { value: 'privileges', label: 'Privileges', icon: '✨', description: 'Special permissions, choices' },
  { value: 'other', label: 'Other', icon: '🎁', description: 'Custom rewards' },
];

const EMOJI_OPTIONS = ['🎁', '🍕', '🎬', '🎮', '📱', '🍦', '💵', '🌙', '🎫', '⭐', '🏆', '🎯', '🎨', '🎸', '🚗', '🎢'];

const DEFAULT_FORM = {
  name: '',
  description: '',
  cost_points: 50,
  category: 'other' as RewardCategory,
  emoji: '🎁',
  max_redemptions_per_week: null as number | null,
};

/** Provides admin controls for managing rewards, point values, and approvals. */
export function RewardsManagement({
  spaceId,
  userId,
  className = '',
}: RewardsManagementProps) {
  const [rewards, setRewards] = useState<RewardCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingReward, setEditingReward] = useState<RewardCatalogItem | null>(null);
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadRewards();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadRewards is a stable function
  }, [spaceId]);

  async function loadRewards() {
    try {
      setLoading(true);
      const data = await rewardsService.getRewards(spaceId, false); // Include inactive
      setRewards(data);
      setError(null);
    } catch (err) {
      logger.error('Failed to load rewards:', err, { component: 'RewardsManagement', action: 'component_action' });
      setError('Failed to load rewards');
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingReward(null);
    setFormData(DEFAULT_FORM);
    setFormErrors({});
    setShowModal(true);
  }

  function openEditModal(reward: RewardCatalogItem) {
    setEditingReward(reward);
    setFormData({
      name: reward.name,
      description: reward.description || '',
      cost_points: reward.cost_points,
      category: reward.category,
      emoji: reward.emoji,
      max_redemptions_per_week: reward.max_redemptions_per_week,
    });
    setFormErrors({});
    setShowModal(true);
  }

  function validateForm(): boolean {
    const errors: Record<string, string> = {};

    // Sanitize and validate name
    const sanitizedName = sanitizePlainText(formData.name);
    if (!sanitizedName || sanitizedName.length < 2) {
      errors.name = 'Name must be at least 2 characters';
    } else if (sanitizedName.length > 100) {
      errors.name = 'Name must be less than 100 characters';
    }

    // Validate cost
    if (!formData.cost_points || formData.cost_points < 1) {
      errors.cost_points = 'Cost must be at least 1 point';
    } else if (formData.cost_points > 10000) {
      errors.cost_points = 'Cost must be less than 10,000 points';
    }

    // Validate weekly limit if set
    if (formData.max_redemptions_per_week !== null) {
      if (formData.max_redemptions_per_week < 1 || formData.max_redemptions_per_week > 99) {
        errors.max_redemptions_per_week = 'Weekly limit must be 1-99';
      }
    }

    // Sanitize and validate description length
    const sanitizedDesc = sanitizePlainText(formData.description);
    if (sanitizedDesc.length > 500) {
      errors.description = 'Description must be less than 500 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit() {
    if (!validateForm()) return;

    try {
      setSaving(true);

      // Sanitize all text inputs
      const sanitizedData = {
        name: sanitizePlainText(formData.name),
        description: sanitizePlainText(formData.description) || undefined,
        cost_points: Math.round(formData.cost_points),
        category: formData.category,
        emoji: formData.emoji,
        max_redemptions_per_week: formData.max_redemptions_per_week,
      };

      if (editingReward) {
        // Update existing
        await rewardsService.updateReward(editingReward.id, sanitizedData);
      } else {
        // Create new
        await rewardsService.createReward({
          space_id: spaceId,
          created_by: userId,
          ...sanitizedData,
          // Convert null to undefined for the CreateRewardInput type
          max_redemptions_per_week: sanitizedData.max_redemptions_per_week ?? undefined,
        });
      }

      await loadRewards();
      setShowModal(false);
      setError(null);
    } catch (err) {
      logger.error('Failed to save reward:', err, { component: 'RewardsManagement', action: 'component_action' });
      setError(err instanceof Error ? err.message : 'Failed to save reward');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(rewardId: string) {
    try {
      setSaving(true);
      await rewardsService.deleteReward(rewardId);
      await loadRewards();
      setDeleteConfirm(null);
    } catch (err) {
      logger.error('Failed to delete reward:', err, { component: 'RewardsManagement', action: 'component_action' });
      setError('Failed to delete reward');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(reward: RewardCatalogItem) {
    try {
      await rewardsService.updateReward(reward.id, { is_active: !reward.is_active });
      await loadRewards();
    } catch (err) {
      logger.error('Failed to toggle reward:', err, { component: 'RewardsManagement', action: 'component_action' });
    }
  }

  if (loading) {
    return (
      <div className={`bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-700 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-700 rounded w-1/3" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-700 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`bg-gray-800 rounded-xl shadow-sm border border-gray-700 ${className}`}>
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 border-b border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Gift className="w-5 h-5 text-amber-500 flex-shrink-0" />
                <span className="truncate">Manage Family Rewards</span>
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Create rewards your family can earn by completing tasks and chores
              </p>
            </div>
            <button
              onClick={openCreateModal}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors font-medium text-sm whitespace-nowrap flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              Add Reward
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 bg-red-900/20 border border-red-800 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Rewards List */}
        <div className="p-4 sm:p-6">
          {rewards.length === 0 ? (
            <div className="text-center py-12">
              <Gift className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">
                No rewards yet
              </h3>
              <p className="text-gray-400 mb-4">
                Create rewards that your family can redeem with their earned points
              </p>
              <button
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create First Reward
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rewards.map((reward) => (
                <div
                  key={reward.id}
                  className={`relative p-4 rounded-lg border transition-all ${
                    reward.is_active
                      ? 'border-gray-700 bg-gray-900/50'
                      : 'border-gray-700 bg-gray-800 opacity-60'
                  }`}
                >
                  {/* Status Badge */}
                  {!reward.is_active && (
                    <div className="absolute top-2 right-2">
                      <span className="text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded">
                        Inactive
                      </span>
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{reward.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-white truncate">
                        {reward.name}
                      </h4>
                      {reward.description && (
                        <p className="text-sm text-gray-400 line-clamp-2 mt-1">
                          {reward.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-sm font-semibold text-amber-400">
                          {reward.cost_points} pts
                        </span>
                        <span className="text-xs text-gray-400">
                          {CATEGORY_OPTIONS.find(c => c.value === reward.category)?.label || reward.category}
                        </span>
                        {reward.max_redemptions_per_week && (
                          <span className="text-xs text-gray-400">
                            {reward.max_redemptions_per_week}/wk
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-700">
                    <button
                      onClick={() => handleToggleActive(reward)}
                      className={`flex-1 text-xs py-1.5 rounded transition-colors ${
                        reward.is_active
                          ? 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                          : 'bg-green-900/30 text-green-400 hover:bg-green-900/50'
                      }`}
                    >
                      {reward.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <Tooltip content="Edit reward" position="top">
                      <button
                        onClick={() => openEditModal(reward)}
                        className="p-1.5 text-gray-400 hover:text-blue-400 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </Tooltip>
                    <Tooltip content="Delete reward" position="top">
                      <button
                        onClick={() => setDeleteConfirm(reward.id)}
                        className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </Tooltip>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !saving && setShowModal(false)} aria-hidden="true" />
          <div className="relative bg-gray-800 rounded-xl max-w-lg w-full shadow-xl" role="dialog" aria-modal="true" aria-labelledby="reward-modal-title">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
              <h3 id="reward-modal-title" className="text-lg font-semibold text-white">
                {editingReward ? 'Edit Reward' : 'Create New Reward'}
              </h3>
              <button
                onClick={() => !saving && setShowModal(false)}
                className="text-gray-400 hover:text-gray-300"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Emoji Picker */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Icon
                </label>
                <div className="flex flex-wrap gap-2">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, emoji }))}
                      className={`w-10 h-10 text-xl rounded-lg border-2 transition-colors ${
                        formData.emoji === emoji
                          ? 'border-amber-500 bg-amber-900/30'
                          : 'border-gray-700 hover:border-amber-300'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Reward Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., 30 min screen time, Ice cream trip"
                  maxLength={100}
                  className={`w-full px-3 py-2 border rounded-lg bg-gray-900 text-white focus:ring-2 focus:ring-amber-500 ${
                    formErrors.name ? 'border-red-500' : 'border-gray-700'
                  }`}
                />
                {formErrors.name && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe this reward..."
                  rows={2}
                  maxLength={500}
                  className={`w-full px-3 py-2 border rounded-lg bg-gray-900 text-white resize-none focus:ring-2 focus:ring-amber-500 ${
                    formErrors.description ? 'border-red-500' : 'border-gray-700'
                  }`}
                />
                {formErrors.description && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.description}</p>
                )}
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Category
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {CATEGORY_OPTIONS.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, category: cat.value }))}
                      className={`p-2 text-sm rounded-lg border-2 text-left transition-colors ${
                        formData.category === cat.value
                          ? 'border-amber-500 bg-amber-900/30'
                          : 'border-gray-700 hover:border-amber-300'
                      }`}
                    >
                      <span className="text-lg">{cat.icon}</span>
                      <div className="text-xs font-medium text-white mt-1">
                        {cat.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Cost */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Point Cost *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={formData.cost_points}
                    onChange={(e) => setFormData(prev => ({ ...prev, cost_points: parseInt(e.target.value) || 0 }))}
                    min={1}
                    max={10000}
                    className={`w-32 px-3 py-2 border rounded-lg bg-gray-900 text-white focus:ring-2 focus:ring-amber-500 ${
                      formErrors.cost_points ? 'border-red-500' : 'border-gray-700'
                    }`}
                  />
                  <span className="text-sm text-gray-400">points</span>
                </div>
                {formErrors.cost_points && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.cost_points}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  Tip: Easy chores earn ~10 pts, harder ones ~25+ pts
                </p>
              </div>

              {/* Weekly Limit */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Weekly Redemption Limit (optional)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={formData.max_redemptions_per_week || ''}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      max_redemptions_per_week: e.target.value ? parseInt(e.target.value) : null
                    }))}
                    placeholder="No limit"
                    min={1}
                    max={99}
                    className={`w-32 px-3 py-2 border rounded-lg bg-gray-900 text-white focus:ring-2 focus:ring-amber-500 ${
                      formErrors.max_redemptions_per_week ? 'border-red-500' : 'border-gray-700'
                    }`}
                  />
                  <span className="text-sm text-gray-400">times per week</span>
                </div>
                {formErrors.max_redemptions_per_week && (
                  <p className="text-xs text-red-500 mt-1">{formErrors.max_redemptions_per_week}</p>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-700">
              <button
                onClick={() => !saving && setShowModal(false)}
                disabled={saving}
                className="px-4 py-2 border border-gray-600 text-gray-300 hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    {editingReward ? 'Save Changes' : 'Create Reward'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => !saving && setDeleteConfirm(null)} aria-hidden="true" />
          <div className="relative bg-gray-800 rounded-xl max-w-sm w-full p-6 shadow-xl" role="alertdialog" aria-modal="true" aria-labelledby="delete-reward-title" aria-describedby="delete-reward-desc">
            <h3 id="delete-reward-title" className="text-lg font-semibold text-white mb-2">
              Delete Reward?
            </h3>
            <p id="delete-reward-desc" className="text-gray-400 mb-4">
              This reward will be permanently removed. Any pending redemptions will be cancelled.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={saving}
                className="px-4 py-2 border border-gray-600 text-gray-300 hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
