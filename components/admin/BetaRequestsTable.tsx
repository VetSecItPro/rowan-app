'use client';

import { Mail, Shield, Eye, UserCheck, AlertTriangle } from 'lucide-react';

interface BetaRequest {
  id: string;
  email: string;
  access_granted: boolean;
  created_at: string;
  user_id: string | null;
}

interface BetaRequestsTableProps {
  betaRequests: BetaRequest[];
  isLoading: boolean;
  searchTerm: string;
}

export function BetaRequestsTable({ betaRequests, isLoading, searchTerm }: BetaRequestsTableProps) {
  const filteredBetaRequests = betaRequests.filter(request =>
    (request.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

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

  if (isLoading) {
    return (
      <div className="p-12 text-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-400">Loading beta requests...</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-700">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Email
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              Requested
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
              User Account
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {filteredBetaRequests.map((request) => (
            <tr key={request.id} className="hover:bg-gray-700/50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <Mail className="w-5 h-5 text-gray-400 mr-3" />
                  <div className="text-sm font-medium text-white">
                    {request.email}
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {request.access_granted ? (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 bg-green-900/20 text-green-400">
                    <UserCheck className="w-3 h-3 mr-1" />
                    Invite Sent
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 bg-gray-700 text-gray-400">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    No Invite
                  </span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                {formatDate(request.created_at)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                {request.user_id ? (
                  <span className="text-green-400">Created</span>
                ) : (
                  <span className="text-gray-400">Not created</span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button className="text-blue-600 text-blue-400 hover:text-blue-300">
                  <Eye className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {filteredBetaRequests.length === 0 && (
        <div className="p-12 text-center">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400">No beta requests found</p>
        </div>
      )}
    </div>
  );
}