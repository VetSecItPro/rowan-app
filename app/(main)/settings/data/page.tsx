'use client';

/**
 * Data Management Settings Page
 * Displays storage usage and allows users to manage and delete files
 */

// Force dynamic rendering
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { logger } from '@/lib/logger';
import {
  HardDrive,
  Trash2,
  RefreshCw,
  AlertCircle,
  FileImage,
  File,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { formatBytes } from '@/lib/utils/format';
import type { StorageUsage } from '@/lib/services/storage-service';

interface StorageFile {
  id: string;
  name: string;
  size: number;
  created_at: string;
  metadata: any;
}

export default function DataManagementPage() {
  const router = useRouter();
  const { user, currentSpace, loading: authLoading } = useAuthWithSpaces();

  const [storageUsage, setStorageUsage] = useState<StorageUsage | null>(null);
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isLoadingUsage, setIsLoadingUsage] = useState(true);
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load storage usage
  useEffect(() => {
    if (!currentSpace?.id) return;

    loadStorageUsage();
  }, [currentSpace?.id]);

  // Load files list
  useEffect(() => {
    if (!currentSpace?.id) return;

    loadFiles();
  }, [currentSpace?.id]);

  const loadStorageUsage = async () => {
    if (!currentSpace?.id) return;

    setIsLoadingUsage(true);
    setError(null);

    try {
      const response = await fetch(`/api/storage/usage?spaceId=${currentSpace.id}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load storage usage');
      }

      const data = await response.json();
      setStorageUsage(data.usage);
    } catch (err) {
      logger.error('Error loading storage usage:', err, { component: 'page', action: 'execution' });
      setError(err instanceof Error ? err.message : 'Failed to load storage usage');
    } finally {
      setIsLoadingUsage(false);
    }
  };

  const loadFiles = async () => {
    if (!currentSpace?.id) return;

    setIsLoadingFiles(true);

    try {
      const response = await fetch(`/api/storage/files?spaceId=${currentSpace.id}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load files');
      }

      const data = await response.json();
      setFiles(data.files || []);
    } catch (err) {
      logger.error('Error loading files:', err, { component: 'page', action: 'execution' });
      // Don't set error here - files are optional
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedFiles.size === 0) return;

    if (!confirm(`Are you sure you want to delete ${selectedFiles.size} file(s)? This cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch('/api/storage/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spaceId: currentSpace?.id,
          fileIds: Array.from(selectedFiles),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete files');
      }

      // Reload both usage and files
      await Promise.all([loadStorageUsage(), loadFiles()]);

      // Clear selection
      setSelectedFiles(new Set());
    } catch (err) {
      logger.error('Error deleting files:', err, { component: 'page', action: 'execution' });
      setError(err instanceof Error ? err.message : 'Failed to delete files');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleFileSelection = (fileId: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(fileId)) {
      newSelection.delete(fileId);
    } else {
      newSelection.add(fileId);
    }
    setSelectedFiles(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map(f => f.id)));
    }
  };

  const getPercentageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-600 dark:bg-red-500';
    if (percentage >= 80) return 'bg-orange-600 dark:bg-orange-500';
    return 'bg-emerald-600 dark:bg-emerald-500';
  };

  if (authLoading) {
    return (
      <FeatureLayout breadcrumbItems={[{ label: 'Settings', href: '/settings' }, { label: 'Data Management' }]}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </FeatureLayout>
    );
  }

  if (!user || !currentSpace) {
    return (
      <FeatureLayout breadcrumbItems={[{ label: 'Settings', href: '/settings' }, { label: 'Data Management' }]}>
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">Please sign in to manage your data.</p>
        </div>
      </FeatureLayout>
    );
  }

  return (
    <FeatureLayout breadcrumbItems={[{ label: 'Settings', href: '/settings' }, { label: 'Data Management' }]}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Button */}
        <button
          onClick={() => router.push('/settings')}
          className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Settings
        </button>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-red-900 dark:text-red-100 mb-1">Error</h4>
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        )}

        {/* Storage Usage Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                Storage Usage
              </h2>
              <button
                onClick={loadStorageUsage}
                disabled={isLoadingUsage}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingUsage ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {isLoadingUsage ? (
              <div className="flex items-center justify-center h-24">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : storageUsage ? (
              <div className="space-y-4">
                {/* Usage Bar */}
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600 dark:text-gray-400">
                      {formatBytes(storageUsage.totalBytes)} of {formatBytes(storageUsage.limitBytes)}
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {Math.round(storageUsage.percentageUsed)}%
                    </span>
                  </div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${getPercentageColor(storageUsage.percentageUsed)}`}
                      style={{ width: `${Math.min(storageUsage.percentageUsed, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Files</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {storageUsage.fileCount}
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Available</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatBytes(storageUsage.limitBytes - storageUsage.totalBytes)}
                    </p>
                  </div>
                </div>

                {/* Warning Messages */}
                {storageUsage.percentageUsed >= 80 && (
                  <div className={`p-4 rounded-lg ${
                    storageUsage.percentageUsed >= 90
                      ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                      : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                  }`}>
                    <p className={`text-sm ${
                      storageUsage.percentageUsed >= 90
                        ? 'text-red-700 dark:text-red-300'
                        : 'text-amber-700 dark:text-amber-300'
                    }`}>
                      {storageUsage.percentageUsed >= 100
                        ? 'Your storage is full! Delete files to free up space.'
                        : storageUsage.percentageUsed >= 90
                          ? 'Your storage is almost full. Consider deleting older files.'
                          : 'You\'re using over 80% of your storage. You might want to review your files soon.'}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-center text-gray-600 dark:text-gray-400 py-8">
                No storage data available
              </p>
            )}
          </div>
        </div>

        {/* Files List Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <FileImage className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                Files ({files.length})
              </h2>
              {selectedFiles.size > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  disabled={isDeleting}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Delete Selected ({selectedFiles.size})
                </button>
              )}
            </div>
          </div>

          <div className="p-6">
            {isLoadingFiles ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : files.length === 0 ? (
              <div className="text-center py-12">
                <FileImage className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No files found</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                  Files you upload will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Select All */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <input
                    type="checkbox"
                    checked={selectedFiles.size === files.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Select All
                  </span>
                </div>

                {/* File List */}
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedFiles.has(file.id)}
                      onChange={() => toggleFileSelection(file.id)}
                      className="w-4 h-4 text-emerald-600 rounded focus:ring-2 focus:ring-emerald-500"
                    />
                    <File className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatBytes(file.size)} • {new Date(file.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Help Card */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Need More Space?
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
            Upgrade to Pro for 5GB or Family for 15GB of storage space. Cloud storage integrations (Dropbox, Google Drive) coming soon!
          </p>
          <button
            onClick={() => router.push('/pricing')}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors text-sm font-medium"
          >
            View Pricing
          </button>
        </div>
      </div>
    </FeatureLayout>
  );
}
