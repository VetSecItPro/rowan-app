'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import { useAuth } from '@/lib/contexts/auth-context';
import { ExportDataModal } from '@/components/settings/ExportDataModal';
import { logger } from '@/lib/logger';
import {
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  Calendar,
  CheckCircle,
  Info,
  ArrowRight,
} from 'lucide-react';

type DataType = 'expenses' | 'tasks' | 'calendar_events' | 'messages' | 'reminders';

export default function DataExportPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'pdf'>('json');
  const [selectedDataType, setSelectedDataType] = useState<DataType>('expenses');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  if (!user) {
    return null;
  }

  const handleDateRangeExport = async () => {
    if (!startDate || !endDate) {
      alert('Please select both start and end dates');
      return;
    }

    setIsExporting(true);

    try {
      const format = exportFormat === 'json' ? 'json' : 'csv';
      const response = await fetch(
        `/api/bulk/export-by-date?type=${selectedDataType}&start_date=${startDate}&end_date=${endDate}&format=${format}`
      );

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedDataType}-${startDate}-to-${endDate}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      logger.error('Export error:', error, { component: 'page', action: 'execution' });
      alert('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const exportFormats = [
    {
      id: 'json',
      name: 'JSON',
      icon: FileJson,
      description: 'Machine-readable format for developers',
      color: 'blue',
      gradient: 'from-blue-500 to-blue-600',
    },
    {
      id: 'csv',
      name: 'CSV',
      icon: FileSpreadsheet,
      description: 'Spreadsheet format (Excel, Google Sheets)',
      color: 'green',
      gradient: 'from-green-500 to-green-600',
    },
    {
      id: 'pdf',
      name: 'PDF',
      icon: FileText,
      description: 'Formatted document with tables',
      color: 'purple',
      gradient: 'from-purple-500 to-purple-600',
    },
  ];

  const dataTypes = [
    { value: 'expenses' as DataType, label: 'Expenses', description: 'Budget transactions and spending records' },
    { value: 'tasks' as DataType, label: 'Tasks', description: 'Tasks and chores with completion status' },
    { value: 'calendar_events' as DataType, label: 'Calendar Events', description: 'Events and scheduling data' },
    { value: 'messages' as DataType, label: 'Messages', description: 'Conversations and communications' },
    { value: 'reminders' as DataType, label: 'Reminders', description: 'Scheduled reminders and notifications' },
  ];

  return (
    <FeatureLayout breadcrumbItems={[
      { label: 'Settings', href: '/settings' },
      { label: 'Data Privacy', href: '/settings/data-privacy' },
      { label: 'Export Your Data' }
    ]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gray-800/30 backdrop-blur-xl border border-gray-700/20 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <Download className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white mb-2">Export Your Data</h1>
              <p className="text-gray-400">
                Download your data in multiple formats. Export everything or filter by date range and data type.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Export - All Data */}
        <div className="bg-gray-800/30 backdrop-blur-xl border border-gray-700/20 rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Export All Data</h2>
          <p className="text-sm text-gray-400 mb-6">
            Export all your data across all categories in a single file. Choose your preferred format below.
          </p>

          <button
            onClick={() => setShowExportModal(true)}
            className="w-full md:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all font-medium flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" />
            Open Export Wizard
          </button>
        </div>

        {/* Export by Date Range */}
        <div className="bg-gray-800/30 backdrop-blur-xl border border-gray-700/20 rounded-2xl p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-white mb-1">Export by Date Range</h2>
              <p className="text-sm text-gray-400">
                Export specific data types within a custom date range
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Data Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Select Data Type
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {dataTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setSelectedDataType(type.value)}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      selectedDataType === type.value
                        ? 'border-blue-500 bg-blue-900/20'
                        : 'border-gray-700 hover:border-gray-600'
                    }`}
                  >
                    <p className="font-medium text-white">{type.label}</p>
                    <p className="text-xs text-gray-400 mt-1">{type.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Format Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Select Format
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {exportFormats.map((format) => {
                  const Icon = format.icon;
                  return (
                    <button
                      key={format.id}
                      onClick={() => setExportFormat(format.id as any)}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        exportFormat === format.id
                          ? `border-${format.color}-500 bg-${format.color}-50 bg-${format.color}-900/20`
                          : 'border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-10 h-10 bg-gradient-to-br ${format.gradient} rounded-lg flex items-center justify-center`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        <p className="font-semibold text-white">{format.name}</p>
                      </div>
                      <p className="text-xs text-gray-400">{format.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date Range Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Export Button */}
            <button
              onClick={handleDateRangeExport}
              disabled={!startDate || !endDate || isExporting}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
            >
              {isExporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Export {selectedDataType.replace('_', ' ')}
                </>
              )}
            </button>
          </div>
        </div>

        {/* GDPR Info */}
        <div className="bg-blue-900/20 border border-blue-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-200">
              <p className="font-medium mb-1">GDPR Data Portability</p>
              <p className="text-xs">
                This export functionality complies with GDPR Article 15 (Right of Access) and Article 20 (Right to Data Portability). Your data is provided in commonly used, machine-readable formats that you can transfer to other services.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="/settings/audit-log"
            className="p-4 bg-gray-800/30 backdrop-blur-xl border border-gray-700/20 rounded-xl hover:shadow-lg transition-all group"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white mb-1">View Audit Log</h3>
                <p className="text-xs text-gray-400">See all data access events</p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-200 transition-colors" />
            </div>
          </a>

          <a
            href="/settings/data-privacy/bulk-operations"
            className="p-4 bg-gray-800/30 backdrop-blur-xl border border-gray-700/20 rounded-xl hover:shadow-lg transition-all group"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white mb-1">Bulk Operations</h3>
                <p className="text-xs text-gray-400">Delete or archive old data</p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-200 transition-colors" />
            </div>
          </a>
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <ExportDataModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          userId={user.id}
        />
      )}
    </FeatureLayout>
  );
}
