'use client';

import { useState, useEffect } from 'react';
import { Repeat, Users, Calendar, Settings, Trash2, Play, Pause } from 'lucide-react';
import { choreRotationService } from '@/lib/services/chore-rotation-service';
import { createClient } from '@/lib/supabase/client';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { logger } from '@/lib/logger';

interface ChoreRotationConfigProps {
  taskId: string;
  spaceId: string;
}

interface RotationConfig {
  id?: string;
  rotation_type: 'round-robin' | 'random';
  interval_type: 'daily' | 'weekly' | 'monthly';
  interval_value: number;
  member_ids: string[];
  is_active: boolean;
}

interface SpaceMember {
  user_id: string;
  users: {
    id: string;
    email: string;
    full_name: string | null;
  };
}

export function ChoreRotationConfig({ taskId, spaceId }: ChoreRotationConfigProps) {
  const [rotation, setRotation] = useState<RotationConfig | null>(null);
  const [spaceMembers, setSpaceMembers] = useState<SpaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [formData, setFormData] = useState<RotationConfig>({
    rotation_type: 'round-robin',
    interval_type: 'weekly',
    interval_value: 1,
    member_ids: [],
    is_active: true,
  });

  useEffect(() => {
    loadRotation();
    loadSpaceMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load functions are stable
  }, [taskId, spaceId]);

  async function loadRotation() {
    try {
      const data = await choreRotationService.getRotation(taskId);
      if (data) {
        // Map service response to local RotationConfig format
        const mappedData: RotationConfig = {
          id: data.id,
          rotation_type: (data.rotation_type as 'round-robin' | 'random') || 'round-robin',
          interval_type: (data.rotation_frequency as 'daily' | 'weekly' | 'monthly') || 'weekly',
          interval_value: 1,
          member_ids: data.user_order || [],
          is_active: true,
        };
        setRotation(mappedData);
        setFormData(mappedData);
      }
    } catch (error) {
      logger.error('Error loading rotation:', error, { component: 'ChoreRotationConfig', action: 'component_action' });
    } finally {
      setLoading(false);
    }
  }

  async function loadSpaceMembers() {
    const supabase = createClient();
    const { data } = await supabase
      .from('space_members')
      .select(`
        user_id,
        users!user_id (
          id,
          email,
          full_name
        )
      `)
      .eq('space_id', spaceId);

    setSpaceMembers((data ?? []) as SpaceMember[]);
  }

  async function handleSave() {
    if (formData.member_ids.length < 2) {
      alert('Please select at least 2 members for rotation');
      return;
    }

    setSaving(true);
    try {
      if (rotation?.id) {
        await choreRotationService.updateRotation(rotation.id, formData);
      } else {
        await choreRotationService.createRotation(
          taskId,
          formData.member_ids,
          formData.interval_type,
          formData.rotation_type,
          spaceId
        );
      }
      loadRotation();
      setEditing(false);
    } catch (error) {
      logger.error('Error saving rotation:', error, { component: 'ChoreRotationConfig', action: 'component_action' });
      alert('Failed to save rotation');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!rotation?.id) return;

    try {
      await choreRotationService.deleteRotation(rotation.id);
      setShowDeleteConfirm(false);
      setRotation(null);
      setFormData({
        rotation_type: 'round-robin',
        interval_type: 'weekly',
        interval_value: 1,
        member_ids: [],
        is_active: true,
      });
    } catch (error) {
      logger.error('Error deleting rotation:', error, { component: 'ChoreRotationConfig', action: 'component_action' });
      alert('Failed to delete rotation');
    }
  }

  async function toggleActive() {
    if (!rotation?.id) return;

    try {
      // Toggle active state locally (is_active not stored in DB schema)
      setRotation(prev => prev ? { ...prev, is_active: !prev.is_active } : null);
      setFormData(prev => ({ ...prev, is_active: !prev.is_active }));
    } catch (error) {
      logger.error('Error toggling rotation:', error, { component: 'ChoreRotationConfig', action: 'component_action' });
    }
  }

  function toggleMember(userId: string) {
    setFormData(prev => ({
      ...prev,
      member_ids: prev.member_ids.includes(userId)
        ? prev.member_ids.filter(id => id !== userId)
        : [...prev.member_ids, userId],
    }));
  }

  if (loading) {
    return <div className="text-sm text-gray-500">Loading rotation config...</div>;
  }

  const isConfigured = rotation !== null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Repeat className="w-5 h-5 text-purple-500" />
          <h3 className="text-lg font-semibold text-white">
            Chore Rotation
          </h3>
          {isConfigured && (
            <span className={`px-2 py-0.5 text-xs rounded-full ${
              rotation.is_active
                ? 'bg-green-900/20 text-green-300'
                : 'bg-gray-900/20 text-gray-300'
            }`}>
              {rotation.is_active ? 'Active' : 'Inactive'}
            </span>
          )}
        </div>

        {isConfigured && !editing && (
          <div className="flex items-center gap-2">
            <button
              onClick={toggleActive}
              className="p-2 text-gray-600 hover:bg-gray-700 rounded-lg"
              title={rotation.is_active ? 'Pause rotation' : 'Resume rotation'}
            >
              {rotation.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setEditing(true)}
              className="p-2 text-gray-600 hover:bg-gray-700 rounded-lg"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 text-red-600 hover:bg-red-900 rounded-lg"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Display Mode */}
      {isConfigured && !editing ? (
        <div className="space-y-3">
          <div className="p-4 bg-gray-900 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Rotation Type</p>
                <p className="text-sm font-medium text-white capitalize">
                  {rotation.rotation_type.replace('-', ' ')}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Interval</p>
                <p className="text-sm font-medium text-white">
                  Every {rotation.interval_value} {rotation.interval_type.replace('ly', '')}
                  {rotation.interval_value > 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <div className="mt-4">
              <p className="text-xs text-gray-500 mb-2">Members in Rotation ({rotation.member_ids.length})</p>
              <div className="flex flex-wrap gap-2">
                {spaceMembers
                  .filter(m => rotation.member_ids.includes(m.user_id))
                  .map((member) => (
                    <span
                      key={member.user_id}
                      className="px-2 py-1 text-xs bg-purple-900/20 text-purple-300 rounded"
                    >
                      {member.users.full_name || member.users.email}
                    </span>
                  ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Edit/Create Mode */
        <div className="space-y-4">
          {/* Rotation Type */}
          <div>
            <label htmlFor="field-1" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
              Rotation Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setFormData(prev => ({ ...prev, rotation_type: 'round-robin' }))}
                className={`p-3 text-left border rounded-lg transition-colors ${
                  formData.rotation_type === 'round-robin'
                    ? 'border-purple-500 bg-purple-900/20'
                    : 'border-gray-600'
                }`}
              >
                <p className="text-sm font-medium text-white">Round Robin</p>
                <p className="text-xs text-gray-500">Rotate in order</p>
              </button>
              <button
                onClick={() => setFormData(prev => ({ ...prev, rotation_type: 'random' }))}
                className={`p-3 text-left border rounded-lg transition-colors ${
                  formData.rotation_type === 'random'
                    ? 'border-purple-500 bg-purple-900/20'
                    : 'border-gray-600'
                }`}
              >
                <p className="text-sm font-medium text-white">Random</p>
                <p className="text-xs text-gray-500">Random assignment</p>
              </button>
            </div>
          </div>

          {/* Interval */}
          <div>
            <label htmlFor="field-2" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
              <Calendar className="w-4 h-4 inline mr-1" />
              Rotation Interval
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                min="1"
                value={formData.interval_value}
                onChange={(e) => setFormData(prev => ({ ...prev, interval_value: parseInt(e.target.value) }))}
                className="px-3 py-2 border border-gray-600 rounded-lg bg-gray-900"
              />
              <select
                value={formData.interval_type}
                onChange={(e) => setFormData(prev => ({ ...prev, interval_type: e.target.value as RotationConfig['interval_type'] }))}
                className="pl-3 pr-10 py-2 border border-gray-600 rounded-lg bg-gray-900"
              >
                <option value="daily">Day(s)</option>
                <option value="weekly">Week(s)</option>
                <option value="monthly">Month(s)</option>
              </select>
            </div>
          </div>

          {/* Members */}
          <div>
            <label htmlFor="field-3" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
              <Users className="w-4 h-4 inline mr-1" />
              Select Members ({formData.member_ids.length} selected)
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto p-3 bg-gray-900 rounded-lg">
              {spaceMembers.map((member) => (
                <label
                  key={member.user_id}
                  htmlFor="field-4" className="flex items-center gap-2 cursor-pointer hover:bg-gray-800 p-2 rounded"
                >
                  <input
                    type="checkbox"
                    checked={formData.member_ids.includes(member.user_id)}
                    id="field-4"
              onChange={() =>  toggleMember(member.user_id)}
                    className="rounded border-gray-300 text-purple-500"
                  />
                  <span className="text-sm text-gray-300">
                    {member.users.full_name || member.users.email}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving || formData.member_ids.length < 2}
              className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : isConfigured ? 'Update Rotation' : 'Create Rotation'}
            </button>
            {editing && (
              <button
                onClick={() => {
                  setEditing(false);
                  if (rotation) setFormData(rotation);
                }}
                className="px-4 py-2 text-gray-300 hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="p-3 bg-blue-900/20 border border-blue-800 rounded-lg">
        <p className="text-xs text-blue-300">
          <strong>How it works:</strong> This chore will automatically rotate to the next member
          based on the interval you set. Members will be notified when assigned.
        </p>
      </div>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Rotation"
        message="Are you sure you want to delete this rotation? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
      />
    </div>
  );
}
