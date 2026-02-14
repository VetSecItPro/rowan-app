'use client';

import { useState } from 'react';
import { User, Eye, Ban, Trash2, X, AlertTriangle } from 'lucide-react';
import { csrfFetch } from '@/lib/utils/csrf-fetch';

interface User {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  status: 'active' | 'inactive' | 'suspended';
}

interface UsersTableProps {
  users: User[];
  isLoading: boolean;
  searchTerm: string;
  filter: 'all' | 'active' | 'inactive';
}

/** Renders a sortable, filterable table of user accounts for admin management. */
export function UsersTable({ users, isLoading, searchTerm, filter }: UsersTableProps) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const filteredUsers = users.filter(user => {
    const matchesSearch = (user.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      filter === 'all' ||
      (filter === 'active' && user.status === 'active') ||
      (filter === 'inactive' && user.status === 'inactive');

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

  const handleUserAction = async (action: 'ban' | 'delete') => {
    if (!selectedUser) return;

    setActionInProgress(true);
    setActionError(null);

    try {
      const response = await csrfFetch(`/api/admin/users/${selectedUser.id}/${action}`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Action failed');
      }

      // Close modal and refresh parent component
      setSelectedUser(null);
      window.location.reload(); // Simple refresh for now
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setActionInProgress(false);
    }
  };

  const getUserStatusBadge = (user: User) => {
    switch (user.status) {
      case 'active':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-900/20 text-green-400">
            Active
          </span>
        );
      case 'inactive':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-900/20 text-gray-400">
            Inactive
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-900/20 text-red-400">
            Suspended
          </span>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="p-12 text-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Loading users...</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-700">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              User
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Joined
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Last Sign In
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {filteredUsers.map((user) => (
            <tr
              key={user.id}
              onClick={() => setSelectedUser(user)}
              className="hover:bg-gray-700/50 cursor-pointer transition-colors"
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-white">
                      {user.email}
                    </div>
                    <div className="text-sm text-gray-400">
                      ID: {user.id.slice(0, 8)}...
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {getUserStatusBadge(user)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                {formatDate(user.created_at)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                {formatDate(user.last_sign_in_at)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedUser(user);
                  }}
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                  title="Manage user"
                >
                  <Eye className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {filteredUsers.length === 0 && (
        <div className="p-12 text-center">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400">No users found</p>
        </div>
      )}

      {/* User Actions Modal */}
      {selectedUser && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white">
                Manage User
              </h3>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-gray-400 hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* User Info */}
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-gray-600 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {selectedUser.email}
                    </p>
                    <p className="text-xs text-gray-400">
                      ID: {selectedUser.id.slice(0, 8)}...
                    </p>
                  </div>
                </div>
                {getUserStatusBadge(selectedUser)}
              </div>

              {/* Error Message */}
              {actionError && (
                <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300">{actionError}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2">
                <button
                  onClick={() => handleUserAction('ban')}
                  disabled={actionInProgress}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-orange-900/20 border border-orange-800 rounded-lg hover:bg-orange-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Ban className="w-5 h-5 text-orange-400" />
                  <div className="text-left flex-1">
                    <p className="text-sm font-medium text-orange-300">
                      Suspend User
                    </p>
                    <p className="text-xs text-orange-400">
                      Temporarily block access to the platform
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => handleUserAction('delete')}
                  disabled={actionInProgress}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-red-900/20 border border-red-800 rounded-lg hover:bg-red-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-5 h-5 text-red-400" />
                  <div className="text-left flex-1">
                    <p className="text-sm font-medium text-red-300">
                      Delete User
                    </p>
                    <p className="text-xs text-red-400">
                      Permanently remove user and all data
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-700/50 border-t border-gray-700 rounded-b-lg">
              <button
                onClick={() => setSelectedUser(null)}
                disabled={actionInProgress}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
