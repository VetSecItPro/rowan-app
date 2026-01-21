'use client';

import { useState, memo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Download,
  FileText,
  Users,
  Mail,
  Shield,
  MessageSquare,
  Calendar,
  CheckCircle,
  Loader2,
  FileSpreadsheet,
} from 'lucide-react';
import { logger } from '@/lib/logger';

interface ExportOption {
  id: string;
  name: string;
  description: string;
  icon: typeof Users;
  endpoint: string;
  count?: number;
  color: string;
}

const ExportCard = memo(function ExportCard({
  option,
  onExport,
  isExporting,
}: {
  option: ExportOption;
  onExport: (option: ExportOption) => void;
  isExporting: boolean;
}) {
  const Icon = option.icon;

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-lg ${option.color} flex items-center justify-center`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">{option.name}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{option.description}</p>
            {option.count !== undefined && (
              <p className="text-xs text-gray-300 mt-1 font-medium">
                {option.count.toLocaleString()} records
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => onExport(option)}
          disabled={isExporting}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isExporting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          Export CSV
        </button>
      </div>
    </div>
  );
});

export const ExportPanel = memo(function ExportPanel() {
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [lastExport, setLastExport] = useState<{ name: string; time: Date } | null>(null);

  // Fetch counts for export options
  const { data: counts } = useQuery({
    queryKey: ['admin-export-counts'],
    queryFn: async () => {
      // Fetch counts in parallel
      const [usersRes, notificationsRes, betaRes, feedbackRes] = await Promise.allSettled([
        fetch('/api/admin/users?range=all').then(r => r.json()),
        fetch('/api/admin/notifications?limit=1').then(r => r.json()),
        fetch('/api/admin/beta-requests?range=all').then(r => r.json()),
        fetch('/api/admin/feedback?range=90d').then(r => r.json()),
      ]);

      return {
        users: usersRes.status === 'fulfilled' ? (usersRes.value.users?.length || 0) : 0,
        notifications: notificationsRes.status === 'fulfilled' ? (notificationsRes.value.pagination?.total || 0) : 0,
        beta: betaRes.status === 'fulfilled' ? (betaRes.value.requests?.length || 0) : 0,
        feedback: feedbackRes.status === 'fulfilled' ? (feedbackRes.value.data?.length || 0) : 0,
      };
    },
    staleTime: 5 * 60 * 1000,
  });

  const exportOptions: ExportOption[] = [
    {
      id: 'users',
      name: 'Users',
      description: 'Export all registered users with activity data',
      icon: Users,
      endpoint: '/api/admin/users?range=all',
      count: counts?.users,
      color: 'bg-blue-500',
    },
    {
      id: 'notifications',
      name: 'Launch Notifications',
      description: 'Export email subscribers and their signup sources',
      icon: Mail,
      endpoint: '/api/admin/notifications/export',
      count: counts?.notifications,
      color: 'bg-green-500',
    },
    {
      id: 'beta',
      name: 'Beta Requests',
      description: 'Export beta access requests and approval status',
      icon: Shield,
      endpoint: '/api/admin/beta-requests?range=all',
      count: counts?.beta,
      color: 'bg-purple-500',
    },
    {
      id: 'feedback',
      name: 'Feedback',
      description: 'Export user feedback submissions and status',
      icon: MessageSquare,
      endpoint: '/api/admin/feedback?range=90d',
      count: counts?.feedback,
      color: 'bg-pink-500',
    },
  ];

  const handleExport = useCallback(async (option: ExportOption) => {
    setExportingId(option.id);

    try {
      const response = await fetch(option.endpoint);
      if (!response.ok) throw new Error('Export failed');

      const data = await response.json();
      let records: Record<string, unknown>[] = [];
      const filename = `${option.id}-export-${new Date().toISOString().split('T')[0]}.csv`;

      // Handle different response formats
      if (option.id === 'users') {
        records = data.users || [];
      } else if (option.id === 'notifications') {
        records = data.notifications || [];
      } else if (option.id === 'beta') {
        records = data.requests || [];
      } else if (option.id === 'feedback') {
        records = data.data || [];
      }

      if (records.length === 0) {
        throw new Error('No data to export');
      }

      // Get headers from first record
      const headers = Object.keys(records[0]);

      // Generate CSV content
      const csvRows = [
        headers.join(','),
        ...records.map(record =>
          headers.map(header => {
            const value = record[header];
            const cellValue = value === null || value === undefined ? '' : String(value);
            // Escape quotes and wrap in quotes if contains comma or quote
            if (cellValue.includes(',') || cellValue.includes('"') || cellValue.includes('\n')) {
              return `"${cellValue.replace(/"/g, '""')}"`;
            }
            return cellValue;
          }).join(',')
        ),
      ];

      const csvContent = csvRows.join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setLastExport({ name: option.name, time: new Date() });
    } catch (error) {
      logger.error('Export failed:', error, { component: 'ExportPanel', action: 'component_action' });
      alert('Export failed. Please try again.');
    } finally {
      setExportingId(null);
    }
  }, []);

  return (
    <div className="flex-1 flex flex-col space-y-4 min-h-0 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-gray-500" />
          <span className="text-sm font-medium text-white">Data Export</span>
        </div>
        {lastExport && (
          <div className="flex items-center gap-2 text-xs text-green-400">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>
              Exported {lastExport.name} at {lastExport.time.toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
        <div className="flex gap-3">
          <FileText className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-blue-200">Export Data to CSV</h4>
            <p className="text-xs text-blue-300 mt-1">
              Export your data in CSV format for use in spreadsheet applications. All exports include
              timestamps and are compatible with Excel, Google Sheets, and other tools.
            </p>
          </div>
        </div>
      </div>

      {/* Export Options Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {exportOptions.map((option) => (
          <ExportCard
            key={option.id}
            option={option}
            onExport={handleExport}
            isExporting={exportingId === option.id}
          />
        ))}
      </div>

      {/* Recent Exports (placeholder for future enhancement) */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-white">Export History</span>
        </div>
        <div className="text-center py-4 text-gray-400 text-sm">
          <Download className="w-6 h-6 mx-auto mb-2 opacity-50" />
          <p>Export history will be tracked here</p>
          <p className="text-xs mt-1">Downloads are processed locally for security</p>
        </div>
      </div>
    </div>
  );
});
