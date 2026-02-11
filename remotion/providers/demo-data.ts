import type { UserProfile } from '@/lib/hooks/useAuthQuery';
import type { Space } from '@/lib/types';
import type { FeatureLimits } from '@/lib/types';
import { FEATURE_LIMITS } from '@/lib/contexts/subscription-context';

// =============================================
// Demo User
// =============================================

export const demoUser: UserProfile = {
  id: 'demo-user-0001',
  email: 'sarah@example.com',
  name: 'Sarah',
  avatar_url: null,
  created_at: '2025-06-15T10:00:00Z',
  updated_at: '2026-02-10T08:00:00Z',
  timezone: 'America/New_York',
  color_theme: 'blue',
  pronouns: 'she/her',
};

// =============================================
// Demo Space
// =============================================

export const demoSpace: Space & { role: string } = {
  id: 'demo-space-0001',
  name: 'Thompson Family',
  description: 'Our family household',
  type: 'household',
  created_at: '2025-06-15T10:00:00Z',
  updated_at: '2026-02-10T08:00:00Z',
  user_id: demoUser.id,
  created_by: demoUser.id,
  role: 'owner',
};

// =============================================
// Feature Limits (Family tier — all features)
// =============================================

export const demoLimits: FeatureLimits = FEATURE_LIMITS.family;
