'use client';

// Force dynamic rendering to prevent useContext errors during static generation
export const dynamic = 'force-dynamic';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import nextDynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { CreateSpaceModal } from '@/components/spaces/CreateSpaceModal';
import { InvitePartnerModal } from '@/components/spaces/InvitePartnerModal';
import { DeleteSpaceModal } from '@/components/spaces/DeleteSpaceModal';
import {
  AccountDeletionModal,
  ExportDataModal,
  PrivacyDataManager,
} from '@/components/ui/DynamicSettingsComponents';
import { SpacesLoadingState } from '@/components/ui/LoadingStates';
import { ProfileTab } from '@/components/settings/ProfileTab';
import { motion, AnimatePresence } from 'framer-motion';

// Lazy-load non-default tab components (only loaded when that tab is active)
const TabLoader = () => <div className="animate-pulse space-y-4"><div className="h-8 bg-gray-700 rounded w-1/3" /><div className="h-32 bg-gray-700 rounded" /><div className="h-32 bg-gray-700 rounded" /></div>;

const SecurityTab = nextDynamic(
  () => import('@/components/settings/SecurityTab').then(m => ({ default: m.SecurityTab })),
  { loading: TabLoader }
);
const SubscriptionSettings = nextDynamic(
  () => import('@/components/settings/SubscriptionSettings').then(m => ({ default: m.SubscriptionSettings })),
  { loading: TabLoader }
);
const NotificationSettings = nextDynamic(
  () => import('@/components/settings/NotificationSettings').then(m => ({ default: m.NotificationSettings })),
  { loading: TabLoader }
);
const DataManagementTab = nextDynamic(
  () => import('@/components/settings/DataManagementTab').then(m => ({ default: m.DataManagementTab })),
  { loading: TabLoader }
);
const CalendarConnections = nextDynamic(
  () => import('@/components/calendar/CalendarConnections').then(m => ({ default: m.CalendarConnections })),
  { loading: TabLoader }
);
const DocumentationTab = nextDynamic(
  () => import('@/components/settings/DocumentationTab'),
  { loading: TabLoader }
);
const AnalyticsTab = nextDynamic(
  () => import('@/components/settings/AnalyticsTab'),
  { loading: TabLoader }
);
import {
  Settings,
  User,
  Shield,
  Bell,
  Crown,
  Eye,
  Database,
  Link2,
  BookOpen,
  BarChart3,
} from 'lucide-react';

type SettingsTab = 'profile' | 'subscription' | 'security' | 'notifications' | 'privacy-data' | 'data-management' | 'integrations' | 'documentation' | 'analytics';

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

export default function SettingsPage() {
  const { user, currentSpace, spaces: _spaces, refreshSpaces } = useAuthWithSpaces();
  const spaceId = currentSpace?.id;
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get initial tab from URL or default to 'profile'
  const initialTab = (searchParams?.get('tab') as SettingsTab) || 'profile';
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  // Modal states (page-level modals shared across tabs)
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCreateSpaceModal, setShowCreateSpaceModal] = useState(false);
  const [showDeleteSpaceModal, setShowDeleteSpaceModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [invitationRefreshKey, setInvitationRefreshKey] = useState(0);

  // Update URL when tab changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('tab', activeTab);
    router.replace(`?${params.toString()}`, { scroll: false });
  }, [activeTab, router]);

  // Stable modal callbacks for ProfileTab
  const handleShowCreateSpaceModal = useCallback(() => setShowCreateSpaceModal(true), []);
  const handleShowInviteModal = useCallback(() => setShowInviteModal(true), []);
  const handleShowDeleteSpaceModal = useCallback(() => setShowDeleteSpaceModal(true), []);
  const handleShowExportModal = useCallback(() => setShowExportModal(true), []);
  const handleShowDeleteAccountModal = useCallback(() => setShowDeleteAccountModal(true), []);

  const handleInviteModalClose = useCallback(() => {
    setShowInviteModal(false);
  }, []);

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
                    {activeTab === 'profile' && (
                      <ProfileTab
                        onShowCreateSpaceModal={handleShowCreateSpaceModal}
                        onShowInviteModal={handleShowInviteModal}
                        onShowDeleteSpaceModal={handleShowDeleteSpaceModal}
                        onShowExportModal={handleShowExportModal}
                        onShowDeleteAccountModal={handleShowDeleteAccountModal}
                        invitationRefreshKey={invitationRefreshKey}
                      />
                    )}
                    {activeTab === 'subscription' && <SubscriptionSettings />}
                    {activeTab === 'security' && <SecurityTab userEmail={user.email || ''} />}
                    {activeTab === 'notifications' && <NotificationSettings />}
                    {activeTab === 'privacy-data' && <PrivacyDataManager />}
                    {activeTab === 'data-management' && <DataManagementTab />}
                    {activeTab === 'integrations' && <CalendarConnections />}
                    {activeTab === 'documentation' && <DocumentationTab />}
                    {activeTab === 'analytics' && <AnalyticsTab />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links - Mobile Only */}
      <div className="md:hidden px-4 pb-6">
        <div className="bg-gray-800/80 border border-gray-700/50 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Link2 className="w-4 h-4" />
            Quick Links
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/legal" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
              Legal
            </Link>
            <Link href="/settings/documentation" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
              Documentation
            </Link>
            <Link href="/privacy" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
              Terms
            </Link>
            <Link href="/security" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
              Security
            </Link>
            <Link href="/feedback" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
              Feedback
            </Link>
          </div>
        </div>
      </div>

      {/* Page-level Modals */}
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
          onInviteSent={() => setInvitationRefreshKey(k => k + 1)}
          spaceId={spaceId}
          spaceName={currentSpace.name}
        />
      )}

      {user && (
        <ExportDataModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          userId={user.id}
        />
      )}

      <AccountDeletionModal
        isOpen={showDeleteAccountModal}
        onClose={() => setShowDeleteAccountModal(false)}
      />

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
