'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  Search,
  Filter,
  Download,
  Shield,
  Mail,
  Calendar,
  User,
  Settings,
  ArrowLeft,
  Eye,
  MoreVertical,
  UserCheck,
  UserX,
  AlertTriangle
} from 'lucide-react';
import { AdminUsersTable, AdminBetaRequestsTable } from '@/components/ui/DynamicLoaders';

// Import interfaces from component files
interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  is_beta: boolean;
  status: 'active' | 'inactive' | 'suspended';
}

interface BetaRequest {
  id: string;
  email: string;
  access_granted: boolean;
  created_at: string;
  user_id: string | null;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [betaRequests, setBetaRequests] = useState<BetaRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'beta' | 'active' | 'inactive'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'users' | 'beta'>('users');

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // Fetch users and beta requests in parallel
      const [usersResponse, betaResponse] = await Promise.all([
        fetch('/api/admin/users'),
        fetch('/api/admin/beta-requests')
      ]);

      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData.users || []);
      }

      if (betaResponse.ok) {
        const betaData = await betaResponse.json();
        setBetaRequests(betaData.requests || []);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtering logic moved to dynamic table components

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    User Management
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    Manage registered users and beta access requests
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <Download className="w-4 h-4" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-8">
            <button
              onClick={() => setSelectedTab('users')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                selectedTab === 'users'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              All Users ({users.length})
            </button>
            <button
              onClick={() => setSelectedTab('beta')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                selectedTab === 'beta'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Beta Requests ({betaRequests.length})
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
              />
            </div>

            {/* Filter */}
            {selectedTab === 'users' && (
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 dark:text-white"
                >
                  <option value="all">All Users</option>
                  <option value="beta">Beta Users</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Data Table - Dynamic Loading */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {selectedTab === 'users' ? (
            <AdminUsersTable
              users={users}
              isLoading={isLoading}
              searchTerm={searchTerm}
              filter={filter}
            />
          ) : (
            <AdminBetaRequestsTable
              betaRequests={betaRequests}
              isLoading={isLoading}
              searchTerm={searchTerm}
            />
          )}
        </div>
      </div>
    </div>
  );
}