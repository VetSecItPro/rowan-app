'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { useAuth } from '@/lib/contexts/auth-context';
import { getUserAuditLog, getUserAuditStats, AuditLogEntry, ActionCategory } from '@/lib/services/audit-log-service';
import { SkeletonLoader } from '@/components/shared/SkeletonLoader';
import { EmptyState } from '@/components/shared/EmptyState';
import {
  Shield,
  Download,
  User,
  Lock,
  FileText,
  Calendar,
  Filter,
  ChevronDown,
  Activity,
  Eye,
  LogOut,
  LogIn,
  Key,
  Mail,
  Trash2,
  RefreshCw,
  BarChart3
} from 'lucide-react';
import { format } from 'date-fns';

const ACTION_ICONS: Record<string, any> = {
  data_export: Download,
  account_login: LogIn,
  account_logout: LogOut,
  password_change: Key,
  email_change: Mail,
  '2fa_enable': Shield,
  '2fa_disable': Shield,
  deletion_initiated: Trash2,
  deletion_cancelled: RefreshCw,
  profile_view: Eye,
  profile_update: User,
};

const CATEGORY_COLORS: Record<ActionCategory, string> = {
  data_access: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20',
  account: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20',
  security: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20',
  compliance: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20',
};

export default function AuditLogPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<ActionCategory | 'all'>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    loadAuditLog();
    loadStats();
  }, [user, selectedCategory]);

  const loadAuditLog = async () => {
    if (!user) return;

    setLoading(true);
    const result = await getUserAuditLog(user.id, {
      limit: 50,
      category: selectedCategory === 'all' ? undefined : selectedCategory,
    });

    if (result.success && result.data) {
      setAuditLog(result.data);
    }
    setLoading(false);
  };

  const loadStats = async () => {
    if (!user) return;

    const result = await getUserAuditStats(user.id);
    if (result.success && result.stats) {
      setStats(result.stats);
    }
  };

  const getActionIcon = (action: string) => {
    const Icon = ACTION_ICONS[action] || Activity;
    return Icon;
  };

  const formatActionName = (action: string) => {
    return action
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (!user) {
    return null;
  }

  return (
    <FeatureLayout breadcrumbItems={[
      { label: 'Settings', href: '/settings' },
      { label: 'Audit Log' }
    ]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white/30 dark:bg-gray-800/30 backdrop-blur-xl border border-white/20 dark:border-gray-700/20 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Your Audit Trail</h1>
              <p className="text-gray-600 dark:text-gray-400">
                View all actions performed on your account. This log helps you track data access and account changes for transparency and security.
              </p>
              <div className="mt-4 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg">
                <FileText className="w-4 h-4" />
                <span>
                  <strong>GDPR Article 15:</strong> Right of Access - You have the right to know what data we have and how it's processed.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white/30 dark:bg-gray-800/30 backdrop-blur-xl border border-white/20 dark:border-gray-700/20 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Events</h3>
                <BarChart3 className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>

            <div className="bg-white/30 dark:bg-gray-800/30 backdrop-blur-xl border border-white/20 dark:border-gray-700/20 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Recent (30d)</h3>
                <Calendar className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.recent_actions}</p>
            </div>

            <div className="bg-white/30 dark:bg-gray-800/30 backdrop-blur-xl border border-white/20 dark:border-gray-700/20 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Security Events</h3>
                <Lock className="w-5 h-5 text-orange-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.by_category.security}</p>
            </div>

            <div className="bg-white/30 dark:bg-gray-800/30 backdrop-blur-xl border border-white/20 dark:border-gray-700/20 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Data Access</h3>
                <Eye className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.by_category.data_access}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white/30 dark:bg-gray-800/30 backdrop-blur-xl border border-white/20 dark:border-gray-700/20 rounded-xl p-4">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center justify-between w-full"
          >
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <span className="font-medium text-gray-900 dark:text-white">Filters</span>
              {selectedCategory !== 'all' && (
                <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full">
                  Active
                </span>
              )}
            </div>
            <ChevronDown className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedCategory === 'all'
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  All Events
                </button>
                <button
                  onClick={() => setSelectedCategory('data_access')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedCategory === 'data_access'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Data Access
                </button>
                <button
                  onClick={() => setSelectedCategory('account')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedCategory === 'account'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Account
                </button>
                <button
                  onClick={() => setSelectedCategory('security')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedCategory === 'security'
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Security
                </button>
                <button
                  onClick={() => setSelectedCategory('compliance')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedCategory === 'compliance'
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Compliance
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Audit Log Entries */}
        {loading ? (
          <SkeletonLoader count={10} />
        ) : auditLog.length === 0 ? (
          <EmptyState
            icon={Shield}
            title="No Audit Events"
            description="No events match your filter criteria. Try selecting a different category."
          />
        ) : (
          <div className="space-y-3">
            {auditLog.map((entry) => {
              const Icon = getActionIcon(entry.action);
              return (
                <div
                  key={entry.id}
                  className="bg-white/30 dark:bg-gray-800/30 backdrop-blur-xl border border-white/20 dark:border-gray-700/20 rounded-xl p-4 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${CATEGORY_COLORS[entry.action_category]}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {formatActionName(entry.action)}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {entry.resource_type && (
                              <span className="capitalize">{entry.resource_type} </span>
                            )}
                            <span className="text-xs">
                              {format(new Date(entry.timestamp || entry.created_at!), 'PPpp')}
                            </span>
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${CATEGORY_COLORS[entry.action_category]}`}>
                          {entry.action_category.replace('_', ' ')}
                        </span>
                      </div>
                      {entry.details && Object.keys(entry.details).length > 0 && (
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg">
                          <pre className="whitespace-pre-wrap break-all">
                            {JSON.stringify(entry.details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </FeatureLayout>
  );
}
