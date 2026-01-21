/**
 * Dynamic Settings Components for Code Splitting
 *
 * Professional dynamic loading for heavy settings and privacy components
 * Modals and complex forms are loaded on-demand to optimize initial bundle size
 */

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import { Loader2, Settings, Shield, Lock, Download, Trash2, UserCheck } from 'lucide-react';

/**
 * Settings-specific loading component
 */
const SettingsLoadingFallback = ({
  text = 'Loading...',
  icon: Icon = Settings
}: {
  text?: string;
  icon?: ComponentType<{ className?: string }>;
}) => (
  <div className="flex items-center justify-center p-6">
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <Icon className="w-8 h-8 text-purple-500" />
        <Loader2 className="w-4 h-4 absolute -top-1 -right-1 animate-spin text-purple-600" />
      </div>
      <p className="text-sm text-gray-400">{text}</p>
    </div>
  </div>
);

/**
 * Modal loading skeleton for settings
 */
const SettingsModalSkeleton = ({ title, icon: Icon = Shield }: { title: string; icon?: ComponentType<{ className?: string }> }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-purple-900/30 flex items-center justify-center">
          <Icon className="w-5 h-5 text-purple-400" />
        </div>
        <div className="h-6 bg-gray-700 rounded animate-pulse w-40" />
      </div>
      <SettingsLoadingFallback text={`Loading ${title}...`} icon={Icon} />
    </div>
  </div>
);

/**
 * ACCOUNT DELETION MODAL - Dynamic Import
 * Heavy modal with GDPR compliance and confirmation flows
 */
export const AccountDeletionModal = dynamic(
  () => import('@/components/settings/AccountDeletionModal').then(mod => ({ default: mod.AccountDeletionModal })),
  {
    loading: () => <SettingsModalSkeleton title="account deletion" icon={Trash2} />,
    ssr: false,
  }
);

/**
 * CCPA OPT-OUT MODAL - Dynamic Import
 * Privacy compliance modal with legal forms
 */
export const CCPAOptOutModal = dynamic(
  () => import('@/components/settings/CCPAOptOutModal').then(mod => ({ default: mod.CCPAOptOutModal })),
  {
    loading: () => <SettingsModalSkeleton title="privacy settings" icon={Lock} />,
    ssr: false,
  }
);

/**
 * RESTORE ACCOUNT MODAL - Dynamic Import
 * Account recovery interface with validation
 */
export const RestoreAccountModal = dynamic(
  () => import('@/components/settings/RestoreAccountModal').then(mod => ({ default: mod.RestoreAccountModal })),
  {
    loading: () => <SettingsModalSkeleton title="account restoration" icon={UserCheck} />,
    ssr: false,
  }
);

/**
 * PASSWORD CONFIRM MODAL - Dynamic Import
 * Security modal for sensitive operations
 */
export const PasswordConfirmModal = dynamic(
  () => import('@/components/settings/PasswordConfirmModal').then(mod => ({ default: mod.PasswordConfirmModal })),
  {
    loading: () => <SettingsModalSkeleton title="password confirmation" icon={Shield} />,
    ssr: false,
  }
);

/**
 * EXPORT DATA MODAL - Dynamic Import
 * GDPR data export with file generation
 */
export const ExportDataModal = dynamic(
  () => import('@/components/settings/ExportDataModal').then(mod => ({ default: mod.ExportDataModal })),
  {
    loading: () => <SettingsModalSkeleton title="data export" icon={Download} />,
    ssr: false,
  }
);

/**
 * PRIVACY DATA MANAGER - Dynamic Import
 * Heavy component with comprehensive privacy controls
 */
export const PrivacyDataManager = dynamic(
  () => import('@/components/settings/PrivacyDataManager').then(mod => ({ default: mod.PrivacyDataManager })),
  {
    loading: () => (
      <div className="space-y-6">
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <SettingsLoadingFallback text="Loading privacy settings..." icon={Lock} />
          <div className="space-y-4 mt-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-4">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-700 rounded w-32 animate-pulse" />
                  <div className="h-3 bg-gray-700 rounded w-48 animate-pulse" />
                </div>
                <div className="w-12 h-6 bg-gray-700 rounded-full animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    ssr: false,
  }
);

/**
 * ENHANCED MEMBER MANAGEMENT - Server Component Only
 * Complex member management with roles and permissions (removed from dynamic imports due to server dependency)
 */
// Note: EnhancedMemberManagement removed from dynamic loading due to server-side dependencies

/**
 * TWO-FACTOR AUTH - Dynamic Import
 * Complex 2FA setup with QR codes and verification
 */
export const TwoFactorAuth = dynamic(
  () => import('@/components/settings/TwoFactorAuth').then(mod => ({ default: mod.TwoFactorAuth })),
  {
    loading: () => (
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
        <SettingsLoadingFallback text="Loading two-factor authentication..." icon={Shield} />
        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-4 bg-gray-700 rounded w-40 animate-pulse" />
              <div className="h-3 bg-gray-700 rounded w-64 animate-pulse" />
            </div>
            <div className="w-16 h-8 bg-gray-700 rounded animate-pulse" />
          </div>
          <div className="w-48 h-48 bg-gray-700 rounded-lg animate-pulse mx-auto" />
        </div>
      </div>
    ),
    ssr: false,
  }
);

/**
 * High-Level Dynamic Settings Components Export
 * Provides easy access to all dynamically loaded settings components
 */
export const DynamicSettingsComponents = {
  // Privacy & Security Modals (heaviest - load on demand)
  AccountDeletionModal,
  CCPAOptOutModal,
  RestoreAccountModal,
  PasswordConfirmModal,
  ExportDataModal,

  // Complex Management Components (heavy - load when accessing specific features)
  PrivacyDataManager,
  TwoFactorAuth,
} as const;

/**
 * Type exports for dynamic settings components
 */
export type DynamicSettingsComponent = keyof typeof DynamicSettingsComponents;

/**
 * Settings section loading wrapper
 */
export const SettingsSectionLoader = ({
  isLoading,
  error,
  children
}: {
  isLoading: boolean;
  error?: string;
  children: React.ReactNode;
}) => {
  if (isLoading) {
    return <SettingsLoadingFallback text="Loading settings section..." />;
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-900/20 flex items-center justify-center">
          <span className="text-red-400 text-xl">⚠️</span>
        </div>
        <p className="text-sm text-red-400 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return <>{children}</>;
};
