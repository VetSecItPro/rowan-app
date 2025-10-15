'use client';

import { useState } from 'react';
import { X, Download, FileText, CheckSquare } from 'lucide-react';
import { taskExportService } from '@/lib/services/task-export-service';
import { TaskFilters } from './TaskFilterPanel';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
  currentFilters?: TaskFilters;
}

export function ExportModal({ isOpen, onClose, spaceId, currentFilters }: ExportModalProps) {
  const [loading, setLoading] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    'title',
    'status',
    'priority',
    'assigned_to',
    'due_date',
  ]);

  const availableColumns = [
    { key: 'title', label: 'Title', required: true },
    { key: 'description', label: 'Description' },
    { key: 'status', label: 'Status', required: true },
    { key: 'priority', label: 'Priority' },
    { key: 'assigned_to', label: 'Assigned To' },
    { key: 'category', label: 'Category' },
    { key: 'due_date', label: 'Due Date' },
    { key: 'start_date', label: 'Start Date' },
    { key: 'completed_at', label: 'Completed At' },
    { key: 'created_at', label: 'Created At' },
    { key: 'updated_at', label: 'Updated At' },
    { key: 'estimated_hours', label: 'Estimated Hours' },
    { key: 'actual_hours', label: 'Actual Hours' },
    { key: 'tags', label: 'Tags' },
  ];

  function toggleColumn(columnKey: string) {
    const column = availableColumns.find(c => c.key === columnKey);
    if (column?.required) return;

    setSelectedColumns(prev =>
      prev.includes(columnKey)
        ? prev.filter(k => k !== columnKey)
        : [...prev, columnKey]
    );
  }

  async function handleExport() {
    setLoading(true);
    try {
      const csv = await taskExportService.exportToCSV(spaceId, {
        ...currentFilters,
        columns: selectedColumns,
      });

      // Create filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `tasks-export-${timestamp}.csv`;

      // Trigger download
      taskExportService.downloadCSV(csv, filename);

      onClose();
    } catch (error) {
      console.error('Error exporting tasks:', error);
      alert('Failed to export tasks');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 sm:flex sm:items-center sm:justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-50 dark:bg-gray-800 w-full h-full sm:w-auto sm:h-auto sm:rounded-xl sm:max-w-2xl sm:max-h-[90vh] overflow-y-auto overscroll-contain shadow-2xl flex flex-col">
        <div className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-800 flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-green-500" />
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Export Tasks</h2>
          </div>
          <button onClick={onClose} className="w-12 h-12 sm:w-10 sm:h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all active:scale-95">
            <X className="w-5 h-5 sm:w-4 sm:h-4" />
          </button>
        </div>

        <div className="flex-1 px-4 sm:px-6 py-4 sm:py-6 overflow-y-auto">
          {/* Export Format */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Export Format
            </h3>
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <FileText className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">CSV (Comma Separated Values)</p>
                <p className="text-xs text-gray-500">Compatible with Excel, Google Sheets, and other spreadsheet apps</p>
              </div>
            </div>
          </div>

          {/* Column Selection */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Select Columns to Export
              </h3>
              <span className="text-xs text-gray-500">
                {selectedColumns.length} of {availableColumns.length} selected
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              {availableColumns.map((column) => (
                <label
                  key={column.key}
                  htmlFor="field-1" className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 ${
                    column.required ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedColumns.includes(column.key)}
                    id="field-1"
              onChange={() =>  toggleColumn(column.key)}
                    disabled={column.required}
                    className="rounded border-gray-300 text-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {column.label}
                    {column.required && <span className="text-xs text-gray-400 ml-1">(required)</span>}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Applied Filters Info */}
          {currentFilters && Object.keys(currentFilters).length > 0 && (
            <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start gap-2">
                <CheckSquare className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-blue-900 dark:text-blue-200">
                    Current Filters Applied
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                    Only tasks matching your current filters will be exported
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Export Preview Info */}
          <div className="mb-6 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
              What will be exported:
            </h4>
            <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              <li>• All tasks matching your current filters (if any)</li>
              <li>• Selected columns with headers</li>
              <li>• UTF-8 encoded for international characters</li>
              <li>• Date formats: YYYY-MM-DD HH:MM:SS</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 sm:gap-2">
            <button
              onClick={handleExport}
              disabled={loading || selectedColumns.length === 0}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              <Download className="w-5 h-5" />
              {loading ? 'Exporting...' : 'Export to CSV'}
            </button>
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
