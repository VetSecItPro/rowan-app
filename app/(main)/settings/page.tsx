'use client';

// Force dynamic rendering to prevent useContext errors during static generation
export const dynamic = 'force-dynamic';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { CreateSpaceModal } from '@/components/spaces/CreateSpaceModal';
import { InvitePartnerModal } from '@/components/spaces/InvitePartnerModal';
import { DeleteSpaceModal } from '@/components/spaces/DeleteSpaceModal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { logger } from '@/lib/logger';
import { csrfFetch } from '@/lib/utils/csrf-fetch';
import { showError, showSuccess, showWarning, showInfo } from '@/lib/utils/toast';
// Dynamic imports for optimized bundle splitting
import {
  AccountDeletionModal,
  ExportDataModal,
  TwoFactorAuth,
  PrivacyDataManager,
} from '@/components/ui/DynamicSettingsComponents';
import { DataManagementTab } from '@/components/settings/DataManagementTab';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { ChangePasswordForm } from '@/components/settings/ChangePasswordForm';
import { SubscriptionSettings } from '@/components/settings/SubscriptionSettings';
import { CalendarConnections } from '@/components/calendar/CalendarConnections';
import { SpacesLoadingState } from '@/components/ui/LoadingStates';
import { useNumericLimit } from '@/lib/hooks/useFeatureGate';
import { createClient } from '@/lib/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  User,
  Shield,
  Bell,
  Users,
  Database,
  Save,
  Camera,
  Mail,
  Download,
  Trash2,
  LogOut,
  Key,
  X,
  UserPlus,
  Crown,
  Eye,
  AlertTriangle,
  Check,
  Copy,
  Monitor,
  BarChart3,
  ArrowRight,
  Calendar,
  CheckSquare,
  ShoppingCart,
  UtensilsCrossed,
  MessageSquare,
  DollarSign,
  Target,
  BookOpen,
  ShoppingBag,
  Home,
  Heart,
  Loader2,
  Edit,
  Receipt,
  FolderOpen,
  Link2,
  CreditCard,
  Gift,
  Search,
  CheckCircle2,
  Bot,
} from 'lucide-react';

type SettingsTab = 'profile' | 'subscription' | 'security' | 'notifications' | 'privacy-data' | 'data-management' | 'integrations' | 'documentation' | 'analytics';
type UserRole = 'Admin' | 'Member' | 'Viewer';


interface SpaceMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  color_theme?: string;
  isCurrentUser?: boolean;
}

interface ActiveSession {
  id: string;
  device: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

// Allowed image formats for profile picture
const ALLOWED_PROFILE_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp'
];

const ALLOWED_PROFILE_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const MIN_IMAGE_DIMENSION = 100;
const MAX_IMAGE_DIMENSION = 2000;

// Space members are now fetched from the API - see fetchSpaceMembers()

// Active sessions will be fetched from API

// Pending invitation type
interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  created_at: string;
  expires_at: string;
  invitation_url: string;
  token: string;
}

// Documentation features array - organized by category
// Search keywords map for natural language search
const documentationSearchKeywords: Record<string, string[]> = {
  tasks: ['task', 'chore', 'todo', 'to-do', 'assignment', 'duty', 'cleaning', 'housework'],
  calendar: ['calendar', 'event', 'schedule', 'appointment', 'meeting', 'date', 'time'],
  reminders: ['reminder', 'alert', 'notification', 'remind', 'notify', 'alarm'],
  messages: ['message', 'chat', 'communication', 'talk', 'conversation', 'partner'],
  shopping: ['shopping', 'grocery', 'groceries', 'list', 'buy', 'purchase', 'store'],
  meals: ['meal', 'planning', 'dinner', 'lunch', 'breakfast', 'food', 'cook', 'recipe'],
  recipes: ['recipe', 'cookbook', 'ingredient', 'cooking', 'dish', 'import', 'url'],
  goals: ['goal', 'milestone', 'target', 'objective', 'achievement', 'planning'],
  household: ['household', 'budget', 'bill', 'expense', 'home', 'utility', 'finance'],
  expenses: ['expense', 'receipt', 'scan', 'spending', 'money', 'track', 'cost', 'ai'],
  projects: ['project', 'budget', 'vendor', 'contractor', 'renovation', 'actual'],
  spaces: ['space', 'collaboration', 'team', 'invite', 'partner', 'share', 'family'],
  checkin: ['check-in', 'checkin', 'wellness', 'mood', 'emotion', 'feeling', 'daily'],
  subscriptions: ['subscription', 'billing', 'payment', 'plan', 'pricing', 'trial', 'pro', 'family', 'upgrade', 'cancel'],
  'ai-companion': ['ai', 'assistant', 'chat', 'rowan ai', 'companion', 'voice', 'briefing', 'suggestion', 'smart'],
};

const documentationFeatures = [
  // Core Daily Features
  {
    id: 'tasks',
    name: 'Tasks & Chores',
    description: 'Manage daily tasks and household chores with smart features',
    icon: CheckSquare,
    color: 'from-blue-500 to-blue-600',
    hoverBorder: 'hover:border-blue-500',
    hoverShadow: 'hover:shadow-blue-500/50',
    href: '/settings/documentation/tasks-chores',
    available: true,
  },
  {
    id: 'calendar',
    name: 'Calendar & Events',
    description: 'Master your schedule with shared calendar features',
    icon: Calendar,
    color: 'from-purple-500 to-purple-600',
    hoverBorder: 'hover:border-purple-500',
    hoverShadow: 'hover:shadow-purple-500/50',
    href: '/settings/documentation/calendar',
    available: true,
  },
  {
    id: 'reminders',
    name: 'Reminders',
    description: 'Set up and manage reminders for important tasks',
    icon: Bell,
    color: 'from-pink-500 to-pink-600',
    hoverBorder: 'hover:border-pink-500',
    hoverShadow: 'hover:shadow-pink-500/50',
    href: '/settings/documentation/reminders',
    available: true,
  },
  {
    id: 'messages',
    name: 'Messages',
    description: 'Communicate effectively with your partner',
    icon: MessageSquare,
    color: 'from-green-500 to-green-600',
    hoverBorder: 'hover:border-green-500',
    hoverShadow: 'hover:shadow-green-500/50',
    href: '/settings/documentation/messages',
    available: true,
  },
  {
    id: 'shopping',
    name: 'Shopping Lists',
    description: 'Create and share shopping lists with ease',
    icon: ShoppingBag,
    color: 'from-emerald-500 to-emerald-600',
    hoverBorder: 'hover:border-emerald-500',
    hoverShadow: 'hover:shadow-emerald-500/50',
    href: '/settings/documentation/shopping',
    available: true,
  },
  // Meal & Recipe Features
  {
    id: 'meals',
    name: 'Meal Planning',
    description: 'Plan meals, discover recipes, and generate shopping lists',
    icon: UtensilsCrossed,
    color: 'from-orange-500 to-orange-600',
    hoverBorder: 'hover:border-orange-500',
    hoverShadow: 'hover:shadow-orange-500/50',
    href: '/settings/documentation/meals',
    available: true,
  },
  {
    id: 'recipes',
    name: 'Recipe Library & Discovery',
    description: 'Browse, save, and discover new recipes with AI-powered import',
    icon: UtensilsCrossed,
    color: 'from-yellow-500 to-yellow-600',
    hoverBorder: 'hover:border-yellow-500',
    hoverShadow: 'hover:shadow-yellow-500/50',
    href: '/settings/documentation/recipes',
    available: true,
  },
  // Planning & Goals
  {
    id: 'goals',
    name: 'Goals & Planning',
    description: 'Set and track your shared goals and milestones',
    icon: Target,
    color: 'from-indigo-500 to-indigo-600',
    hoverBorder: 'hover:border-indigo-500',
    hoverShadow: 'hover:shadow-indigo-500/50',
    href: '/settings/documentation/goals',
    available: true,
  },
  // Financial Features
  {
    id: 'household',
    name: 'Household & Budget',
    description: 'Manage household chores, bills, and budget tracking',
    icon: Home,
    color: 'from-amber-500 to-amber-600',
    hoverBorder: 'hover:border-amber-500',
    hoverShadow: 'hover:shadow-amber-500/50',
    href: '/settings/documentation/household',
    available: true,
  },
  {
    id: 'expenses',
    name: 'Expenses & Receipt Scanning',
    description: 'AI-powered expense tracking and receipt scanning',
    icon: Receipt,
    color: 'from-red-500 to-red-600',
    hoverBorder: 'hover:border-red-500',
    hoverShadow: 'hover:shadow-red-500/50',
    href: '/settings/documentation/expenses',
    available: true,
  },
  {
    id: 'projects',
    name: 'Projects & Budgets',
    description: 'Project management, budget vs actual tracking, vendor management',
    icon: FolderOpen,
    color: 'from-cyan-500 to-cyan-600',
    hoverBorder: 'hover:border-cyan-500',
    hoverShadow: 'hover:shadow-cyan-500/50',
    href: '/settings/documentation/projects',
    available: true,
  },
  // Collaboration Features
  {
    id: 'spaces',
    name: 'Space & Collaboration',
    description: 'Master space management, invitations, and team collaboration',
    icon: Users,
    color: 'from-teal-500 to-teal-600',
    hoverBorder: 'hover:border-teal-500',
    hoverShadow: 'hover:shadow-teal-500/50',
    href: '/settings/documentation/spaces',
    available: true,
  },
  {
    id: 'checkin',
    name: 'Daily Check-In',
    description: 'Track emotional wellness and connect with your partner',
    icon: Heart,
    color: 'from-pink-500 to-purple-500',
    hoverBorder: 'hover:border-pink-500',
    hoverShadow: 'hover:shadow-pink-500/50',
    href: '/settings/documentation/checkin',
    available: true,
  },
  // Account & Billing
  {
    id: 'subscriptions',
    name: 'Subscriptions & Billing',
    description: 'Plans, pricing, free trials, billing, and managing your subscription',
    icon: CreditCard,
    color: 'from-emerald-500 to-teal-500',
    hoverBorder: 'hover:border-emerald-500',
    hoverShadow: 'hover:shadow-emerald-500/50',
    href: '/settings/documentation/subscriptions',
    available: true,
  },
  {
    id: 'ai-companion',
    name: 'AI Companion',
    description: 'Chat with Rowan AI — your household assistant for tasks, schedules, and more',
    icon: Bot,
    color: 'from-blue-500 to-purple-600',
    hoverBorder: 'hover:border-blue-500',
    hoverShadow: 'hover:shadow-blue-500/50',
    href: '/settings/documentation/ai-companion',
    available: true,
  },
  {
    id: 'rewards',
    name: 'Rewards Shop',
    description: 'Motivate with points, browse rewards catalog, and redeem prizes',
    icon: Gift,
    color: 'from-amber-500 to-orange-500',
    hoverBorder: 'hover:border-amber-500',
    hoverShadow: 'hover:shadow-amber-500/50',
    href: '/settings/documentation/rewards',
    available: true,
  },
];

export default function SettingsPage() {
  const { user, currentSpace, spaces, switchSpace, refreshSpaces, refreshProfile } = useAuthWithSpaces();
  const spaceId = currentSpace?.id;
  const router = useRouter();
  const searchParams = useSearchParams();

  // Space creation limit based on subscription tier
  const { limit: maxSpaces, promptIfExceeded: promptSpaceUpgrade } = useNumericLimit('maxSpaces');
  // Count spaces where user is owner (not just member)
  const ownedSpacesCount = spaces?.filter(s => s.role === 'owner').length || 0;

  // Get initial tab from URL or default to 'profile'
  const initialTab = (searchParams?.get('tab') as SettingsTab) || 'profile';
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const profileImageInputRef = useRef<HTMLInputElement>(null);

  // Update URL when tab changes and persist tab selection
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('tab', activeTab);
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [activeTab, router]);

  // Profile state
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || ''
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  // Update profile data when user data changes
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || ''
      });
      setProfileImage(user.avatar_url || null);
    }
  }, [user]);

  // Password reset state
  const [isRequestingReset, setIsRequestingReset] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  // Modal states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCreateSpaceModal, setShowCreateSpaceModal] = useState(false);
  const [showDeleteSpaceModal, setShowDeleteSpaceModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [showRevokeSessionModal, setShowRevokeSessionModal] = useState(false);
  const [showRemoveMemberConfirm, setShowRemoveMemberConfirm] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);

  // Invite modal state

  // Documentation search state
  const [docSearchQuery, setDocSearchQuery] = useState('');


  // Space members state
  const [spaceMembers, setSpaceMembers] = useState<SpaceMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([]);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(false);
  const [copiedInvitationId, setCopiedInvitationId] = useState<string | null>(null);
  const [resendingInvitationId, setResendingInvitationId] = useState<string | null>(null);
  const [cancellingInvitationId, setCancellingInvitationId] = useState<string | null>(null);

  // Rename space state
  const [isRenamingSpace, setIsRenamingSpace] = useState(false);
  const [newSpaceNameEdit, setNewSpaceNameEdit] = useState('');
  const [isSavingSpaceName, setIsSavingSpaceName] = useState(false);


  // Delete account state
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteAcknowledged, setDeleteAcknowledged] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);



  // Active sessions state
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [sessionToRevoke, setSessionToRevoke] = useState<string | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  const validateProfileImage = (file: File): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      // Check file type
      if (!ALLOWED_PROFILE_IMAGE_TYPES.includes(file.type)) {
        reject('Invalid file type. Only JPG, PNG, and WebP images are allowed.');
        return;
      }

      // Check file extension
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!ALLOWED_PROFILE_IMAGE_EXTENSIONS.includes(extension)) {
        reject('Invalid file extension. Only .jpg, .jpeg, .png, and .webp files are allowed.');
        return;
      }

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        reject(`File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`);
        return;
      }

      // Check image dimensions (use globalThis.Image to access native browser Image, not Next.js Image)
      const img = new globalThis.Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);

        if (img.width < MIN_IMAGE_DIMENSION || img.height < MIN_IMAGE_DIMENSION) {
          reject(`Image dimensions must be at least ${MIN_IMAGE_DIMENSION}x${MIN_IMAGE_DIMENSION} pixels. Your image is ${img.width}x${img.height} pixels.`);
          return;
        }

        if (img.width > MAX_IMAGE_DIMENSION || img.height > MAX_IMAGE_DIMENSION) {
          reject(`Image dimensions must not exceed ${MAX_IMAGE_DIMENSION}x${MAX_IMAGE_DIMENSION} pixels. Your image is ${img.width}x${img.height} pixels.`);
          return;
        }

        resolve(true);
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject('Failed to load image. Please try a different file.');
      };

      img.src = objectUrl;
    });
  };

  const handleProfileImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await validateProfileImage(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      showError(error instanceof Error ? error.message : String(error));
    }

    // Reset input
    e.target.value = '';
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);

    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(profileData.email)) {
        showWarning('Please enter a valid email address');
        setIsSavingProfile(false);
        return;
      }

      // Validate name
      if (!profileData.name.trim()) {
        showWarning('Please enter your name');
        setIsSavingProfile(false);
        return;
      }

      // Call profile update API
      const response = await csrfFetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: profileData.name.trim(),
          email: profileData.email.trim(),
          avatar_url: profileImage, // Include profile picture
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      // Success - show animated confirmation
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 2200);

      // Refresh the auth context to get updated user data
      await refreshProfile();

    } catch (error) {
      logger.error('Failed to update profile:', error, { component: 'page', action: 'execution' });

      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile. Please try again.';
      showError(errorMessage);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Callback to refresh invitations and members after modal closes
  const handleInviteModalClose = () => {
    setShowInviteModal(false);
    // Refresh pending invitations to show the newly created one
    fetchPendingInvitations();
    // Also refresh members in case someone just accepted an invitation
    fetchSpaceMembers();
  };

  const [isUpdatingRole, setIsUpdatingRole] = useState<string | null>(null);

  const handleUpdateMemberRole = async (memberId: string, newRole: UserRole) => {
    if (!spaceId) return;

    // Map frontend role names to backend role names
    const backendRole = newRole === 'Admin' ? 'admin' : 'member';

    try {
      setIsUpdatingRole(memberId);
      const response = await csrfFetch('/api/spaces/members', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: memberId, // memberId is the user_id from API response
          space_id: spaceId,
          new_role: backendRole,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Update local state
        setSpaceMembers(spaceMembers.map(member =>
          member.id === memberId ? { ...member, role: newRole } : member
        ));
      } else {
        showError(result.error || 'Failed to update role');
      }
    } catch (error) {
      logger.error('Error updating member role:', error, { component: 'page', action: 'execution' });
      showError('Failed to update member role');
    } finally {
      setIsUpdatingRole(null);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    const member = spaceMembers.find(m => m.id === memberId);
    if (!member) return;

    if (member.isCurrentUser) {
      showWarning('You cannot remove yourself. Use "Leave Space" instead.');
      return;
    }

    const adminCount = spaceMembers.filter(m => m.role === 'Admin').length;
    if (member.role === 'Admin' && adminCount === 1) {
      showWarning('Cannot remove the last admin. Promote another member to admin first.');
      return;
    }

    setMemberToRemove(memberId);
    setShowRemoveMemberConfirm(true);
  };

  const confirmRemoveMember = async () => {
    if (!memberToRemove || !spaceId) return;

    try {
      const response = await csrfFetch('/api/spaces/members', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: memberToRemove, // memberToRemove is the user_id from API response
          space_id: spaceId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setSpaceMembers(spaceMembers.filter(m => m.id !== memberToRemove));
      } else {
        showError(result.error || 'Failed to remove member');
      }
    } catch (error) {
      logger.error('Error removing member:', error, { component: 'page', action: 'execution' });
      showError('Failed to remove member');
    } finally {
      setShowRemoveMemberConfirm(false);
      setMemberToRemove(null);
    }
  };

  const handleRenameSpace = async () => {
    if (!newSpaceNameEdit.trim()) {
      showWarning('Please enter a space name');
      return;
    }

    if (!currentSpace) {
      showError('No space selected');
      return;
    }

    setIsSavingSpaceName(true);

    try {
      // TODO: Implement actual API call to rename space
      // For now, just simulate the rename
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Success feedback
      showSuccess('Space renamed successfully!');

      // Exit rename mode
      setIsRenamingSpace(false);
      setNewSpaceNameEdit('');

      // Refresh spaces to get updated data
      refreshSpaces();

    } catch (error) {
      logger.error('Failed to rename space:', error, { component: 'page', action: 'execution' });
      showError('Failed to rename space. Please try again.');
    } finally {
      setIsSavingSpaceName(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      showWarning('Please enter your password');
      return;
    }

    if (deleteConfirmText !== 'DELETE') {
      showWarning('Please type DELETE to confirm');
      return;
    }

    if (!deleteAcknowledged) {
      showWarning('Please acknowledge that this action is permanent');
      return;
    }

    setIsDeletingAccount(true);
    await new Promise(resolve => setTimeout(resolve, 1500));


    setIsDeletingAccount(false);
    setShowDeleteAccountModal(false);
  };

  const fetchSpaceMembers = useCallback(async () => {
    if (!spaceId) return;

    try {
      setIsLoadingMembers(true);
      const response = await fetch(`/api/spaces/members?space_id=${spaceId}`);
      const result = await response.json();

      if (result.success) {
        setSpaceMembers(result.data);
      } else {
        logger.error('Failed to load space members:', undefined, { component: 'page', action: 'execution', details: result.error });
      }
    } catch (error) {
      logger.error('Error loading space members:', error, { component: 'page', action: 'execution' });
    } finally {
      setIsLoadingMembers(false);
    }
  }, [spaceId]);

  const fetchPendingInvitations = useCallback(async () => {
    if (!spaceId) return;

    try {
      setIsLoadingInvitations(true);
      const response = await fetch(`/api/spaces/invitations?space_id=${spaceId}`);
      const result = await response.json();

      if (result.success) {
        setPendingInvitations(result.data);
      } else {
        logger.error('Failed to load invitations:', undefined, { component: 'page', action: 'execution', details: result.error });
      }
    } catch (error) {
      logger.error('Error loading invitations:', error, { component: 'page', action: 'execution' });
    } finally {
      setIsLoadingInvitations(false);
    }
  }, [spaceId]);

  // Fetch space members and pending invitations when profile tab is active and space is selected
  // OPTIMIZATION: Fetch both in parallel for faster loading
  useEffect(() => {
    if (activeTab === 'profile' && spaceId) {
      Promise.all([fetchSpaceMembers(), fetchPendingInvitations()]);
    }
  }, [activeTab, spaceId, fetchSpaceMembers, fetchPendingInvitations]);

  const handleCopyInvitationUrl = async (invitationId: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedInvitationId(invitationId);
      setTimeout(() => setCopiedInvitationId(null), 2000);
    } catch (error) {
      logger.error('Failed to copy invitation URL:', error, { component: 'page', action: 'execution' });
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    try {
      setResendingInvitationId(invitationId);
      const response = await csrfFetch('/api/spaces/invitations', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitation_id: invitationId, space_id: spaceId }),
      });
      const result = await response.json();

      if (result.success) {
        // Refresh the list
        await fetchPendingInvitations();
        if (result.data.email_sent) {
          showSuccess('Invitation resent successfully!');
        } else {
          showWarning('Invitation renewed but email failed. Share the link directly.');
        }
      } else {
        showError(result.error || 'Failed to resend invitation');
      }
    } catch (error) {
      logger.error('Error resending invitation:', error, { component: 'page', action: 'execution' });
      showError('Failed to resend invitation');
    } finally {
      setResendingInvitationId(null);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!confirm('Are you sure you want to cancel this invitation?')) return;

    try {
      setCancellingInvitationId(invitationId);
      const response = await csrfFetch('/api/spaces/invitations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitation_id: invitationId }),
      });
      const result = await response.json();

      if (result.success) {
        setPendingInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      } else {
        showError(result.error || 'Failed to cancel invitation');
      }
    } catch (error) {
      logger.error('Error cancelling invitation:', error, { component: 'page', action: 'execution' });
      showError('Failed to cancel invitation');
    } finally {
      setCancellingInvitationId(null);
    }
  };

  const fetchActiveSessions = useCallback(async () => {
    try {
      setIsLoadingSessions(true);
      logger.info('Fetching active sessions...', { component: 'page' });
      const response = await fetch('/api/user/sessions');
      const result = await response.json();
      logger.info('Sessions API response:', { component: 'page', data: result });

      if (result.success) {
        logger.info('Setting active sessions:', { component: 'page', data: result.sessions });
        setActiveSessions(result.sessions);
      } else {
        logger.error('Failed to load sessions:', undefined, { component: 'page', action: 'execution', details: result.error });
      }
    } catch (error) {
      logger.error('Error loading sessions:', error, { component: 'page', action: 'execution' });
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  // Fetch active sessions when security tab is active
  useEffect(() => {
    if (activeTab === 'security') {
      fetchActiveSessions();
    }
  }, [activeTab, fetchActiveSessions]);

  const handleRevokeSession = async () => {
    if (!sessionToRevoke) return;

    try {
      const response = await csrfFetch(`/api/user/sessions/${sessionToRevoke}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        // Remove the session from the list
        setActiveSessions(activeSessions.filter(s => s.id !== sessionToRevoke));
        setShowRevokeSessionModal(false);
        setSessionToRevoke(null);
      } else {
        showError('Failed to revoke session');
      }
    } catch (error) {
      logger.error('Error revoking session:', error, { component: 'page', action: 'execution' });
      showError('Failed to revoke session');
    }
  };



  const handleRequestPasswordReset = async () => {
    if (!user?.email) return;
    setIsRequestingReset(true);

    const supabase = createClient();

    try {
      // SECURITY: Only allow password reset for current user's email
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        logger.error('Password reset error:', error, { component: 'page', action: 'execution' });
        showError('Failed to send password reset email. Please try again.');
      } else {
        setResetEmailSent(true);
      }
    } catch (error) {
      logger.error('Password reset error:', error, { component: 'page', action: 'execution' });
      showError('Failed to send password reset email. Please try again.');
    } finally {
      setIsRequestingReset(false);
    }
  };

  const tabs = [
    { id: 'profile' as SettingsTab, name: 'Profile & Spaces', icon: User, description: 'Manage your personal information and spaces' },
    { id: 'subscription' as SettingsTab, name: 'Subscription', icon: Crown, description: 'Manage your plan and billing' },
    { id: 'security' as SettingsTab, name: 'Security', icon: Shield, description: 'Password and authentication' },
    { id: 'notifications' as SettingsTab, name: 'Notifications', icon: Bell, description: 'Email and in-app notification preferences' },
    { id: 'privacy-data' as SettingsTab, name: 'Privacy & Compliance', icon: Eye, description: 'Privacy settings and compliance' },
    { id: 'data-management' as SettingsTab, name: 'Data Management', icon: Database, description: 'Storage usage and file management' },
    { id: 'integrations' as SettingsTab, name: 'Integrations', icon: Link2, description: 'Connect external calendars' },
    { id: 'documentation' as SettingsTab, name: 'Feature Manuals', icon: BookOpen, description: 'Browse our guides and tutorials' },
    { id: 'analytics' as SettingsTab, name: 'Analytics', icon: BarChart3, description: 'Track productivity trends' },
  ];

  if (!spaceId || !user) {
    return <SpacesLoadingState />;
  }

  return (
    <FeatureLayout breadcrumbItems={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Settings' }]}>
      <div className="min-h-screen p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-4 sm:mb-8">
            <div className="flex items-center gap-3 sm:gap-4 mb-2">
              <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg">
                <Settings className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-br from-purple-600 to-blue-600 bg-clip-text text-transparent">Settings</h1>
                <p className="text-sm sm:text-base text-gray-400 mt-1">Manage your account and preferences</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Sidebar Navigation */}
            <div className="lg:col-span-1">
              <div className="bg-gray-800/80 border border-gray-700/50 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-lg">
                {/* Mobile: Horizontal scrolling tabs */}
                <nav className="lg:space-y-1 flex lg:flex-col overflow-x-auto lg:overflow-x-visible -mx-3 px-3 lg:mx-0 lg:px-0 pb-2 lg:pb-0 gap-2 lg:gap-0">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className="btn-touch relative flex-shrink-0 lg:w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-colors active:scale-95"
                      >
                        {isActive && (
                          <motion.div
                            layoutId="settings-tab-indicator"
                            className="absolute inset-0 bg-purple-600 rounded-lg sm:rounded-xl shadow-lg"
                            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                          />
                        )}
                        <span className={`relative z-10 flex items-center gap-2 sm:gap-3 ${
                          isActive ? 'text-white' : 'text-gray-300 hover:text-white'
                        }`}>
                          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                          <span className="text-xs sm:text-sm font-medium whitespace-nowrap">{tab.name}</span>
                        </span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>

            {/* Content Area */}
            <div className="lg:col-span-3">
              <div className="bg-gray-800/80 border border-gray-700/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-lg">
                <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                >
                {/* Profile Tab */}
                {activeTab === 'profile' && (
                  <div className="space-y-6 sm:space-y-8">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-purple-900/40 flex items-center justify-center flex-shrink-0">
                        <User className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-white">Profile & Spaces</h2>
                        <p className="text-sm sm:text-base text-gray-400">Update your personal information and manage your spaces</p>
                      </div>
                    </div>

                    {/* Avatar Upload */}
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                      <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0">
                        {profileImage ? (
                          <Image
                            src={profileImage}
                            alt="Profile"
                            fill
                            sizes="(max-width: 640px) 80px, 96px"
                            className="rounded-full object-cover shadow-xl"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-2xl sm:text-3xl font-bold shadow-xl">
                            {profileData.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <button
                          onClick={() => profileImageInputRef.current?.click()}
                          className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white hover:bg-purple-700 transition-colors shadow-md"
                          aria-label="Change profile picture"
                        >
                          <Camera className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-center sm:text-left">
                        <h3 className="text-base sm:text-lg font-semibold text-white">{profileData.name}</h3>
                        <p className="text-xs sm:text-sm text-gray-400">{profileData.email}</p>
                        <button
                          onClick={() => profileImageInputRef.current?.click()}
                          className="btn-touch mt-2 text-xs sm:text-sm text-purple-400 hover:underline transition-all active:scale-95 hover:text-purple-300"
                        >
                          Change profile picture
                        </button>
                        <p className="text-xs text-gray-500 mt-1">
                          Max 2MB • JPG, PNG, WebP • 100-2000px
                        </p>
                      </div>
                    </div>

                    {/* Hidden File Input */}
                    <input
                      ref={profileImageInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp"
                      onChange={handleProfileImageChange}
                      className="hidden"
                    />

                    {/* Form Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      <div>
                        <label htmlFor="field-1" className="block text-xs sm:text-sm font-medium text-gray-300 mb-2 cursor-pointer">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={profileData.name}
                          id="field-1"
              onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                          className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base bg-gray-900 border border-gray-600 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white transition-all"
                        />
                      </div>

                      <div>
                        <label htmlFor="field-2" className="block text-xs sm:text-sm font-medium text-gray-300 mb-2 cursor-pointer">
                          Email Address
                        </label>
                        <input
                          type="email"
                          inputMode="email"
                          value={profileData.email}
                          id="field-2"
              onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                          className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base bg-gray-900 border border-gray-600 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white transition-all"
                        />
                      </div>


                    </div>

                    {/* Spaces Management Section */}
                    <div className="border-t border-gray-700 pt-6 sm:pt-8">
                      <h3 className="text-lg sm:text-xl font-bold text-white mb-4">Your Spaces</h3>

                      {/* Switch Space - Only show when user has multiple spaces */}
                      {spaces && spaces.length > 1 && (
                        <div className="mb-6">
                          <h4 className="text-base font-semibold text-white mb-3">Switch Space</h4>
                          <div className="space-y-3">
                            {spaces.map((space) => (
                              <div
                                key={space.id}
                                className={`btn-touch p-4 rounded-xl border transition-all cursor-pointer active:scale-95 ${
                                  currentSpace?.id === space.id
                                    ? 'bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-800 shadow-lg hover:shadow-xl'
                                    : 'bg-gray-900/50 border-gray-700 hover:border-purple-800 hover:shadow-md hover:scale-105'
                                }`}
                                onClick={() => switchSpace(space)}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold">
                                      {space.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium text-white">{space.name}</p>
                                      <p className="text-xs text-gray-400">
                                        {space.role === 'owner' ? 'Owner' : 'Member'}
                                        {currentSpace?.id === space.id && ' • Active'}
                                      </p>
                                    </div>
                                  </div>
                                  {currentSpace?.id === space.id && (
                                    <Check className="w-5 h-5 text-purple-400" />
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Current Space Actions */}
                      {currentSpace && (
                        <div className="mb-6 p-4 bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-800 rounded-xl">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold">
                                {currentSpace.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <h4 className="text-base font-semibold text-white">
                                  {!isRenamingSpace ? currentSpace.name : 'Renaming...'}
                                </h4>
                                <p className="text-xs text-gray-400">
                                  Current Space
                                </p>
                              </div>
                            </div>
                            {!isRenamingSpace && (
                              <Edit
                                className="w-5 h-5 text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
                                onClick={() => {
                                  setIsRenamingSpace(true);
                                  setNewSpaceNameEdit(currentSpace.name);
                                }}
                              />
                            )}
                          </div>

                          {isRenamingSpace ? (
                            <div className="space-y-3">
                              <div>
                                <input
                                  type="text"
                                  value={newSpaceNameEdit}
                                  onChange={(e) => setNewSpaceNameEdit(e.target.value)}
                                  placeholder="Enter new space name"
                                  className="w-full px-3 py-2 text-sm bg-gray-800 border border-purple-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white"
                                  autoFocus
                                />
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={handleRenameSpace}
                                  disabled={isSavingSpaceName || !newSpaceNameEdit.trim()}
                                  className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {isSavingSpaceName ? (
                                    <>
                                      <Loader2 className="w-3 h-3 animate-spin" />
                                      Saving...
                                    </>
                                  ) : (
                                    <>
                                      <Save className="w-3 h-3" />
                                      Save
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => {
                                    setIsRenamingSpace(false);
                                    setNewSpaceNameEdit('');
                                  }}
                                  disabled={isSavingSpaceName}
                                  className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors text-sm disabled:opacity-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-2 flex-wrap">
                              {/* Only owners and admins can invite members */}
                              {(currentSpace?.role === 'owner' || currentSpace?.role === 'admin') && (
                                <button
                                  onClick={() => setShowInviteModal(true)}
                                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm flex items-center gap-2 hover:shadow-lg"
                                >
                                  <UserPlus className="w-4 h-4" />
                                  Invite Members
                                </button>
                              )}
                              {/* Owners and admins can delete spaces */}
                              {(currentSpace?.role === 'owner' || currentSpace?.role === 'admin') && (
                                <button
                                  onClick={() => setShowDeleteSpaceModal(true)}
                                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm flex items-center gap-2 hover:shadow-lg"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete Space
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Pending Invitations - Only visible to owners and admins */}
                      {spaceId && (currentSpace?.role === 'owner' || currentSpace?.role === 'admin') && (
                        <div className="mb-6 p-4 bg-gray-900/50 border border-gray-700 rounded-xl">
                          <h4 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
                            <Mail className="w-4 h-4 text-purple-600" />
                            Pending Invitations
                            {pendingInvitations.length > 0 && (
                              <span className="px-2 py-0.5 bg-purple-900/30 text-purple-400 text-xs rounded-full">
                                {pendingInvitations.length}
                              </span>
                            )}
                          </h4>

                          {isLoadingInvitations ? (
                            <div className="flex items-center gap-2 text-gray-400 py-4">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span className="text-sm">Loading invitations...</span>
                            </div>
                          ) : pendingInvitations.length === 0 ? (
                            <p className="text-sm text-gray-400 py-2">
                              No pending invitations. Use the button above to invite members.
                            </p>
                          ) : (
                            <div className="space-y-3 mt-3">
                              {pendingInvitations.map((invitation) => {
                                const expiresAt = new Date(invitation.expires_at);
                                const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

                                return (
                                  <div
                                    key={invitation.id}
                                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-gray-800 border border-gray-700 rounded-lg"
                                  >
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-white truncate">
                                        {invitation.email}
                                      </p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs px-2 py-0.5 bg-gray-700 text-gray-400 rounded">
                                          {invitation.role}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                          Expires in {daysLeft} {daysLeft === 1 ? 'day' : 'days'}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      {/* Copy URL Button */}
                                      <button
                                        onClick={() => handleCopyInvitationUrl(invitation.id, invitation.invitation_url)}
                                        className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-900/20 rounded-lg transition-colors"
                                        title="Copy invitation link"
                                      >
                                        {copiedInvitationId === invitation.id ? (
                                          <Check className="w-4 h-4 text-green-600" />
                                        ) : (
                                          <Copy className="w-4 h-4" />
                                        )}
                                      </button>

                                      {/* Resend Button */}
                                      <button
                                        onClick={() => handleResendInvitation(invitation.id)}
                                        disabled={resendingInvitationId === invitation.id}
                                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-50"
                                        title="Resend invitation"
                                      >
                                        {resendingInvitationId === invitation.id ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <Mail className="w-4 h-4" />
                                        )}
                                      </button>

                                      {/* Cancel Button */}
                                      <button
                                        onClick={() => handleCancelInvitation(invitation.id)}
                                        disabled={cancellingInvitationId === invitation.id}
                                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                                        title="Cancel invitation"
                                      >
                                        {cancellingInvitationId === invitation.id ? (
                                          <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                          <X className="w-4 h-4" />
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Space Members */}
                      {spaceId && (currentSpace?.role === 'owner' || spaceMembers.some(m => m.isCurrentUser && m.role === 'Admin')) && (
                        <div className="mb-6 p-4 bg-gray-900/50 border border-gray-700 rounded-xl">
                          <h4 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
                            <Users className="w-4 h-4 text-purple-600" />
                            Space Members
                            {spaceMembers.length > 0 && (
                              <span className="px-2 py-0.5 bg-purple-900/30 text-purple-400 text-xs rounded-full">
                                {spaceMembers.length}
                              </span>
                            )}
                          </h4>

                          {isLoadingMembers ? (
                            <div className="flex items-center gap-2 text-gray-400 py-4">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span className="text-sm">Loading members...</span>
                            </div>
                          ) : spaceMembers.length === 0 ? (
                            <p className="text-sm text-gray-400 py-2">
                              No members yet. Invite someone to join your space!
                            </p>
                          ) : (
                            <div className="space-y-3 mt-3">
                              {spaceMembers.map((member) => (
                                <div
                                  key={member.id}
                                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border transition-all ${
                                    member.isCurrentUser
                                      ? 'bg-purple-900/20 border-purple-800'
                                      : 'bg-gray-800 border-gray-700'
                                  }`}
                                >
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 ${
                                      member.color_theme === 'blue' ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
                                      member.color_theme === 'green' ? 'bg-gradient-to-br from-green-500 to-green-600' :
                                      member.color_theme === 'pink' ? 'bg-gradient-to-br from-pink-500 to-pink-600' :
                                      member.color_theme === 'orange' ? 'bg-gradient-to-br from-orange-500 to-orange-600' :
                                      member.color_theme === 'teal' ? 'bg-gradient-to-br from-teal-500 to-teal-600' :
                                      'bg-gradient-to-br from-purple-500 to-purple-600'
                                    }`}>
                                      {member.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-white truncate flex items-center gap-2">
                                        {member.name}
                                        {member.isCurrentUser && (
                                          <span className="text-xs px-1.5 py-0.5 bg-purple-900/30 text-purple-400 rounded">
                                            You
                                          </span>
                                        )}
                                        {member.role === 'Admin' && (
                                          <Crown className="w-3.5 h-3.5 text-amber-500" />
                                        )}
                                      </p>
                                      <p className="text-xs text-gray-400 truncate">
                                        {member.email}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Role and Actions */}
                                  <div className="flex items-center gap-2">
                                    {/* Role selector - only for non-owners and not current user */}
                                    {!member.isCurrentUser && member.role !== 'Admin' && currentSpace?.role === 'owner' && (
                                      <>
                                        <select
                                          value={member.role}
                                          onChange={(e) => handleUpdateMemberRole(member.id, e.target.value as UserRole)}
                                          disabled={isUpdatingRole === member.id}
                                          className="text-xs px-2 py-1 bg-gray-700 border border-gray-600 rounded-lg text-gray-300 focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                                        >
                                          <option value="Member">Member</option>
                                          <option value="Admin">Admin</option>
                                        </select>
                                        {isUpdatingRole === member.id && (
                                          <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                                        )}
                                      </>
                                    )}

                                    {/* Static role badge for owners or when not editable */}
                                    {(member.role === 'Admin' || member.isCurrentUser || currentSpace?.role !== 'owner') && (
                                      <span className={`text-xs px-2 py-1 rounded ${
                                        member.role === 'Admin'
                                          ? 'bg-amber-900/30 text-amber-400'
                                          : 'bg-gray-700 text-gray-400'
                                      }`}>
                                        {member.role}
                                      </span>
                                    )}

                                    {/* Remove member button */}
                                    {!member.isCurrentUser && member.role !== 'Admin' && currentSpace?.role === 'owner' && (
                                      <button
                                        onClick={() => handleRemoveMember(member.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-900/20 rounded-lg transition-colors"
                                        title="Remove member"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Create New Space */}
                      <div className="mb-6 p-4 bg-gray-900/50 border border-gray-700 rounded-xl">
                        <h4 className="text-base font-semibold text-white mb-2">Create New Space</h4>
                        <p className="text-sm text-gray-400 mb-3">
                          Start a new space for work or a different purpose
                          {maxSpaces !== Infinity && (
                            <span className="ml-2 text-xs text-gray-500">
                              ({ownedSpacesCount}/{maxSpaces} spaces used)
                            </span>
                          )}
                        </p>
                        <button
                          onClick={() => {
                            // Check if user has reached their space limit
                            if (promptSpaceUpgrade(ownedSpacesCount)) {
                              setShowCreateSpaceModal(true);
                            }
                          }}
                          className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-lg transition-all text-sm flex items-center gap-2 shadow-lg shadow-teal-500/25 hover:shadow-xl"
                        >
                          <UserPlus className="w-4 h-4" />
                          New Space
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleSaveProfile}
                        disabled={isSavingProfile || showSaveSuccess}
                        className={`w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base text-white rounded-lg sm:rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                          showSaveSuccess ? 'bg-green-600' : 'bg-purple-600 hover:bg-purple-700'
                        }`}
                      >
                        <AnimatePresence mode="wait">
                          {isSavingProfile ? (
                            <motion.span
                              key="saving"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="flex items-center gap-2"
                            >
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Saving...
                            </motion.span>
                          ) : showSaveSuccess ? (
                            <motion.span
                              key="success"
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                              className="flex items-center gap-2"
                            >
                              <motion.div
                                initial={{ scale: 0, rotate: -90 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 15, delay: 0.1 }}
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </motion.div>
                              Saved!
                            </motion.span>
                          ) : (
                            <motion.span
                              key="default"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="flex items-center gap-2"
                            >
                              <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                              Save Changes
                            </motion.span>
                          )}
                        </AnimatePresence>
                      </button>
                    </div>
                  </div>
                )}

                {/* Subscription Tab */}
                {activeTab === 'subscription' && <SubscriptionSettings />}

                {/* Security Tab */}
                {activeTab === 'security' && (
                  <div className="space-y-6 sm:space-y-8">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-purple-900/40 flex items-center justify-center flex-shrink-0">
                        <Shield className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-white">Security Settings</h2>
                        <p className="text-sm sm:text-base text-gray-400">Manage your password and authentication methods</p>
                      </div>
                    </div>

                    {/* Password Reset */}
                    <div className="bg-gray-900/50 border border-gray-700 rounded-lg sm:rounded-xl p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                          <Key className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
                        </div>
                        <div className="flex-1 w-full">
                          <h3 className="text-base sm:text-lg font-semibold text-white mb-1">Reset Password</h3>
                          <p className="text-xs sm:text-sm text-gray-400 mb-3 sm:mb-4">
                            We&apos;ll send you an email with a secure link to reset your password
                          </p>

                          {resetEmailSent ? (
                            <div className="p-4 bg-green-900/20 border border-green-800 rounded-lg mb-3">
                              <div className="flex items-start gap-2">
                                <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-sm font-medium text-green-200">Password reset email sent!</p>
                                  <p className="text-xs text-green-300 mt-1">
                                    Check your inbox at <span className="font-semibold">{user?.email}</span> for instructions to reset your password.
                                  </p>
                                  <p className="text-xs text-green-400 mt-2">
                                    Didn&apos;t receive it? Check your spam folder or{' '}
                                    <button
                                      onClick={() => {
                                        setResetEmailSent(false);
                                        handleRequestPasswordReset();
                                      }}
                                      className="btn-touch underline hover:no-underline font-medium transition-all active:scale-95 text-green-400 hover:text-green-300"
                                    >
                                      resend the email
                                    </button>
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="p-3 bg-blue-900/20 border border-blue-800 rounded-lg mb-4">
                                <p className="text-xs text-blue-300">
                                  <strong>Reset link will be sent to:</strong> {user?.email}
                                </p>
                                <p className="text-xs text-blue-400 mt-1">
                                  For security, password reset is only allowed for your current email address.
                                </p>
                              </div>
                              <button
                                onClick={handleRequestPasswordReset}
                                disabled={isRequestingReset}
                                className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-purple-600 text-white rounded-lg sm:rounded-xl hover:bg-purple-700 transition-colors shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                              >
                                {isRequestingReset ? (
                                  <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Sending...
                                  </>
                                ) : (
                                  <>
                                    <Mail className="w-4 h-4" />
                                    Send Reset Email
                                  </>
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Change Password */}
                    <ChangePasswordForm />

                    {/* Two-Factor Authentication */}
                    <TwoFactorAuth />

                    {/* Active Sessions */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-white">Active Sessions</h3>
                          <p className="text-sm text-gray-400">Sessions are automatically tracked when you sign in</p>
                        </div>
                        <button
                          onClick={fetchActiveSessions}
                          className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                        >
                          Refresh
                        </button>
                      </div>
                      {isLoadingSessions ? (
                        <div className="space-y-3">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-20 bg-gray-900/50 border border-gray-700 rounded-xl animate-pulse" />
                          ))}
                        </div>
                      ) : activeSessions.length === 0 ? (
                        <div className="p-6 bg-gray-900/50 border border-gray-700 rounded-xl text-center">
                          <p className="text-sm text-gray-400">No active sessions found</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {activeSessions.map((session) => (
                            <div key={session.id} className="flex items-center justify-between p-4 bg-gray-900/50 border border-gray-700 rounded-xl">
                              <div className="flex items-center gap-3">
                                <Monitor className="w-5 h-5 text-gray-400" />
                                <div>
                                  <p className="text-sm font-medium text-white">{session.device}</p>
                                  <p className="text-xs text-gray-400">{session.location} • {session.lastActive}</p>
                                </div>
                              </div>
                              {session.isCurrent ? (
                                <span className="text-xs text-green-400 font-medium">Current</span>
                              ) : (
                                <button
                                  onClick={() => {
                                    setSessionToRevoke(session.id);
                                    setShowRevokeSessionModal(true);
                                  }}
                                  className="text-xs text-red-400 hover:text-red-300 transition-colors"
                                >
                                  Revoke
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}



                {/* Notifications Tab */}
                {activeTab === 'notifications' && <NotificationSettings />}

                {/* Privacy & Data Tab */}
                {activeTab === 'privacy-data' && <PrivacyDataManager />}

                {/* Data Management Tab */}
                {activeTab === 'data-management' && <DataManagementTab />}

                {/* Integrations Tab */}
                {activeTab === 'integrations' && <CalendarConnections />}

                {/* Analytics Tab */}
                {activeTab === 'analytics' && (
                  <div className="space-y-6 sm:space-y-8">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-purple-900/40 flex items-center justify-center flex-shrink-0">
                        <BarChart3 className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-white">Analytics & Insights</h2>
                        <p className="text-sm sm:text-base text-gray-400">View your productivity trends and completion rates across all features</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                      {[
                        {
                          id: 'tasks',
                          name: 'Tasks & Chores',
                          icon: CheckSquare,
                          href: '/settings/analytics/tasks',
                          gradient: 'from-blue-500 to-blue-600',
                          textColor: 'text-blue-400',
                          shadowColor: 'hover:shadow-blue-900/50',
                          description: 'Track task completion and productivity'
                        },
                        {
                          id: 'calendar',
                          name: 'Calendar & Events',
                          icon: Calendar,
                          href: '/settings/analytics/calendar',
                          gradient: 'from-purple-500 to-purple-600',
                          textColor: 'text-purple-400',
                          shadowColor: 'hover:shadow-purple-900/50',
                          description: 'Monitor event attendance and planning'
                        },
                        {
                          id: 'reminders',
                          name: 'Reminders',
                          icon: Bell,
                          href: '/settings/analytics/reminders',
                          gradient: 'from-pink-500 to-pink-600',
                          textColor: 'text-pink-400',
                          shadowColor: 'hover:shadow-pink-900/50',
                          description: 'Analyze reminder effectiveness'
                        },
                        {
                          id: 'messages',
                          name: 'Messages',
                          icon: MessageSquare,
                          href: '/settings/analytics/messages',
                          gradient: 'from-green-500 to-green-600',
                          textColor: 'text-green-400',
                          shadowColor: 'hover:shadow-green-900/50',
                          description: 'View messaging trends and activity'
                        },
                        {
                          id: 'shopping',
                          name: 'Shopping Lists',
                          icon: ShoppingCart,
                          href: '/settings/analytics/shopping',
                          gradient: 'from-emerald-500 to-emerald-600',
                          textColor: 'text-emerald-400',
                          shadowColor: 'hover:shadow-emerald-900/50',
                          description: 'Track shopping habits and savings'
                        },
                        {
                          id: 'meals',
                          name: 'Meal Planning',
                          icon: UtensilsCrossed,
                          href: '/settings/analytics/meals',
                          gradient: 'from-orange-500 to-orange-600',
                          textColor: 'text-orange-400',
                          shadowColor: 'hover:shadow-orange-900/50',
                          description: 'Review meal planning patterns'
                        },
                        {
                          id: 'budget',
                          name: 'Budget Tracking',
                          icon: DollarSign,
                          href: '/settings/analytics/budget',
                          gradient: 'from-amber-500 to-amber-600',
                          textColor: 'text-amber-400',
                          shadowColor: 'hover:shadow-amber-900/50',
                          description: 'Monitor spending and budgets'
                        },
                        {
                          id: 'goals',
                          name: 'Goals & Milestones',
                          icon: Target,
                          href: '/settings/analytics/goals',
                          gradient: 'from-indigo-500 to-indigo-600',
                          textColor: 'text-indigo-400',
                          shadowColor: 'hover:shadow-indigo-900/50',
                          description: 'Track goal progress and achievements'
                        },
                      ].map((feature) => {
                        const Icon = feature.icon;
                        return (
                          <Link
                            key={feature.id}
                            href={feature.href}
                            className={`btn-touch bg-gray-800/80 border border-gray-700/50 rounded-xl p-6 hover:shadow-xl hover:-translate-y-2 ${feature.shadowColor} transition-all duration-300 group active:scale-95`}
                          >
                            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 shadow-lg`}>
                              <Icon className="w-7 h-7 text-white" />
                            </div>
                            <h3 className={`text-lg font-semibold ${feature.textColor} mb-2 transition-all`}>
                              {feature.name}
                            </h3>
                            <p className="text-sm text-gray-400 mb-4">
                              {feature.description}
                            </p>
                            <div className={`flex items-center text-sm font-medium ${feature.textColor}`}>
                              View Analytics
                              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Data & Storage Tab - DISABLED: Consolidated into Privacy & Data tab */}
                {false && (
                  <div className="space-y-6 sm:space-y-8">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Data & Storage</h2>
                      <p className="text-sm sm:text-base text-gray-400">Export your data or delete your account</p>
                    </div>

                    {/* Export Data - GDPR Compliant */}
                    <div className="p-4 sm:p-6 bg-blue-900/20 border border-blue-800 rounded-lg sm:rounded-xl">
                      <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-blue-900/30 flex items-center justify-center">
                          <Download className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" />
                        </div>
                        <div className="flex-1 w-full">
                          <h3 className="text-base sm:text-lg font-semibold text-white mb-1">Export Your Data</h3>
                          <p className="text-xs sm:text-sm text-gray-400 mb-3 sm:mb-4">
                            Download a complete copy of all your data in JSON format. This includes expenses, budgets, tasks, messages, and more.
                          </p>
                          <p className="text-xs text-blue-300 mb-4 bg-blue-900/40 p-3 rounded-lg">
                            <strong>GDPR Compliance:</strong> This export fulfills your Right to Data Portability (Article 20).
                            The download starts immediately and includes all personal data we hold about you.
                          </p>
                          <button
                            onClick={async () => {
                              try {
                                const response = await fetch('/api/user/export-data');
                                if (!response.ok) throw new Error('Export failed');

                                const blob = await response.blob();
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `rowan-data-export-${new Date().toISOString().split('T')[0]}.json`;
                                document.body.appendChild(a);
                                a.click();
                                window.URL.revokeObjectURL(url);
                                document.body.removeChild(a);
                              } catch {
                                showError('Failed to export data. Please try again.');
                              }
                            }}
                            className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-blue-600 text-white rounded-lg sm:rounded-xl hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                          >
                            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            Download My Data (JSON)
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Delete Account - GDPR Compliant */}
                    <div className="p-4 sm:p-6 bg-red-900/20 border border-red-800 rounded-lg sm:rounded-xl">
                      <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-red-900/30 flex items-center justify-center">
                          <Trash2 className="w-5 h-5 sm:w-6 sm:h-6 text-red-400" />
                        </div>
                        <div className="flex-1 w-full">
                          <h3 className="text-base sm:text-lg font-semibold text-white mb-1">Delete Account</h3>
                          <p className="text-xs sm:text-sm text-gray-400 mb-3 sm:mb-4">
                            Permanently delete your account with a 30-day grace period. You can cancel anytime within 30 days.
                          </p>
                          <p className="text-xs text-red-300 mb-4 bg-red-900/40 p-3 rounded-lg">
                            <strong>GDPR Compliance:</strong> This fulfills your Right to Erasure (Article 17).
                            All personal data will be deleted after a 30-day grace period with email notifications.
                          </p>
                          <button
                            onClick={() => setShowDeleteAccountModal(true)}
                            className="btn-touch w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-red-600 text-white rounded-lg sm:rounded-xl hover:bg-red-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 active:scale-95 shimmer-red"
                          >
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            Delete My Account
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Sign Out */}
                    <div className="p-4 sm:p-6 bg-gray-900/50 border border-gray-700 rounded-lg sm:rounded-xl">
                      <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gray-800 flex items-center justify-center">
                          <LogOut className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                        </div>
                        <div className="flex-1 w-full">
                          <h3 className="text-base sm:text-lg font-semibold text-white mb-1">Sign Out</h3>
                          <p className="text-xs sm:text-sm text-gray-400 mb-3 sm:mb-4">Sign out from all devices and sessions</p>
                          <button className="btn-touch w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-white text-gray-900 rounded-full hover:opacity-90 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 active:scale-95 shimmer-gray">
                            <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            Sign Out Everywhere
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Feature Manuals Tab - Direct Feature Cards */}
                {activeTab === 'documentation' && (
                  <div className="space-y-6 sm:space-y-8">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-purple-900/40 flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-white">Feature Manuals</h2>
                        <p className="text-sm sm:text-base text-gray-400">Choose a feature to learn about. Comprehensive guides for all Rowan features.</p>
                      </div>
                    </div>

                    {/* Search Bar */}
                    <div className="relative max-w-xl">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                      <input
                        type="text"
                        placeholder="Search feature manuals... (e.g., 'expenses', 'billing', 'meal planning')"
                        value={docSearchQuery}
                        onChange={(e) => setDocSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 rounded-xl border-2 border-gray-700 bg-gray-800 text-white placeholder-gray-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-500/20 transition-colors"
                      />
                      {docSearchQuery && (
                        <button
                          onClick={() => setDocSearchQuery('')}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>

                    {/* Features Grid - Optimized for 14 cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
                      {documentationFeatures
                        .filter((feature) => {
                          if (!docSearchQuery.trim()) return true;
                          const query = docSearchQuery.toLowerCase().trim();
                          // Check name and description
                          if (feature.name.toLowerCase().includes(query)) return true;
                          if (feature.description.toLowerCase().includes(query)) return true;
                          // Check keywords
                          const keywords = documentationSearchKeywords[feature.id] || [];
                          return keywords.some(keyword => keyword.toLowerCase().includes(query) || query.includes(keyword.toLowerCase()));
                        })
                        .map((feature) => {
                        const Icon = feature.icon;
                        const isAvailable = feature.available;

                        if (isAvailable) {
                          return (
                            <Link
                              key={feature.id}
                              href={feature.href}
                              className={`btn-touch group relative p-6 bg-gray-800/80 border-2 border-gray-700/60 ${feature.hoverBorder} ${feature.hoverShadow} rounded-2xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 hover:scale-105 active:scale-95`}
                            >
                              <div className={`w-14 h-14 rounded-xl bg-gradient-to-r ${feature.color} flex items-center justify-center mb-4 shadow-lg`}>
                                <Icon className="w-7 h-7 text-white" />
                              </div>
                              <h3 className="text-xl font-bold text-white mb-3 group-hover:text-purple-400 transition-colors">
                                {feature.name}
                              </h3>
                              <p className="text-sm text-gray-400 leading-relaxed mb-4">
                                {feature.description}
                              </p>
                              <div className="flex items-center text-sm font-semibold text-purple-400">
                                Read guides
                                <span className="ml-2 group-hover:translate-x-2 transition-transform duration-300">→</span>
                              </div>
                            </Link>
                          );
                        } else {
                          return (
                            <div
                              key={feature.id}
                              className="relative p-6 bg-gray-900/50 border border-gray-700/50 rounded-2xl opacity-60"
                            >
                              <div className={`w-14 h-14 rounded-xl bg-gradient-to-r ${feature.color} opacity-50 flex items-center justify-center mb-4`}>
                                <Icon className="w-7 h-7 text-white" />
                              </div>
                              <h3 className="text-xl font-bold text-white mb-3">
                                {feature.name}
                              </h3>
                              <p className="text-sm text-gray-400 leading-relaxed mb-4">
                                {feature.description}
                              </p>
                              <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-700 text-gray-400">
                                Coming Soon
                              </div>
                            </div>
                          );
                        }
                      })}
                    </div>

                  </div>
                )}

                </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links - Mobile Only (footer links are hidden on mobile) */}
      <div className="md:hidden px-4 pb-6">
        <div className="bg-gray-800/80 border border-gray-700/50 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            Quick Links
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/legal"
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              Legal
            </Link>
            <Link
              href="/settings/documentation"
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              Documentation
            </Link>
            <Link
              href="/privacy"
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              Terms
            </Link>
            <Link
              href="/security"
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              Security
            </Link>
            <Link
              href="/feedback"
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            >
              Feedback
            </Link>
          </div>
        </div>
      </div>

      {/* Space Management Modals */}
      <CreateSpaceModal
        isOpen={showCreateSpaceModal}
        onClose={() => setShowCreateSpaceModal(false)}
        onSpaceCreated={() => {
          refreshSpaces();
          setShowCreateSpaceModal(false);
        }}
      />

      {spaceId && currentSpace && (
        <InvitePartnerModal
          isOpen={showInviteModal}
          onClose={handleInviteModalClose}
          spaceId={spaceId}
          spaceName={currentSpace.name}
        />
      )}

      {/* Export Data Modal */}
      {user && (
        <ExportDataModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          userId={user.id}
        />
      )}

      {/* Delete Account Modal */}
      {showDeleteAccountModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800/95 rounded-2xl shadow-2xl border border-gray-700/50 max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-900/30 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Delete Account</h3>
              </div>
              <button onClick={() => setShowDeleteAccountModal(false)} className="text-gray-500 text-gray-400 hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
                <p className="text-sm text-red-200 font-semibold">
                  Warning: This action cannot be undone
                </p>
                <p className="text-xs text-red-300 mt-1">
                  All your data will be permanently deleted, including tasks, events, messages, and all other content.
                </p>
              </div>

              <div>
                <label htmlFor="field-15" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
                  Enter your password to confirm
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  id="field-15"
                  autoComplete="current-password"
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Your password"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent text-white"
                />
              </div>

              <div>
                <label htmlFor="field-16" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
                  Type DELETE to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  id="field-16"
              onChange={(e) =>  setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent text-white"
                />
              </div>

              <label htmlFor="field-17" className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteAcknowledged}
                  id="field-17"
              onChange={(e) =>  setDeleteAcknowledged(e.target.checked)}
                  className="mt-1 w-4 h-4 text-red-600 rounded focus:ring-red-500"
                />
                <span className="text-sm text-gray-300">
                  I understand this action is permanent and cannot be reversed
                </span>
              </label>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowDeleteAccountModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeletingAccount || !deletePassword || deleteConfirmText !== 'DELETE' || !deleteAcknowledged}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isDeletingAccount ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete Account'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Revoke Session Modal */}
      {showRevokeSessionModal && sessionToRevoke && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800/95 rounded-2xl shadow-2xl border border-gray-700/50 max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-900/30 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Revoke Session</h3>
              </div>
              <button onClick={() => setShowRevokeSessionModal(false)} className="text-gray-500 text-gray-400 hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-400 mb-6">
              Are you sure you want to revoke this session? The device will be logged out immediately.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRevokeSessionModal(false)}
                className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRevokeSession}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
              >
                Revoke Session
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Member Confirm Dialog */}
      <ConfirmDialog
        isOpen={showRemoveMemberConfirm}
        onClose={() => {
          setShowRemoveMemberConfirm(false);
          setMemberToRemove(null);
        }}
        onConfirm={confirmRemoveMember}
        title="Remove Member"
        message={`Are you sure you want to remove ${spaceMembers.find(m => m.id === memberToRemove)?.name} from this space? They will lose access to all shared content.`}
        confirmLabel="Remove"
        cancelLabel="Cancel"
        variant="danger"
      />

      {/* New GDPR Compliant Account Deletion Modal */}
      <AccountDeletionModal
        isOpen={showDeleteAccountModal}
        onClose={() => setShowDeleteAccountModal(false)}
      />

      {/* Create Space Modal */}
      <CreateSpaceModal
        isOpen={showCreateSpaceModal}
        onClose={() => setShowCreateSpaceModal(false)}
        onSpaceCreated={() => {
          refreshSpaces();
          setShowCreateSpaceModal(false);
        }}
      />

      {/* Invite Partner Modal */}
      {spaceId && (
        <InvitePartnerModal
          isOpen={showInviteModal}
          onClose={handleInviteModalClose}
          spaceId={spaceId}
          spaceName={currentSpace?.name || ''}
        />
      )}

      {/* Delete Space Modal */}
      {currentSpace && (
        <DeleteSpaceModal
          isOpen={showDeleteSpaceModal}
          onClose={() => setShowDeleteSpaceModal(false)}
          space={currentSpace}
          onSpaceDeleted={() => {
            setShowDeleteSpaceModal(false);
            refreshSpaces();
          }}
        />
      )}
    </FeatureLayout>
  );
}
