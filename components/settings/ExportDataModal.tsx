'use client';

import { useState } from 'react';
import { X, Download, FileJson, FileSpreadsheet, Check, AlertCircle } from 'lucide-react';
import { logDataExport } from '@/lib/services/audit-log-service';

interface ExportDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

type ExportFormat = 'json' | 'csv';
type DataType = 'all' | 'expenses' | 'tasks' | 'events' | 'shopping' | 'messages';

export function ExportDataModal({ isOpen, onClose, userId }: ExportDataModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('json');
  const [selectedDataType, setSelectedDataType] = useState<DataType>('all');
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');

  const dataTypes = [
    { value: 'all' as DataType, label: 'All Data', description: '13+ data types including expenses, tasks, events, etc.' },
    { value: 'expenses' as DataType, label: 'Expenses', description: 'Budget transactions and spending records' },
    { value: 'tasks' as DataType, label: 'Tasks', description: 'Tasks and chores with completion status' },
    { value: 'events' as DataType, label: 'Calendar Events', description: 'Calendar events and scheduling data' },
    { value: 'shopping' as DataType, label: 'Shopping Lists', description: 'Shopping lists and items' },
    { value: 'messages' as DataType, label: 'Messages', description: 'Conversations and communications' },
  ];

  const handleExport = async () => {
    setIsExporting(true);
    setError('');

    try {
      let apiUrl: string;

      if (selectedFormat === 'json') {
        // Use existing JSON export endpoint
        apiUrl = '/api/user/export-data';
      } else {
        // Use new CSV export endpoint with type parameter
        apiUrl = `/api/user/export-data-csv?type=${selectedDataType}`;
      }

      const response = await fetch(apiUrl);

      if (!response.ok) {
        throw new Error('Export failed');
      }

      if (selectedFormat === 'json') {
        // Download JSON file
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rowan-data-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else if (selectedDataType === 'all') {
        // For "all" CSV, show available types
        const data = await response.json();
        if (data.files) {
          alert(`Multiple CSV files available. Use the data type selector to download specific types:\n\n${data.files.join('\n')}`);
        }
      } else {
        // Download CSV file
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `rowan-${selectedDataType}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }

      // Log audit event
      await logDataExport(userId, selectedFormat, selectedDataType !== 'all' ? selectedDataType : undefined);

      // Close modal on success
      onClose();
    } catch (error) {
      console.error('Export error:', error);
      setError('Failed to export data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
              <Download className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Export Your Data</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors"
            disabled={isExporting}
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Format Selection */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Select Format</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* JSON Option */}
              <button
                onClick={() => setSelectedFormat('json')}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  selectedFormat === 'json'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    selectedFormat === 'json' ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'
                  }`}>
                    <FileJson className={`w-5 h-5 ${
                      selectedFormat === 'json' ? 'text-white' : 'text-gray-600 dark:text-gray-400'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900 dark:text-white">JSON</h4>
                      {selectedFormat === 'json' && (
                        <Check className="w-4 h-4 text-blue-500" />
                      )}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Machine-readable format for developers
                    </p>
                  </div>
                </div>
              </button>

              {/* CSV Option */}
              <button
                onClick={() => setSelectedFormat('csv')}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  selectedFormat === 'csv'
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    selectedFormat === 'csv' ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                  }`}>
                    <FileSpreadsheet className={`w-5 h-5 ${
                      selectedFormat === 'csv' ? 'text-white' : 'text-gray-600 dark:text-gray-400'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900 dark:text-white">CSV</h4>
                      {selectedFormat === 'csv' && (
                        <Check className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Spreadsheet format (Excel, Google Sheets)
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Data Type Selection (CSV only) */}
          {selectedFormat === 'csv' && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Select Data Type</h3>
              <div className="space-y-2">
                {dataTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setSelectedDataType(type.value)}
                    className={`w-full p-3 rounded-lg border transition-all text-left ${
                      selectedDataType === type.value
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">{type.label}</h4>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">{type.description}</p>
                      </div>
                      {selectedDataType === type.value && (
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">GDPR Compliance</p>
              <p className="text-xs">
                This export includes all your personal data as required by GDPR Article 15 (Right of Access) and Article 20 (Right to Data Portability).
              </p>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl font-medium transition-colors"
              disabled={isExporting}
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={isExporting}
            >
              {isExporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Export Data
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
