'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Breadcrumbs } from '@/components/admin/Breadcrumbs';
import { logger } from '@/lib/logger';
import {
  Shield,
  Users,
  Search,
  Filter,
  Download,
  Eye,
  UserCheck,
  UserX,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Globe,
  TrendingUp,
  Calendar,
  RefreshCw,
  Settings,
  Lock,
  Unlock,
  Activity,
  Target,
  Award,
  Sun,
  Moon,
  Ticket,
  Mail,
  Copy
} from 'lucide-react';
import { useTheme } from 'next-themes';

interface BetaRequest {
  id: string;
  email: string;
  // password_attempt column removed for security - never store plaintext passwords
  ip_address: string | null;
  user_agent: string | null;
  access_granted: boolean;
  user_id: string | null;
  created_at: string;
  approved_at: string | null;
  notes: string | null;
}

interface BetaUser {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_beta_tester: boolean;
  beta_status: string | null;
  beta_signup_date: string | null;
  created_at: string;
  updated_at: string;
  last_seen: string | null;
  is_online: boolean;
  beta_request?: any;
  last_activity?: string;
}

interface BetaFeedback {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  user_id: string;
  created_at: string;
  updated_at: string;
  admin_response: string | null;
  admin_notes: string | null;
  votes_count: number;
  comments_count: number;
  user?: {
    email: string;
    full_name: string | null;
  };
}

interface BetaStats {
  totalRequests: number;
  approvedRequests: number;
  pendingRequests: number;
  activeUsers: number;
  capacity: number;
  conversionRate: number;
  averageActivityScore: number;
  recentActivity: Array<{
    type: 'request' | 'approval' | 'signup' | 'activity';
    email: string;
    timestamp: string;
    details: string;
  }>;
}

interface InviteCode {
  id: string;
  code: string;
  email: string | null;
  used_by: string | null;
  is_active: boolean;
  expires_at: string | null;
  source: string;
  notes: string | null;
  created_at: string;
  used_at: string | null;
}

export default function AdminBetaPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'requests' | 'users' | 'codes' | 'feedback' | 'settings'>('requests');
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [codeFilter, setCodeFilter] = useState<'all' | 'used' | 'pending' | 'expired'>('all');

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);
  const [betaRequests, setBetaRequests] = useState<BetaRequest[]>([]);
  const [betaUsers, setBetaUsers] = useState<BetaUser[]>([]);
  const [betaFeedback, setBetaFeedback] = useState<BetaFeedback[]>([]);
  const [stats, setStats] = useState<BetaStats>({
    totalRequests: 0,
    approvedRequests: 0,
    pendingRequests: 0,
    activeUsers: 0,
    capacity: 100,
    conversionRate: 0,
    averageActivityScore: 0,
    recentActivity: [],
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending' | 'failed'>('all');
  const [feedbackFilter, setFeedbackFilter] = useState<'all' | 'open' | 'in_progress' | 'resolved' | 'closed'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequests, setSelectedRequests] = useState<Set<string>>(new Set());
  const [selectedFeedback, setSelectedFeedback] = useState<Set<string>>(new Set());

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Fetch beta data in parallel
      const [requestsResponse, usersResponse, feedbackResponse, statsResponse, codesResponse] = await Promise.all([
        fetch('/api/admin/beta/requests'),
        fetch('/api/admin/users/online'),
        fetch('/api/admin/beta/feedback'),
        fetch('/api/admin/beta/stats'),
        fetch('/api/admin/beta/invite-codes')
      ]);

      if (requestsResponse.ok) {
        const requestsData = await requestsResponse.json();
        setBetaRequests(requestsData.requests || []);
      }

      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setBetaUsers(usersData.users || []);
      }

      if (feedbackResponse.ok) {
        const feedbackData = await feedbackResponse.json();
        setBetaFeedback(feedbackData.feedback || []);
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(prevStats => ({ ...prevStats, ...statsData.stats }));
      }

      if (codesResponse.ok) {
        const codesData = await codesResponse.json();
        setInviteCodes(codesData.codes || []);
      }
    } catch (error) {
      logger.error('Failed to fetch beta data:', error, { component: 'page', action: 'execution' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const updateFeedbackStatus = async (feedbackIds: string[], status: string, adminResponse?: string, adminNotes?: string) => {
    try {
      const response = await fetch('/api/admin/feedback/status', {
        method: feedbackIds.length === 1 ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          feedbackIds.length === 1
            ? {
                feedbackId: feedbackIds[0],
                status,
                adminResponse,
                adminNotes,
              }
            : {
                feedbackIds,
                status,
                adminResponse,
                adminNotes,
              }
        ),
      });

      if (response.ok) {
        fetchData(); // Refresh data
        setSelectedFeedback(new Set()); // Clear selection
      }
    } catch (error) {
      logger.error('Failed to update feedback status:', error, { component: 'page', action: 'execution' });
    }
  };

  const filteredRequests = betaRequests.filter(request => {
    const matchesSearch = request.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filter === 'all' ||
      (filter === 'approved' && request.access_granted) ||
      (filter === 'pending' && !request.access_granted && !request.user_id) ||
      (filter === 'failed' && !request.access_granted);

    return matchesSearch && matchesFilter;
  });

  const filteredFeedback = betaFeedback.filter(feedback => {
    const matchesSearch =
      feedback.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feedback.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feedback.user?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = feedbackFilter === 'all' || feedback.status === feedbackFilter;
    return matchesSearch && matchesFilter;
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (request: BetaRequest) => {
    if (request.access_granted && request.user_id) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
          <UserCheck className="w-3 h-3 mr-1" />
          Active User
        </span>
      );
    } else if (request.access_granted) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
          <CheckCircle className="w-3 h-3 mr-1" />
          Approved
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
          <XCircle className="w-3 h-3 mr-1" />
          Failed
        </span>
      );
    }
  };

  const StatCard = ({ title, value, subtitle, icon: Icon, color = 'blue', trend }: {
    title: string;
    value: number | string;
    subtitle?: string;
    icon: any;
    color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
    trend?: string;
  }) => {
    const colorClasses: Record<string, string> = {
      blue: 'bg-blue-500',
      green: 'bg-green-500',
      purple: 'bg-purple-500',
      orange: 'bg-orange-500',
      red: 'bg-red-500',
    };

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
            {subtitle && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
            )}
            {trend && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">{trend}</p>
            )}
          </div>
          <div className={`w-12 h-12 ${colorClasses[color]} rounded-lg flex items-center justify-center`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Breadcrumbs currentPage="Beta Program" />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-purple-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Beta Program Management
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Monitor and manage the beta testing program
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {stats.activeUsers}/{stats.capacity} Users
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {stats.capacity - stats.activeUsers} slots remaining
                </div>
              </div>
              {/* Theme Toggle */}
              {mounted && (
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                >
                  {theme === 'dark' ? (
                    <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  ) : (
                    <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  )}
                </button>
              )}
              {/* Back to Main App */}
              <a
                href="/dashboard"
                className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-sm"
              >
                <Globe className="w-4 h-4" />
                Back to App
              </a>
              <button
                onClick={fetchData}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-8">
            {[
              { id: 'requests', label: 'Access Requests', count: stats.totalRequests },
              { id: 'codes', label: 'Invite Codes', count: inviteCodes.length },
              { id: 'users', label: 'Beta Users', count: stats.activeUsers },
              { id: 'feedback', label: 'Feedback', count: betaFeedback.length },
              { id: 'settings', label: 'Settings', count: null },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {tab.label}
                {tab.count !== null && (
                  <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <StatCard
            title="Total Requests"
            value={stats.totalRequests}
            subtitle="All time"
            icon={Users}
            color="blue"
          />
          <StatCard
            title="Conversion Rate"
            value={`${stats.conversionRate}%`}
            subtitle="Approved to active"
            icon={TrendingUp}
            color="green"
            trend="+5% this week"
          />
          <StatCard
            title="Active Users"
            value={`${stats.activeUsers}/${stats.capacity}`}
            subtitle={`${Math.round((stats.activeUsers / stats.capacity) * 100)}% capacity`}
            icon={UserCheck}
            color="purple"
          />
          <StatCard
            title="Avg Activity"
            value={stats.averageActivityScore.toFixed(1)}
            subtitle="Engagement score"
            icon={Activity}
            color="orange"
          />
          <StatCard
            title="Success Rate"
            value={`${Math.round((stats.approvedRequests / Math.max(stats.totalRequests, 1)) * 100)}%`}
            subtitle="Password attempts"
            icon={Target}
            color="red"
          />
        </div>

        {/* Tab Content */}
        {activeTab === 'requests' && (
          <>
            {/* Search and Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-gray-400" />
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as any)}
                    className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
                  >
                    <option value="all">All Requests</option>
                    <option value="approved">Approved</option>
                    <option value="pending">Pending Signup</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Requests Table */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              {isLoading ? (
                <div className="p-12 text-center">
                  <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">Loading beta requests...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Request Details
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Requested
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Location
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredRequests.map((request) => (
                        <tr key={request.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center">
                                <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {request.email}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  IP: {request.ip_address || 'Unknown'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(request)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {formatDate(request.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900 dark:text-white">
                              {request.ip_address || 'Unknown'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300">
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredRequests.length === 0 && (
                    <div className="p-12 text-center">
                      <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">No beta requests found</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'codes' && (
          <>
            {/* Invite Codes Management */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by code or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-gray-400" />
                  <select
                    value={codeFilter}
                    onChange={(e) => setCodeFilter(e.target.value as any)}
                    className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
                  >
                    <option value="all">All Codes</option>
                    <option value="pending">Pending (Unused)</option>
                    <option value="used">Used</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              {isLoading ? (
                <div className="p-12 text-center">
                  <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">Loading invite codes...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Code
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Source
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {inviteCodes
                        .filter(code => {
                          const matchesSearch =
                            code.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            code.email?.toLowerCase().includes(searchTerm.toLowerCase());
                          const now = new Date();
                          const isExpired = code.expires_at && new Date(code.expires_at) < now;
                          const matchesFilter =
                            codeFilter === 'all' ||
                            (codeFilter === 'pending' && !code.used_by && code.is_active && !isExpired) ||
                            (codeFilter === 'used' && code.used_by) ||
                            (codeFilter === 'expired' && isExpired);
                          return matchesSearch && matchesFilter;
                        })
                        .map((code) => {
                          const isExpired = code.expires_at && new Date(code.expires_at) < new Date();
                          return (
                            <tr key={code.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <code className="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                    {code.code}
                                  </code>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(code.code);
                                    }}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                    title="Copy code"
                                  >
                                    <Copy className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {code.email ? (
                                  <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-900 dark:text-white">{code.email}</span>
                                  </div>
                                ) : (
                                  <span className="text-sm text-gray-400">Not assigned</span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                {code.used_by ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Used
                                  </span>
                                ) : isExpired ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Expired
                                  </span>
                                ) : !code.is_active ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400">
                                    <XCircle className="w-3 h-3 mr-1" />
                                    Inactive
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                                    <Clock className="w-3 h-3 mr-1" />
                                    Pending
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-sm text-gray-900 dark:text-white capitalize">
                                  {code.source?.replace('_', ' ') || 'Unknown'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                {formatDate(code.created_at)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <button className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300">
                                  <Eye className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                  {inviteCodes.length === 0 && (
                    <div className="p-12 text-center">
                      <Ticket className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">No invite codes found</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'users' && (
          <>
            {/* User Management */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Beta Users Management
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Monitor user activity and online presence
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    {betaUsers.filter(u => u.is_online).length} online now
                  </div>
                </div>
              </div>

              {isLoading ? (
                <div className="p-12 text-center">
                  <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">Loading users...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Beta Since
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Last Activity
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {betaUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="relative">
                                {user.avatar_url ? (
                                  <img
                                    className="w-10 h-10 rounded-full"
                                    src={user.avatar_url}
                                    alt=""
                                    loading="lazy"
                                    decoding="async"
                                  />
                                ) : (
                                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center">
                                    <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                                  </div>
                                )}
                                {user.is_online && (
                                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                                )}
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {user.full_name || 'Unknown'}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {user.email}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {user.is_online ? (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                                  <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
                                  Online
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400">
                                  <div className="w-2 h-2 bg-gray-500 rounded-full mr-1"></div>
                                  Offline
                                </span>
                              )}
                              {user.is_beta_tester && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400">
                                  <Award className="w-3 h-3 mr-1" />
                                  Beta
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {formatDate(user.beta_signup_date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {user.is_online ? 'Active now' : formatDate(user.last_seen)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300">
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {betaUsers.length === 0 && (
                    <div className="p-12 text-center">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">No beta users found</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'feedback' && (
          <>
            {/* Feedback Management */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search feedback..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-gray-400" />
                  <select
                    value={feedbackFilter}
                    onChange={(e) => setFeedbackFilter(e.target.value as any)}
                    className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 dark:text-white"
                  >
                    <option value="all">All Feedback</option>
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                {selectedFeedback.size > 0 && (
                  <div className="flex items-center gap-2">
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          updateFeedbackStatus(Array.from(selectedFeedback), e.target.value);
                        }
                      }}
                      className="px-3 py-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-300 dark:border-purple-600 rounded-lg focus:ring-2 focus:ring-purple-500 text-purple-900 dark:text-purple-100"
                    >
                      <option value="">Update Status ({selectedFeedback.size})</option>
                      <option value="open">Mark as Open</option>
                      <option value="in_progress">Mark as In Progress</option>
                      <option value="resolved">Mark as Resolved</option>
                      <option value="closed">Mark as Closed</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              {isLoading ? (
                <div className="p-12 text-center">
                  <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">Loading feedback...</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-6 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectedFeedback.size === filteredFeedback.length && filteredFeedback.length > 0}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedFeedback(new Set(filteredFeedback.map(f => f.id)));
                              } else {
                                setSelectedFeedback(new Set());
                              }
                            }}
                            className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Feedback
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Priority
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Engagement
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Created
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {filteredFeedback.map((feedback) => (
                        <tr key={feedback.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={selectedFeedback.has(feedback.id)}
                              onChange={(e) => {
                                const newSelected = new Set(selectedFeedback);
                                if (e.target.checked) {
                                  newSelected.add(feedback.id);
                                } else {
                                  newSelected.delete(feedback.id);
                                }
                                setSelectedFeedback(newSelected);
                              }}
                              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="max-w-xs">
                              <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {feedback.title}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                <div className="truncate">{feedback.description}</div>
                                <div className="text-xs mt-1">
                                  by {feedback.user?.full_name || feedback.user?.email || 'Unknown'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              feedback.status === 'open'
                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                                : feedback.status === 'in_progress'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                                : feedback.status === 'resolved'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                            }`}>
                              {feedback.status === 'open' && <AlertTriangle className="w-3 h-3 mr-1" />}
                              {feedback.status === 'in_progress' && <Clock className="w-3 h-3 mr-1" />}
                              {feedback.status === 'resolved' && <CheckCircle className="w-3 h-3 mr-1" />}
                              {feedback.status === 'closed' && <XCircle className="w-3 h-3 mr-1" />}
                              {feedback.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              feedback.priority === 'critical'
                                ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                : feedback.priority === 'high'
                                ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
                                : feedback.priority === 'medium'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                                : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                            }`}>
                              {feedback.priority}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1">
                                <TrendingUp className="w-4 h-4 text-purple-500" />
                                {feedback.votes_count || 0}
                              </div>
                              <div className="flex items-center gap-1">
                                <Globe className="w-4 h-4 text-blue-500" />
                                {feedback.comments_count || 0}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {formatDate(feedback.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center gap-2 justify-end">
                              <select
                                value={feedback.status}
                                onChange={(e) => updateFeedbackStatus([feedback.id], e.target.value)}
                                className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                              >
                                <option value="open">Open</option>
                                <option value="in_progress">In Progress</option>
                                <option value="resolved">Resolved</option>
                                <option value="closed">Closed</option>
                              </select>
                              <button className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300">
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredFeedback.length === 0 && (
                    <div className="p-12 text-center">
                      <Globe className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">No feedback found</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            {/* Beta Program Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Beta Program Settings
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Maximum Beta Users
                  </label>
                  <input
                    type="number"
                    value={stats.capacity}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                    min="1"
                    max="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Beta Password
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      value="RowanApp2025&$&$&$"
                      autoComplete="off"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white pr-10"
                      readOnly
                    />
                    <Lock className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Recent Activity
              </h3>
              <div className="space-y-3">
                {stats.recentActivity.slice(0, 10).map((activity, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className={`w-2 h-2 rounded-full ${
                      activity.type === 'approval' ? 'bg-green-500' :
                      activity.type === 'request' ? 'bg-blue-500' :
                      activity.type === 'signup' ? 'bg-purple-500' :
                      'bg-gray-500'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 dark:text-white">
                        <span className="font-medium">{activity.email}</span> {activity.details}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
                {stats.recentActivity.length === 0 && (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                    No recent activity
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}