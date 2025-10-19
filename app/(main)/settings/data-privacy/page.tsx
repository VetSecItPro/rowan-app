'use client';

import { FeatureLayout } from '@/components/layout/FeatureLayout';
import {
  Database,
  Shield,
  Download,
  FileText,
  Trash2,
  Archive,
  Lock,
  Eye,
  ArrowRight,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

const features = [
  {
    id: 'audit-log',
    title: 'Audit Log',
    description: 'View your complete activity history and data access events',
    icon: Eye,
    gradient: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-500',
    textColor: 'text-purple-600',
    darkBgColor: 'dark:bg-purple-900/30',
    shadowColor: 'shadow-purple-500/20',
    href: '/settings/audit-log',
    features: [
      'All data access events',
      'Filter by category',
      'Export and security events',
      '2-year retention'
    ],
    badge: 'GDPR Article 15',
    badgeColor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
  },
  {
    id: 'privacy-compliance',
    title: 'Privacy & Compliance',
    description: 'Manage your privacy preferences and CCPA/GDPR settings',
    icon: Lock,
    gradient: 'from-orange-500 to-orange-600',
    bgColor: 'bg-orange-500',
    textColor: 'text-orange-600',
    darkBgColor: 'dark:bg-orange-900/30',
    shadowColor: 'shadow-orange-500/20',
    href: '/settings/privacy-compliance',
    features: [
      'CCPA Do Not Sell',
      'Cookie preferences',
      'Marketing settings',
      'Data sharing controls'
    ],
    badge: 'GDPR + CCPA',
    badgeColor: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
  },
  {
    id: 'export-data',
    title: 'Export Your Data',
    description: 'Download your data in multiple formats with date range filtering',
    icon: Download,
    gradient: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-500',
    textColor: 'text-blue-600',
    darkBgColor: 'dark:bg-blue-900/30',
    shadowColor: 'shadow-blue-500/20',
    href: '/settings/data-privacy/export',
    features: [
      'JSON, CSV, PDF formats',
      'Filter by date range',
      'Select specific data types',
      'Bulk export capabilities'
    ],
    badge: 'GDPR Article 20',
    badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
  },
  {
    id: 'bulk-operations',
    title: 'Bulk Data Management',
    description: 'Manage large amounts of data efficiently with bulk operations',
    icon: Database,
    gradient: 'from-green-500 to-green-600',
    bgColor: 'bg-green-500',
    textColor: 'text-green-600',
    darkBgColor: 'dark:bg-green-900/30',
    shadowColor: 'shadow-green-500/20',
    href: '/settings/data-privacy/bulk-operations',
    features: [
      'Bulk delete expenses',
      'Archive old data',
      'Export by date range',
      'Data cleanup tools'
    ],
    badge: 'Data Minimization',
    badgeColor: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
  },
  {
    id: 'delete-account',
    title: 'Delete Account',
    description: 'Permanently delete your account and all associated data',
    icon: Trash2,
    gradient: 'from-red-500 to-red-600',
    bgColor: 'bg-red-500',
    textColor: 'text-red-600',
    darkBgColor: 'dark:bg-red-900/30',
    shadowColor: 'shadow-red-500/20',
    href: '/settings',
    features: [
      '30-day grace period',
      'Data export before deletion',
      'Email notifications',
      'Cancel anytime'
    ],
    badge: 'GDPR Article 17',
    badgeColor: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    warning: true
  },
];

const complianceInfo = [
  {
    icon: CheckCircle,
    title: 'GDPR Compliant',
    description: 'Full compliance with EU General Data Protection Regulation',
    color: 'text-green-600 dark:text-green-400'
  },
  {
    icon: CheckCircle,
    title: 'CCPA Compliant',
    description: 'California Consumer Privacy Act rights implemented',
    color: 'text-blue-600 dark:text-blue-400'
  },
  {
    icon: CheckCircle,
    title: 'Transparent',
    description: 'Complete audit trail of all data access and processing',
    color: 'text-purple-600 dark:text-purple-400'
  }
];

export default function DataPrivacyPage() {
  return (
    <FeatureLayout breadcrumbItems={[
      { label: 'Settings', href: '/settings' },
      { label: 'Data & Privacy' }
    ]}>
      <div className="space-y-8">
        {/* Header */}
        <div className="bg-white/30 dark:bg-gray-800/30 backdrop-blur-xl border border-white/20 dark:border-gray-700/20 rounded-2xl p-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
            Data & Privacy Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Your data is yours. Export it, delete it, or manage how it's used. We're committed to transparency and giving you full control.
          </p>

          {/* Compliance Badges */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {complianceInfo.map((item) => (
              <div
                key={item.title}
                className="flex items-start gap-3 p-4 bg-white/50 dark:bg-gray-900/50 rounded-xl"
              >
                <item.icon className={`w-5 h-5 ${item.color} flex-shrink-0 mt-0.5`} />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                    {item.title}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature) => {
            const IconComponent = feature.icon;

            return (
              <Link
                key={feature.id}
                href={feature.href}
                className="group relative bg-white/30 dark:bg-gray-800/30 backdrop-blur-xl border border-white/20 dark:border-gray-700/20 rounded-2xl p-6 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300"
              >
                {/* Badge */}
                <div className="absolute top-4 right-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${feature.badgeColor}`}>
                    {feature.badge}
                  </span>
                </div>

                {/* Icon */}
                <div className={`w-14 h-14 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center mb-4 shadow-lg ${feature.shadowColor}`}>
                  <IconComponent className="w-7 h-7 text-white" />
                </div>

                {/* Title & Description */}
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 pr-20">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  {feature.description}
                </p>

                {/* Features List */}
                <ul className="space-y-2 mb-4">
                  {feature.features.map((item, index) => (
                    <li
                      key={index}
                      className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300"
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${feature.bgColor}`} />
                      {item}
                    </li>
                  ))}
                </ul>

                {/* Warning for dangerous actions */}
                {feature.warning && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4">
                    <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-red-700 dark:text-red-300">
                      This action is permanent and cannot be undone
                    </p>
                  </div>
                )}

                {/* Arrow */}
                <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-white group-hover:gap-3 transition-all">
                  <span>{feature.warning ? 'Learn More' : 'Manage'}</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </Link>
            );
          })}
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Your Privacy Rights
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                Under GDPR and CCPA, you have the right to:
              </p>
              <ul className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span><strong>Know</strong> what data we collect and how it's used</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span><strong>Access</strong> your data at any time via exports and audit logs</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span><strong>Delete</strong> your data and account permanently</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span><strong>Opt-out</strong> of data selling (CCPA: Do Not Sell)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span><strong>Port</strong> your data to other services in standard formats</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </FeatureLayout>
  );
}
