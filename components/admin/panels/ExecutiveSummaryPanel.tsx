'use client';

import { memo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminFetch } from '@/lib/providers/query-client-provider';
import {
  Link,
  Copy,
  Check,
  Plus,
  Trash2,
  ExternalLink,
  Calendar,
  Eye,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { logger } from '@/lib/logger';

interface InvestorToken {
  id: string;
  token: string;
  label: string | null;
  expires_at: string;
  created_by: string;
  last_accessed: string | null;
  access_count: number;
  is_revoked: boolean;
  created_at: string;
}

interface GenerateTokenFormData {
  label: string;
  expiryDays: number;
}

/** Executive Summary Panel - Manage investor summary access tokens */
export const ExecutiveSummaryPanel = memo(function ExecutiveSummaryPanel() {
  const queryClient = useQueryClient();
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [formData, setFormData] = useState<GenerateTokenFormData>({
    label: '',
    expiryDays: 90,
  });
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);

  // Fetch tokens
  const { data: tokensData, isLoading } = useQuery({
    queryKey: ['admin-investor-tokens'],
    queryFn: async () => {
      const response = await adminFetch('/api/admin/investor-tokens');
      if (!response.ok) throw new Error('Failed to fetch tokens');
      const data = await response.json();
      return data.tokens as InvestorToken[];
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  // Generate token mutation
  const generateMutation = useMutation({
    mutationFn: async (data: GenerateTokenFormData) => {
      const response = await adminFetch('/api/admin/investor-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate token');
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-investor-tokens'] });
      setGeneratedToken(data.token.token);
      setShowGenerateForm(false);
      setFormData({ label: '', expiryDays: 90 });
      logger.info('Investor token generated', {
        component: 'admin-panel',
        action: 'token_generated',
      });
    },
    onError: (error) => {
      logger.error('Failed to generate token:', error, {
        component: 'admin-panel',
        action: 'token_generation_failed',
      });
      alert('Failed to generate token. Please try again.');
    },
  });

  // Revoke token mutation
  const revokeMutation = useMutation({
    mutationFn: async (tokenId: string) => {
      const response = await adminFetch(`/api/admin/investor-tokens?id=${tokenId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to revoke token');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-investor-tokens'] });
      logger.info('Investor token revoked', {
        component: 'admin-panel',
        action: 'token_revoked',
      });
    },
    onError: (error) => {
      logger.error('Failed to revoke token:', error, {
        component: 'admin-panel',
        action: 'token_revocation_failed',
      });
      alert('Failed to revoke token. Please try again.');
    },
  });

  const handleCopyToken = async (token: string) => {
    const url = `${window.location.origin}/investor-summary/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    } catch (error) {
      logger.error('Failed to copy token:', error, {
        component: 'admin-panel',
        action: 'copy_failed',
      });
      alert('Failed to copy URL. Please try again.');
    }
  };

  const handleRevokeToken = async (tokenId: string, label: string | null) => {
    if (!confirm(`Are you sure you want to revoke this token${label ? ` (${label})` : ''}?`)) {
      return;
    }
    revokeMutation.mutate(tokenId);
  };

  const handleGenerateToken = () => {
    if (formData.expiryDays <= 0) {
      alert('Expiry days must be a positive number.');
      return;
    }
    generateMutation.mutate(formData);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const tokens = tokensData || [];
  const activeTokens = tokens.filter((t) => !t.is_revoked && !isExpired(t.expires_at));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-sm text-gray-400">Loading tokens...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Executive Summary Links</h2>
          <p className="text-sm text-gray-400 mt-1">
            Generate secure links for investors and stakeholders to view business metrics
          </p>
        </div>
        <button
          onClick={() => setShowGenerateForm(!showGenerateForm)}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Generate New Link
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <Link className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{activeTokens.length}</p>
              <p className="text-xs text-gray-400">Active Links</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
              <Eye className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {tokens.reduce((sum, t) => sum + t.access_count, 0)}
              </p>
              <p className="text-xs text-gray-400">Total Views</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {tokens.filter((t) => t.is_revoked).length}
              </p>
              <p className="text-xs text-gray-400">Revoked</p>
            </div>
          </div>
        </div>
      </div>

      {/* Generate Form */}
      {showGenerateForm && (
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Generate New Access Link</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Label (Optional)
              </label>
              <input
                type="text"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="e.g., Series A Investor, Board Member"
                className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Expiry Period
              </label>
              <select
                value={formData.expiryDays}
                onChange={(e) => setFormData({ ...formData, expiryDays: Number(e.target.value) })}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
                <option value={365}>1 year</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleGenerateToken}
                disabled={generateMutation.isPending}
                className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                {generateMutation.isPending ? 'Generating...' : 'Generate Link'}
              </button>
              <button
                onClick={() => setShowGenerateForm(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generated Token Alert */}
      {generatedToken && (
        <div className="bg-green-900/20 border border-green-700 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-green-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-green-400 mb-2">Link Generated Successfully!</h3>
              <p className="text-sm text-gray-300 mb-3">
                Copy this link and share it with the intended recipient. This link will not be shown again.
              </p>
              <div className="flex items-center gap-2 bg-gray-900 rounded-lg p-3 border border-gray-700">
                <code className="flex-1 text-sm text-gray-300 break-all">
                  {`${window.location.origin}/investor-summary/${generatedToken}`}
                </code>
                <button
                  onClick={() => handleCopyToken(generatedToken)}
                  className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
                >
                  {copiedToken === generatedToken ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={() => setGeneratedToken(null)}
            className="mt-4 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tokens List */}
      {tokens.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-12 border border-gray-700 text-center">
          <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Link className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No Investor Links Generated Yet</h3>
          <p className="text-sm text-gray-400 mb-6">
            Create a secure link to share business metrics with investors and stakeholders.
          </p>
          <button
            onClick={() => setShowGenerateForm(true)}
            className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
          >
            Generate Your First Link
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {tokens.map((token) => (
            <div
              key={token.id}
              className={`bg-gray-800 rounded-xl p-5 border transition-colors ${
                token.is_revoked
                  ? 'border-red-900 bg-red-900/10'
                  : isExpired(token.expires_at)
                  ? 'border-yellow-900 bg-yellow-900/10'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    {token.label ? (
                      <h4 className="text-base font-semibold text-white">{token.label}</h4>
                    ) : (
                      <h4 className="text-base font-semibold text-gray-400">Unlabeled Link</h4>
                    )}
                    {token.is_revoked && (
                      <span className="px-2 py-1 bg-red-900/30 text-red-400 text-xs font-medium rounded">
                        Revoked
                      </span>
                    )}
                    {!token.is_revoked && isExpired(token.expires_at) && (
                      <span className="px-2 py-1 bg-yellow-900/30 text-yellow-400 text-xs font-medium rounded">
                        Expired
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-gray-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>Created: {formatDate(token.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Expires: {formatDate(token.expires_at)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      <span>{token.access_count} views</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {token.last_accessed ? (
                        <>
                          <AlertCircle className="w-3 h-3" />
                          <span>Last: {formatDateTime(token.last_accessed)}</span>
                        </>
                      ) : (
                        <span className="text-gray-500">Never accessed</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!token.is_revoked && !isExpired(token.expires_at) && (
                    <>
                      <button
                        onClick={() => handleCopyToken(token.token)}
                        className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                        title="Copy link"
                      >
                        {copiedToken === token.token ? (
                          <>
                            <Check className="w-4 h-4" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copy
                          </>
                        )}
                      </button>
                      <a
                        href={`/investor-summary/${token.token}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                        title="Open in new tab"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </>
                  )}
                  {!token.is_revoked && (
                    <button
                      onClick={() => handleRevokeToken(token.id, token.label)}
                      disabled={revokeMutation.isPending}
                      className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors"
                      title="Revoke access"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
