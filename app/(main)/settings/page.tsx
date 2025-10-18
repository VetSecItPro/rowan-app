'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { useAuth } from '@/lib/contexts/auth-context';
import { CreateSpaceModal } from '@/components/spaces/CreateSpaceModal';
import { InvitePartnerModal } from '@/components/spaces/InvitePartnerModal';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { PasswordConfirmModal } from '@/components/settings/PasswordConfirmModal';
import { AccountDeletionModal } from '@/components/settings/AccountDeletionModal';
import { ExportDataModal } from '@/components/settings/ExportDataModal';
import { TwoFactorAuth } from '@/components/settings/TwoFactorAuth';
import { Toggle } from '@/components/ui/Toggle';
import { createClient } from '@/lib/supabase/client';
import {
  Settings,
  User,
  Shield,
  Bell,
  Lock,
  Users,
  Database,
  HelpCircle,
  Save,
  Camera,
  Mail,
  Phone,
  Globe,
  Download,
  Trash2,
  LogOut,
  Key,
  Smartphone,
  X,
  UserPlus,
  Crown,
  Eye,
  AlertTriangle,
  Check,
  Copy,
  Monitor,
  ChevronDown,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  Calendar,
  CheckSquare,
  ShoppingCart,
  UtensilsCrossed,
  MessageSquare,
  DollarSign,
  Target,
  Clock,
  BookOpen,
  ShoppingBag,
  Home,
  Heart
} from 'lucide-react';

type SettingsTab = 'profile' | 'security' | 'notifications' | 'privacy' | 'documentation' | 'spaces' | 'analytics' | 'data' | 'help';
type UserRole = 'Admin' | 'Member' | 'Viewer';
type ExportStatus = 'idle' | 'pending' | 'processing' | 'ready';

interface SpaceMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
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

// Mock data for space members
const mockSpaceMembers: SpaceMember[] = [
  { id: '1', name: 'Alex Johnson', email: 'alex@example.com', role: 'Admin', isCurrentUser: true },
  { id: '2', name: 'Jordan Smith', email: 'jordan@example.com', role: 'Admin' },
  { id: '3', name: 'Taylor Brown', email: 'taylor@example.com', role: 'Member' },
  { id: '4', name: 'Casey Wilson', email: 'casey@example.com', role: 'Viewer' },
];

// Active sessions will be fetched from API

// Mock pending invitations
const mockPendingInvitations = [
  { email: 'newuser@example.com', role: 'Member', sentAt: '2 days ago' },
];

// Documentation features array
const documentationFeatures = [
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
  {
    id: 'household',
    name: 'Household Management',
    description: 'Manage chores, maintenance, and household tasks',
    icon: Home,
    color: 'from-amber-500 to-amber-600',
    hoverBorder: 'hover:border-amber-500',
    hoverShadow: 'hover:shadow-amber-500/50',
    href: '/settings/documentation/household',
    available: false,
  },
];

export default function SettingsPage() {
  const { user, currentSpace, spaces, switchSpace, refreshSpaces } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

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
    email: user?.email || '',
    phone: '',
    timezone: 'Pacific Time (PT)'
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Password reset state
  const [isRequestingReset, setIsRequestingReset] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  // Modal states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showManageMembersModal, setShowManageMembersModal] = useState(false);
  const [showLeaveSpaceModal, setShowLeaveSpaceModal] = useState(false);
  const [showCreateSpaceModal, setShowCreateSpaceModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [showRevokeSessionModal, setShowRevokeSessionModal] = useState(false);
  const [showRemoveMemberConfirm, setShowRemoveMemberConfirm] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);

  // Invite modal state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('Member');
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  // Space members state
  const [spaceMembers, setSpaceMembers] = useState<SpaceMember[]>(mockSpaceMembers);
  const [pendingInvitations, setPendingInvitations] = useState(mockPendingInvitations);

  // Create space state
  const [newSpaceName, setNewSpaceName] = useState('');
  const [isCreatingSpace, setIsCreatingSpace] = useState(false);

  // Export state
  const [exportStatus, setExportStatus] = useState<ExportStatus>('idle');

  // Delete account state
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteAcknowledged, setDeleteAcknowledged] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);


  // Active sessions state
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [sessionToRevoke, setSessionToRevoke] = useState<string | null>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  // Notification preferences state - Updated for comprehensive notification system
  const [notificationPrefs, setNotificationPrefs] = useState({
    // Email notifications
    email_task_assignments: true,
    email_event_reminders: true,
    email_new_messages: true,
    email_shopping_lists: true,
    email_meal_reminders: true,
    email_general_reminders: true,
    // Push notifications
    push_enabled: false,
    push_task_updates: true,
    push_reminders: true,
    push_messages: true,
    push_shopping_updates: true,
    push_event_alerts: true,
    // Digest settings
    digest_frequency: 'daily' as 'realtime' | 'daily' | 'weekly',
    digest_time: '08:00:00',
    // Quiet hours
    quiet_hours_enabled: false,
    quiet_hours_start: '22:00:00',
    quiet_hours_end: '07:00:00',
    timezone: 'UTC',
  });

  const [isLoadingPrefs, setIsLoadingPrefs] = useState(true);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);

  // Privacy toggles state
  const [privacySettings, setPrivacySettings] = useState({
    profileVisibility: true,
    activityStatus: true,
    readReceipts: true,
    analytics: true,
  });
  const [isLoadingPrivacy, setIsLoadingPrivacy] = useState(true);
  const [isSavingPrivacy, setIsSavingPrivacy] = useState(false);

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

      // Check image dimensions
      const img = new Image();
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
      alert(error);
    }

    // Reset input
    e.target.value = '';
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profileData.email)) {
      alert('Please enter a valid email address');
      setIsSavingProfile(false);
      return;
    }

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    setIsSavingProfile(false);
  };

  const handleSendInvite = async () => {
    if (!inviteEmail) {
      alert('Please enter an email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      alert('Please enter a valid email address');
      return;
    }

    setIsSendingInvite(true);
    await new Promise(resolve => setTimeout(resolve, 1000));

    setPendingInvitations([...pendingInvitations, { email: inviteEmail, role: inviteRole, sentAt: 'Just now' }]);

    setInviteEmail('');
    setInviteRole('Member');
    setIsSendingInvite(false);
    setShowInviteModal(false);
  };

  const handleUpdateMemberRole = async (memberId: string, newRole: UserRole) => {
    setSpaceMembers(spaceMembers.map(member =>
      member.id === memberId ? { ...member, role: newRole } : member
    ));
  };

  const handleRemoveMember = async (memberId: string) => {
    const member = spaceMembers.find(m => m.id === memberId);
    if (!member) return;

    if (member.isCurrentUser) {
      alert('You cannot remove yourself. Use "Leave Space" instead.');
      return;
    }

    const adminCount = spaceMembers.filter(m => m.role === 'Admin').length;
    if (member.role === 'Admin' && adminCount === 1) {
      alert('Cannot remove the last admin. Promote another member to admin first.');
      return;
    }

    setMemberToRemove(memberId);
    setShowRemoveMemberConfirm(true);
  };

  const confirmRemoveMember = async () => {
    if (!memberToRemove) return;
    setSpaceMembers(spaceMembers.filter(m => m.id !== memberToRemove));
    setShowRemoveMemberConfirm(false);
    setMemberToRemove(null);
  };

  const handleLeaveSpace = async () => {
    const adminCount = spaceMembers.filter(m => m.role === 'Admin').length;
    const currentUserMember = spaceMembers.find(m => m.isCurrentUser);

    if (currentUserMember?.role === 'Admin' && adminCount === 1) {
      alert('You are the last admin. Please promote another member to admin before leaving.');
      return;
    }

    setShowLeaveSpaceModal(false);
  };

  const handleCreateSpace = async () => {
    if (!newSpaceName.trim()) {
      alert('Please enter a space name');
      return;
    }

    setIsCreatingSpace(true);
    await new Promise(resolve => setTimeout(resolve, 1000));


    setNewSpaceName('');
    setIsCreatingSpace(false);
    setShowCreateSpaceModal(false);
  };

  const handleRequestExport = async () => {
    setExportStatus('pending');
    setShowExportModal(false);

    // Simulate processing
    setTimeout(() => {
      setExportStatus('processing');
    }, 2000);

    setTimeout(() => {
      setExportStatus('ready');
    }, 5000);
  };

  const handleDownloadExport = () => {
    setExportStatus('idle');
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      alert('Please enter your password');
      return;
    }

    if (deleteConfirmText !== 'DELETE') {
      alert('Please type DELETE to confirm');
      return;
    }

    if (!deleteAcknowledged) {
      alert('Please acknowledge that this action is permanent');
      return;
    }

    setIsDeletingAccount(true);
    await new Promise(resolve => setTimeout(resolve, 1500));


    setIsDeletingAccount(false);
    setShowDeleteAccountModal(false);
  };

  // Load notification preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const response = await fetch('/api/notifications/preferences');
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            setNotificationPrefs(prev => ({ ...prev, ...result.data }));
          }
        }
      } catch (error) {
        console.error('Failed to load notification preferences:', error);
      } finally {
        setIsLoadingPrefs(false);
      }
    };

    loadPreferences();
  }, []);

  const handleNotificationToggle = async (key: string) => {
    const newValue = !notificationPrefs[key as keyof typeof notificationPrefs];

    // Optimistically update UI
    setNotificationPrefs(prev => ({ ...prev, [key]: newValue }));
    setIsSavingPrefs(true);

    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: newValue }),
      });

      if (!response.ok) {
        // Revert on error
        setNotificationPrefs(prev => ({ ...prev, [key]: !newValue }));
        alert('Failed to update notification preferences');
      }
    } catch (error) {
      // Revert on error
      setNotificationPrefs(prev => ({ ...prev, [key]: !newValue }));
      console.error('Failed to update notification preferences:', error);
    } finally {
      setIsSavingPrefs(false);
    }
  };

  // Load privacy settings from API
  const loadPrivacySettings = async () => {
    try {
      setIsLoadingPrivacy(true);
      const response = await fetch('/api/user/privacy-settings');
      const result = await response.json();

      if (result.success) {
        setPrivacySettings(result.data);
      } else {
        console.error('Failed to load privacy settings:', result.error);
      }
    } catch (error) {
      console.error('Error loading privacy settings:', error);
    } finally {
      setIsLoadingPrivacy(false);
    }
  };

  // Save privacy settings to API
  const savePrivacySetting = async (key: string, value: boolean) => {
    try {
      setIsSavingPrivacy(true);
      const response = await fetch('/api/user/privacy-settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [key]: value }),
      });

      const result = await response.json();

      if (!result.success) {
        // Revert the change if it failed
        setPrivacySettings(prev => ({ ...prev, [key]: !value }));
        console.error('Failed to save privacy setting:', result.error);
      }
    } catch (error) {
      // Revert the change if it failed
      setPrivacySettings(prev => ({ ...prev, [key]: !value }));
      console.error('Error saving privacy setting:', error);
    } finally {
      setIsSavingPrivacy(false);
    }
  };

  const handlePrivacyToggle = (key: string) => {
    const newValue = !privacySettings[key as keyof typeof privacySettings];

    // Optimistically update the UI
    setPrivacySettings(prev => ({ ...prev, [key]: newValue }));

    // Save to API
    savePrivacySetting(key, newValue);
  };

  // Load privacy settings on mount
  useEffect(() => {
    loadPrivacySettings();
  }, []);

  // Fetch active sessions when security tab is active
  useEffect(() => {
    if (activeTab === 'security') {
      fetchActiveSessions();
    }
  }, [activeTab]);

  const fetchActiveSessions = async () => {
    try {
      setIsLoadingSessions(true);
      const response = await fetch('/api/user/sessions');
      const result = await response.json();

      if (result.success) {
        setActiveSessions(result.sessions);
      } else {
        console.error('Failed to load sessions:', result.error);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const handleRevokeSession = async () => {
    if (!sessionToRevoke) return;

    try {
      const response = await fetch(`/api/user/sessions/${sessionToRevoke}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        // Remove the session from the list
        setActiveSessions(activeSessions.filter(s => s.id !== sessionToRevoke));
        setShowRevokeSessionModal(false);
        setSessionToRevoke(null);
      } else {
        alert('Failed to revoke session');
      }
    } catch (error) {
      console.error('Error revoking session:', error);
      alert('Failed to revoke session');
    }
  };

  const handleRequestPasswordReset = async () => {
    if (!user?.email) return;
    setIsRequestingReset(true);

    const supabase = createClient();

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        console.error('Password reset error:', error);
        alert('Failed to send password reset email. Please try again.');
      } else {
        setResetEmailSent(true);
      }
    } catch (error) {
      console.error('Password reset error:', error);
      alert('Failed to send password reset email. Please try again.');
    } finally {
      setIsRequestingReset(false);
    }
  };

  const tabs = [
    { id: 'profile' as SettingsTab, name: 'Profile', icon: User, description: 'Manage your personal information' },
    { id: 'spaces' as SettingsTab, name: 'Spaces', icon: Users, description: 'Manage your spaces and members' },
    { id: 'security' as SettingsTab, name: 'Security', icon: Shield, description: 'Password and authentication' },
    { id: 'notifications' as SettingsTab, name: 'Notifications', icon: Bell, description: 'Email and push notifications' },
    { id: 'privacy' as SettingsTab, name: 'Privacy', icon: Lock, description: 'Data and visibility settings' },
    { id: 'documentation' as SettingsTab, name: 'Documentation', icon: BookOpen, description: 'Browse our guides and tutorials' },
    { id: 'analytics' as SettingsTab, name: 'Analytics', icon: BarChart3, description: 'Track productivity trends' },
    { id: 'data' as SettingsTab, name: 'Data & Storage', icon: Database, description: 'Export and delete your data' },
    { id: 'help' as SettingsTab, name: 'Help & Support', icon: HelpCircle, description: 'Get help and contact us' },
  ];

  return (
    <FeatureLayout breadcrumbItems={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Settings' }]}>
      <div className="min-h-screen bg-gradient-to-t from-purple-200 via-purple-100/50 to-white dark:from-purple-900 dark:via-purple-900/50 dark:to-black p-4 sm:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-4 sm:mb-8">
            <div className="flex items-center gap-3 sm:gap-4 mb-2">
              <div className="w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-xl sm:rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shadow-lg">
                <Settings className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-br from-purple-600 to-blue-600 bg-clip-text text-transparent">Settings</h1>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">Manage your account and preferences</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Sidebar Navigation */}
            <div className="lg:col-span-1">
              <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-lg">
                {/* Mobile: Horizontal scrolling tabs */}
                <nav className="lg:space-y-1 flex lg:flex-col overflow-x-auto lg:overflow-x-visible -mx-3 px-3 lg:mx-0 lg:px-0 pb-2 lg:pb-0 gap-2 lg:gap-0">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-shrink-0 lg:w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-all ${
                          isActive
                            ? 'bg-purple-600 text-white shadow-lg'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                        <span className="text-xs sm:text-sm font-medium whitespace-nowrap">{tab.name}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>

            {/* Content Area */}
            <div className="lg:col-span-3">
              <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 shadow-lg">
                {/* Profile Tab */}
                {activeTab === 'profile' && (
                  <div className="space-y-6 sm:space-y-8">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">Profile Settings</h2>
                      <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Update your personal information and profile picture</p>
                    </div>

                    {/* Avatar Upload */}
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                      <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0">
                        {profileImage ? (
                          <img
                            src={profileImage}
                            alt="Profile"
                            className="w-full h-full rounded-full object-cover shadow-xl"
                          />
                        ) : (
                          <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-2xl sm:text-3xl font-bold shadow-xl">
                            {profileData.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <button
                          onClick={() => profileImageInputRef.current?.click()}
                          className="absolute bottom-0 right-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-purple-600 flex items-center justify-center text-white hover:bg-purple-700 transition-colors shadow-lg"
                        >
                          <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                      </div>
                      <div className="text-center sm:text-left">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">{profileData.name}</h3>
                        <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{profileData.email}</p>
                        <button
                          onClick={() => profileImageInputRef.current?.click()}
                          className="mt-2 text-xs sm:text-sm text-purple-600 dark:text-purple-400 hover:underline"
                        >
                          Change profile picture
                        </button>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
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
                        <label htmlFor="field-1" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 cursor-pointer">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={profileData.name}
                          id="field-1"
              onChange={(e) =>  setProfileData({ ...profileData, name: e.target.value })}
                          className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label htmlFor="field-2" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 cursor-pointer">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={profileData.email}
                          id="field-2"
              onChange={(e) =>  setProfileData({ ...profileData, email: e.target.value })}
                          className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label htmlFor="field-3" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 cursor-pointer">
                          <Phone className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          value={profileData.phone}
                          id="field-3"
              onChange={(e) =>  setProfileData({ ...profileData, phone: e.target.value })}
                          placeholder="+1 (555) 000-0000"
                          className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label htmlFor="field-4" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 cursor-pointer">
                          <Globe className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                          Time Zone
                        </label>
                        <div className="relative">
                          <select
                            value={profileData.timezone}
                            id="field-4"
              onChange={(e) =>  setProfileData({ ...profileData, timezone: e.target.value })}
                            className="w-full px-4 py-3 text-base md:px-4 md:py-2.5 md:text-sm pr-10 sm:pr-11 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white appearance-none cursor-pointer"
                          >
                            <option>Pacific Time (PT)</option>
                            <option>Eastern Time (ET)</option>
                            <option>Central Time (CT)</option>
                            <option>Mountain Time (MT)</option>
                          </select>
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 sm:pr-4 pointer-events-none">
                            <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 dark:text-gray-400" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleSaveProfile}
                      disabled={isSavingProfile}
                      className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-purple-600 text-white rounded-lg sm:rounded-xl hover:bg-purple-700 transition-colors shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSavingProfile ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Security Tab */}
                {activeTab === 'security' && (
                  <div className="space-y-6 sm:space-y-8">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">Security Settings</h2>
                      <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Manage your password and authentication methods</p>
                    </div>

                    {/* Password Reset */}
                    <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                          <Key className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="flex-1 w-full">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-1">Reset Password</h3>
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3 sm:mb-4">
                            We'll send you an email with a secure link to reset your password
                          </p>

                          {resetEmailSent ? (
                            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg mb-3">
                              <div className="flex items-start gap-2">
                                <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-sm font-medium text-green-800 dark:text-green-200">Password reset email sent!</p>
                                  <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                                    Check your inbox at <span className="font-semibold">{user?.email}</span> for instructions to reset your password.
                                  </p>
                                  <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                                    Didn't receive it? Check your spam folder or{' '}
                                    <button
                                      onClick={() => {
                                        setResetEmailSent(false);
                                        handleRequestPasswordReset();
                                      }}
                                      className="underline hover:no-underline font-medium"
                                    >
                                      resend the email
                                    </button>
                                  </p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg mb-4">
                                <p className="text-xs text-blue-700 dark:text-blue-300">
                                  <strong>Current email:</strong> {user?.email}
                                </p>
                              </div>
                              <button
                                onClick={handleRequestPasswordReset}
                                disabled={isRequestingReset}
                                className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-purple-600 text-white rounded-lg sm:rounded-xl hover:bg-purple-700 transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

                    {/* Two-Factor Authentication */}
                    <TwoFactorAuth />

                    {/* Active Sessions */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Active Sessions</h3>
                      {isLoadingSessions ? (
                        <div className="space-y-3">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-20 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl animate-pulse" />
                          ))}
                        </div>
                      ) : activeSessions.length === 0 ? (
                        <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-center">
                          <p className="text-sm text-gray-600 dark:text-gray-400">No active sessions found</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {activeSessions.map((session) => (
                            <div key={session.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl">
                              <div className="flex items-center gap-3">
                                <Monitor className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                                <div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">{session.device}</p>
                                  <p className="text-xs text-gray-600 dark:text-gray-400">{session.location} • {session.lastActive}</p>
                                </div>
                              </div>
                              {session.isCurrent ? (
                                <span className="text-xs text-green-600 dark:text-green-400 font-medium">Current</span>
                              ) : (
                                <button
                                  onClick={() => {
                                    setSessionToRevoke(session.id);
                                    setShowRevokeSessionModal(true);
                                  }}
                                  className="text-xs text-red-600 dark:text-red-400 hover:underline"
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
                {activeTab === 'notifications' && (
                  <div className="space-y-6 sm:space-y-8">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">Notification Preferences</h2>
                        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Choose how you want to be notified about updates</p>
                      </div>
                      {isSavingPrefs && (
                        <div className="flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400">
                          <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                          Saving...
                        </div>
                      )}
                    </div>

                    {isLoadingPrefs ? (
                      <div className="space-y-6">
                        {[...Array(3)].map((_, i) => (
                          <div key={i}>
                            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-4 animate-pulse" />
                            <div className="space-y-3">
                              {[...Array(4)].map((_, j) => (
                                <div key={j} className="p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl animate-pulse">
                                  <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                      <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-32 mb-2" />
                                      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-48" />
                                    </div>
                                    <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 rounded-full" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <>
                        {/* Email Notifications */}
                        <div>
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
                            Email Notifications
                          </h3>
                          <div className="space-y-3 sm:space-y-4">
                            {[
                              { key: 'email_task_assignments', label: 'Task assignments', desc: 'Get notified when someone assigns you a task' },
                              { key: 'email_events', label: 'Event reminders', desc: 'Receive email reminders for upcoming events' },
                              { key: 'email_messages', label: 'New messages', desc: 'Get notified about new messages' },
                              { key: 'email_shopping_lists', label: 'Shopping lists', desc: 'Notifications when shopping lists are ready' },
                              { key: 'email_meal_reminders', label: 'Meal reminders', desc: 'Reminders for meal prep and cooking' },
                              { key: 'email_reminders', label: 'General reminders', desc: 'All other reminder notifications' },
                            ].map((item) => (
                              <div key={item.key} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl gap-2 sm:gap-0">
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">{item.label}</p>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{item.desc}</p>
                                </div>
                                <label htmlFor="field-6" className="relative inline-flex items-center cursor-pointer ml-auto sm:ml-0 p-2">
                                  <input
                                    type="checkbox"
                                    checked={notificationPrefs[item.key as keyof typeof notificationPrefs] as boolean}
                                    id="field-6"
              onChange={() =>  handleNotificationToggle(item.key)}
                                    className="sr-only peer"
                                  />
                                  <div className="w-14 h-7 sm:w-11 sm:h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 sm:after:h-5 sm:after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Push Notifications */}
                        <div>
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                            Push Notifications
                          </h3>
                          <div className="space-y-3 sm:space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg sm:rounded-xl gap-2 sm:gap-0">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">Enable push notifications</p>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">Allow browser notifications for real-time alerts</p>
                              </div>
                              <label htmlFor="field-7" className="relative inline-flex items-center cursor-pointer ml-auto sm:ml-0 p-2">
                                <input
                                  type="checkbox"
                                  checked={notificationPrefs.push_enabled}
                                  id="field-7"
              onChange={() =>  handleNotificationToggle('push_enabled')}
                                  className="sr-only peer"
                                />
                                <div className="w-14 h-7 sm:w-11 sm:h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 sm:after:h-5 sm:after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                              </label>
                            </div>
                            {[
                              { key: 'push_tasks', label: 'Task updates', desc: 'Task assignments and status changes' },
                              { key: 'push_reminders', label: 'Reminders', desc: 'Upcoming reminders and deadlines' },
                              { key: 'push_messages', label: 'Messages', desc: 'New message notifications' },
                              { key: 'push_shopping_updates', label: 'Shopping updates', desc: 'Shopping list changes and completions' },
                              { key: 'push_events', label: 'Event alerts', desc: 'Upcoming events and calendar updates' },
                            ].map((item) => (
                              <div key={item.key} className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl gap-2 sm:gap-0 transition-opacity ${!notificationPrefs.push_enabled ? 'opacity-50' : ''}`}>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">{item.label}</p>
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{item.desc}</p>
                                </div>
                                <label htmlFor="field-8" className="relative inline-flex items-center cursor-pointer ml-auto sm:ml-0 p-2">
                                  <input
                                    type="checkbox"
                                    checked={notificationPrefs[item.key as keyof typeof notificationPrefs] as boolean}
                                    id="field-8"
              onChange={() =>  handleNotificationToggle(item.key)}
                                    disabled={!notificationPrefs.push_enabled}
                                    className="sr-only peer"
                                  />
                                  <div className="w-14 h-7 sm:w-11 sm:h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 sm:after:h-5 sm:after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Quiet Hours */}
                        <div>
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                            Quiet Hours
                          </h3>
                          <div className="space-y-3 sm:space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg sm:rounded-xl gap-2 sm:gap-0">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">Enable quiet hours</p>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">Pause notifications during specific hours</p>
                              </div>
                              <label htmlFor="field-9" className="relative inline-flex items-center cursor-pointer ml-auto sm:ml-0 p-2">
                                <input
                                  type="checkbox"
                                  checked={notificationPrefs.quiet_hours_enabled}
                                  id="field-9"
              onChange={() =>  handleNotificationToggle('quiet_hours_enabled')}
                                  className="sr-only peer"
                                />
                                <div className="w-14 h-7 sm:w-11 sm:h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 sm:after:h-5 sm:after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                              </label>
                            </div>

                            {notificationPrefs.quiet_hours_enabled && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl">
                                <div>
                                  <label htmlFor="field-10" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 cursor-pointer">
                                    Start Time
                                  </label>
                                  <input
                                    type="time"
                                    value={notificationPrefs.quiet_hours_start}
                                    id="field-10"
                                    onChange={async (e) => {
                                      const newValue = e.target.value;
                                      setNotificationPrefs(prev => ({ ...prev, quiet_hours_start: newValue }));
                                      setIsSavingPrefs(true);
                                      try {
                                        await fetch('/api/notifications/preferences', {
                                          method: 'PATCH',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ quiet_hours_start: newValue }),
                                        });
                                      } catch (error) {
                                        console.error('Failed to update quiet hours:', error);
                                      } finally {
                                        setIsSavingPrefs(false);
                                      }
                                    }}
                                    className="w-full px-3 sm:px-4 py-3 text-base min-h-[48px] bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                                  />
                                </div>
                                <div>
                                  <label htmlFor="field-11" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 cursor-pointer">
                                    End Time
                                  </label>
                                  <input
                                    type="time"
                                    value={notificationPrefs.quiet_hours_end}
                                    id="field-11"
                                    onChange={async (e) => {
                                      const newValue = e.target.value;
                                      setNotificationPrefs(prev => ({ ...prev, quiet_hours_end: newValue }));
                                      setIsSavingPrefs(true);
                                      try {
                                        await fetch('/api/notifications/preferences', {
                                          method: 'PATCH',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ quiet_hours_end: newValue }),
                                        });
                                      } catch (error) {
                                        console.error('Failed to update quiet hours:', error);
                                      } finally {
                                        setIsSavingPrefs(false);
                                      }
                                    }}
                                    className="w-full px-3 sm:px-4 py-3 text-base min-h-[48px] bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Appearance Tab */}
                {activeTab === 'appearance' && (
                  <div className="space-y-6 sm:space-y-8">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">Appearance Settings</h2>
                      <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Customize how Rowan looks for you</p>
                    </div>

                    {/* Language */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Language & Region</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor="field-12" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 cursor-pointer">
                            Language
                          </label>
                          <div className="relative">
                            <select className="w-full px-4 py-3 pr-11 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white appearance-none cursor-pointer" id="field-12">
                              <option>English (US)</option>
                              <option>Español</option>
                              <option>Français</option>
                              <option>Deutsch</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                              <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            </div>
                          </div>
                        </div>
                        <div>
                          <label htmlFor="field-13" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 cursor-pointer">
                            Date Format
                          </label>
                          <div className="relative">
                            <select className="w-full px-4 py-3 pr-11 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white appearance-none cursor-pointer" id="field-13">
                              <option>MM/DD/YYYY</option>
                              <option>DD/MM/YYYY</option>
                              <option>YYYY-MM-DD</option>
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                              <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Privacy Tab */}
                {activeTab === 'privacy' && (
                  <div className="space-y-6 sm:space-y-8">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">Privacy Settings</h2>
                      <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Control your data and visibility preferences</p>
                    </div>

                    {isLoadingPrivacy ? (
                      <div className="space-y-4">
                        {[1, 2, 3, 4].map((i) => (
                          <div key={i} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl animate-pulse">
                            <div className="space-y-2">
                              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-32"></div>
                              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-48"></div>
                            </div>
                            <div className="w-11 h-6 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {[
                          { key: 'profileVisibility', label: 'Profile visibility', desc: 'Allow other space members to see your profile' },
                          { key: 'activityStatus', label: 'Activity status', desc: 'Show when you\'re online and active' },
                          { key: 'readReceipts', label: 'Read receipts', desc: 'Let others know when you\'ve read their messages' },
                          { key: 'analytics', label: 'Analytics', desc: 'Help us improve Rowan by sharing anonymous usage data' },
                        ].map((item) => (
                          <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">{item.label}</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">{item.desc}</p>
                            </div>
                            <Toggle
                              id={`privacy-${item.key}`}
                              checked={privacySettings[item.key as keyof typeof privacySettings]}
                              onChange={() => handlePrivacyToggle(item.key)}
                              disabled={isSavingPrivacy}
                              size="md"
                              color="purple"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Spaces Tab */}
                {activeTab === 'spaces' && (
                  <div className="space-y-6 sm:space-y-8">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">Space Management</h2>
                      <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Manage your spaces and switch between them</p>
                    </div>

                    {/* All Spaces */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Your Spaces</h3>
                      <div className="space-y-3">
                        {spaces && spaces.length > 0 ? (
                          spaces.map((space) => (
                            <div
                              key={space.id}
                              className={`p-4 rounded-xl border transition-all cursor-pointer ${
                                currentSpace?.id === space.id
                                  ? 'bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800 shadow-lg'
                                  : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 hover:border-purple-200 dark:hover:border-purple-800'
                              }`}
                              onClick={() => switchSpace(space)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold">
                                    {space.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{space.name}</p>
                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                      {space.role === 'owner' ? 'Owner' : 'Member'}
                                      {currentSpace?.id === space.id && ' • Active'}
                                    </p>
                                  </div>
                                </div>
                                {currentSpace?.id === space.id && (
                                  <Check className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl text-center">
                            <p className="text-sm text-gray-600 dark:text-gray-400">No spaces yet. Create your first space to get started.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Current Space Actions */}
                    {currentSpace && (
                      <div className="p-4 sm:p-6 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-lg sm:rounded-xl">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">Current Space: {currentSpace.name}</h3>
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                          <button
                            onClick={() => setShowInviteModal(true)}
                            className="px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-xs sm:text-sm flex items-center justify-center gap-2"
                          >
                            <UserPlus className="w-4 h-4" />
                            Invite Members
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Create New Space */}
                    <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Create New Space</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Start a new space for another family or team</p>
                      <button
                        onClick={() => setShowCreateSpaceModal(true)}
                        className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:opacity-90 transition-opacity text-sm flex items-center gap-2"
                      >
                        <UserPlus className="w-4 h-4" />
                        New Space
                      </button>
                    </div>
                  </div>
                )}

                {/* Analytics Tab */}
                {activeTab === 'analytics' && (
                  <div className="space-y-6 sm:space-y-8">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">Analytics & Insights</h2>
                      <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">View your productivity trends and completion rates across all features</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                      {[
                        {
                          id: 'tasks',
                          name: 'Tasks & Chores',
                          icon: CheckSquare,
                          href: '/settings/analytics/tasks',
                          gradient: 'from-blue-500 to-blue-600',
                          textColor: 'text-blue-600 dark:text-blue-400',
                          shadowColor: 'hover:shadow-blue-200 dark:hover:shadow-blue-900/50',
                          description: 'Track task completion and productivity'
                        },
                        {
                          id: 'calendar',
                          name: 'Calendar & Events',
                          icon: Calendar,
                          href: '/settings/analytics/calendar',
                          gradient: 'from-purple-500 to-purple-600',
                          textColor: 'text-purple-600 dark:text-purple-400',
                          shadowColor: 'hover:shadow-purple-200 dark:hover:shadow-purple-900/50',
                          description: 'Monitor event attendance and planning'
                        },
                        {
                          id: 'reminders',
                          name: 'Reminders',
                          icon: Bell,
                          href: '/settings/analytics/reminders',
                          gradient: 'from-pink-500 to-pink-600',
                          textColor: 'text-pink-600 dark:text-pink-400',
                          shadowColor: 'hover:shadow-pink-200 dark:hover:shadow-pink-900/50',
                          description: 'Analyze reminder effectiveness'
                        },
                        {
                          id: 'messages',
                          name: 'Messages',
                          icon: MessageSquare,
                          href: '/settings/analytics/messages',
                          gradient: 'from-green-500 to-green-600',
                          textColor: 'text-green-600 dark:text-green-400',
                          shadowColor: 'hover:shadow-green-200 dark:hover:shadow-green-900/50',
                          description: 'View messaging trends and activity'
                        },
                        {
                          id: 'shopping',
                          name: 'Shopping Lists',
                          icon: ShoppingCart,
                          href: '/settings/analytics/shopping',
                          gradient: 'from-emerald-500 to-emerald-600',
                          textColor: 'text-emerald-600 dark:text-emerald-400',
                          shadowColor: 'hover:shadow-emerald-200 dark:hover:shadow-emerald-900/50',
                          description: 'Track shopping habits and savings'
                        },
                        {
                          id: 'meals',
                          name: 'Meal Planning',
                          icon: UtensilsCrossed,
                          href: '/settings/analytics/meals',
                          gradient: 'from-orange-500 to-orange-600',
                          textColor: 'text-orange-600 dark:text-orange-400',
                          shadowColor: 'hover:shadow-orange-200 dark:hover:shadow-orange-900/50',
                          description: 'Review meal planning patterns'
                        },
                        {
                          id: 'budget',
                          name: 'Budget Tracking',
                          icon: DollarSign,
                          href: '/settings/analytics/budget',
                          gradient: 'from-amber-500 to-amber-600',
                          textColor: 'text-amber-600 dark:text-amber-400',
                          shadowColor: 'hover:shadow-amber-200 dark:hover:shadow-amber-900/50',
                          description: 'Monitor spending and budgets'
                        },
                        {
                          id: 'goals',
                          name: 'Goals & Milestones',
                          icon: Target,
                          href: '/settings/analytics/goals',
                          gradient: 'from-indigo-500 to-indigo-600',
                          textColor: 'text-indigo-600 dark:text-indigo-400',
                          shadowColor: 'hover:shadow-indigo-200 dark:hover:shadow-indigo-900/50',
                          description: 'Track goal progress and achievements'
                        },
                      ].map((feature) => {
                        const Icon = feature.icon;
                        return (
                          <Link
                            key={feature.id}
                            href={feature.href}
                            className={`bg-white/60 dark:bg-gray-800/60 backdrop-blur-md border border-gray-200/50 dark:border-gray-700/50 rounded-xl p-6 hover:shadow-xl hover:-translate-y-2 ${feature.shadowColor} transition-all duration-300 group`}
                          >
                            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 shadow-lg`}>
                              <Icon className="w-7 h-7 text-white" />
                            </div>
                            <h3 className={`text-lg font-semibold ${feature.textColor} mb-2 transition-all`}>
                              {feature.name}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
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

                {/* Data & Storage Tab */}
                {activeTab === 'data' && (
                  <div className="space-y-6 sm:space-y-8">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">Data & Storage</h2>
                      <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Export your data or delete your account</p>
                    </div>

                    {/* Export Data - GDPR Compliant */}
                    <div className="p-4 sm:p-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg sm:rounded-xl">
                      <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <Download className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 w-full">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-1">Export Your Data</h3>
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3 sm:mb-4">
                            Download a complete copy of all your data in JSON format. This includes expenses, budgets, tasks, messages, and more.
                          </p>
                          <p className="text-xs text-blue-700 dark:text-blue-300 mb-4 bg-blue-100 dark:bg-blue-900/40 p-3 rounded-lg">
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
                              } catch (error) {
                                alert('Failed to export data. Please try again.');
                              }
                            }}
                            className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-blue-600 text-white rounded-lg sm:rounded-xl hover:bg-blue-700 transition-colors shadow-lg flex items-center justify-center gap-2"
                          >
                            <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            Download My Data (JSON)
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Delete Account - GDPR Compliant */}
                    <div className="p-4 sm:p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg sm:rounded-xl">
                      <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                          <Trash2 className="w-5 h-5 sm:w-6 sm:h-6 text-red-600 dark:text-red-400" />
                        </div>
                        <div className="flex-1 w-full">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-1">Delete Account</h3>
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3 sm:mb-4">
                            Permanently delete your account with a 30-day grace period. You can cancel anytime within 30 days.
                          </p>
                          <p className="text-xs text-red-700 dark:text-red-300 mb-4 bg-red-100 dark:bg-red-900/40 p-3 rounded-lg">
                            <strong>GDPR Compliance:</strong> This fulfills your Right to Erasure (Article 17).
                            All personal data will be deleted after a 30-day grace period with email notifications.
                          </p>
                          <button
                            onClick={() => setShowDeleteAccountModal(true)}
                            className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-red-600 text-white rounded-lg sm:rounded-xl hover:bg-red-700 transition-colors shadow-lg flex items-center justify-center gap-2"
                          >
                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            Delete My Account
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Sign Out */}
                    <div className="p-4 sm:p-6 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg sm:rounded-xl">
                      <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                          <LogOut className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 dark:text-gray-400" />
                        </div>
                        <div className="flex-1 w-full">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-1">Sign Out</h3>
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3 sm:mb-4">Sign out from all devices and sessions</p>
                          <button className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg sm:rounded-xl hover:opacity-90 transition-opacity shadow-lg flex items-center justify-center gap-2">
                            <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            Sign Out Everywhere
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Documentation Tab - Direct Feature Cards */}
                {activeTab === 'documentation' && (
                  <div className="space-y-6 sm:space-y-8">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">Documentation</h2>
                      <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Choose a feature to learn about. Comprehensive guides for all Rowan features.</p>
                    </div>

                    {/* Features Grid - Optimized for 9 cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                      {documentationFeatures.map((feature) => {
                        const Icon = feature.icon;
                        const isAvailable = feature.available;

                        if (isAvailable) {
                          return (
                            <Link
                              key={feature.id}
                              href={feature.href}
                              className={`group relative p-6 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-2 border-gray-200/60 dark:border-gray-700/60 ${feature.hoverBorder} ${feature.hoverShadow} rounded-2xl hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 hover:scale-105`}
                            >
                              <div className={`w-14 h-14 rounded-xl bg-gradient-to-r ${feature.color} flex items-center justify-center mb-4 shadow-lg`}>
                                <Icon className="w-7 h-7 text-white" />
                              </div>
                              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                {feature.name}
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                                {feature.description}
                              </p>
                              <div className="flex items-center text-sm font-semibold text-purple-600 dark:text-purple-400">
                                Read guides
                                <span className="ml-2 group-hover:translate-x-2 transition-transform duration-300">→</span>
                              </div>
                            </Link>
                          );
                        } else {
                          return (
                            <div
                              key={feature.id}
                              className="relative p-6 bg-white/40 dark:bg-gray-900/40 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl opacity-60"
                            >
                              <div className={`w-14 h-14 rounded-xl bg-gradient-to-r ${feature.color} opacity-50 flex items-center justify-center mb-4`}>
                                <Icon className="w-7 h-7 text-white" />
                              </div>
                              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
                                {feature.name}
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                                {feature.description}
                              </p>
                              <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                                Coming Soon
                              </div>
                            </div>
                          );
                        }
                      })}
                    </div>

                  </div>
                )}

                {/* Help & Support Tab */}
                {activeTab === 'help' && (
                  <div className="space-y-6 sm:space-y-8">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">Help & Support</h2>
                      <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Get help and learn more about Rowan</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                      <a href="#" className="p-6 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-lg transition-shadow">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Contact Support</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Get help from our team</p>
                      </a>

                      <a href="#" className="p-6 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-lg transition-shadow">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Community Forum</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Connect with other users</p>
                      </a>

                      <a href="#" className="p-6 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl hover:shadow-lg transition-shadow">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">What&apos;s New</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">See the latest features and updates</p>
                      </a>
                    </div>

                    <div className="p-6 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">App Version</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Rowan v1.0.0</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">You&apos;re running the latest version</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Space Management Modals */}
      <CreateSpaceModal
        isOpen={showCreateSpaceModal}
        onClose={() => setShowCreateSpaceModal(false)}
        onSpaceCreated={(spaceId, spaceName) => {
          refreshSpaces();
          setShowCreateSpaceModal(false);
        }}
      />

      {currentSpace && (
        <InvitePartnerModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          spaceId={currentSpace.id}
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Delete Account</h3>
              </div>
              <button onClick={() => setShowDeleteAccountModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <p className="text-sm text-red-800 dark:text-red-200 font-semibold">
                  Warning: This action cannot be undone
                </p>
                <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                  All your data will be permanently deleted, including tasks, events, messages, and all other content.
                </p>
              </div>

              <div>
                <label htmlFor="field-15" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 cursor-pointer">
                  Enter your password to confirm
                </label>
                <input
                  type="password"
                  value={deletePassword}
                  id="field-15"
              onChange={(e) =>  setDeletePassword(e.target.value)}
                  placeholder="Your password"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label htmlFor="field-16" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 cursor-pointer">
                  Type DELETE to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  id="field-16"
              onChange={(e) =>  setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 dark:text-white"
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
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  I understand this action is permanent and cannot be reversed
                </span>
              </label>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowDeleteAccountModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Revoke Session</h3>
              </div>
              <button onClick={() => setShowRevokeSessionModal(false)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to revoke this session? The device will be logged out immediately.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRevokeSessionModal(false)}
                className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
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
    </FeatureLayout>
  );
}
