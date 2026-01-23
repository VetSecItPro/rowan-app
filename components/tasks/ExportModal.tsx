'use client';

import { useState } from 'react';
import { Download, FileText, CheckSquare } from 'lucide-react';
import { taskExportService } from '@/lib/services/task-export-service';
import { TaskFilters } from './TaskFilterPanel';
import { Modal } from '@/components/ui/Modal';
import { logger } from '@/lib/logger';

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
      // Extract only the filter properties the service supports (first value from arrays)
      const exportFilters = {
        status: currentFilters?.status?.[0],
        category: currentFilters?.categories?.[0],
        assigned_to: currentFilters?.assignees?.[0],
        columns: selectedColumns,
      };
      const csv = await taskExportService.exportToCSV(spaceId, exportFilters);

      // Create filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `tasks-export-${timestamp}.csv`;

      // Trigger download
      taskExportService.downloadCSV(csv, filename);

      onClose();
    } catch (error) {
      logger.error('Error exporting tasks:', error, { component: 'ExportModal', action: 'component_action' });
      alert('Failed to export tasks');
    } finally {
      setLoading(false);
    }
  }

  const footerContent = (
    <div className="flex items-center gap-3">
      <button
        onClick={onClose}
        disabled={loading}
        className="px-4 sm:px-6 py-2.5 text-gray-300 hover:bg-gray-700 rounded-full transition-colors text-sm sm:text-base"
      >
        Cancel
      </button>
      <button
        onClick={handleExport}
        disabled={loading || selectedColumns.length === 0}
        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm sm:text-base"
      >
        <Download className="w-4 h-4" />
        {loading ? 'Exporting...' : 'Export CSV'}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Export Tasks"
      maxWidth="2xl"
      headerGradient="bg-gradient-to-r from-blue-500 to-blue-600"
      footer={footerContent}
    >
      <div className="space-y-6">
          {/* Export Format */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-300 mb-3">
              Export Format
            </h3>
            <div className="flex items-center gap-3 p-3 bg-gray-900 rounded-lg">
              <FileText className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm font-medium text-white">CSV (Comma Separated Values)</p>
                <p className="text-xs text-gray-500">Compatible with Excel, Google Sheets, and other spreadsheet apps</p>
              </div>
            </div>
          </div>

          {/* Column Selection */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-300">
                Select Columns to Export
              </h3>
              <span className="text-xs text-gray-500">
                {selectedColumns.length} of {availableColumns.length} selected
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto p-3 bg-gray-900 rounded-lg">
              {availableColumns.map((column) => (
                <label
                  key={column.key}
                  htmlFor="field-1" className={`flex items-center gap-2 p-2 rounded cursor-pointer hover:bg-gray-800 ${
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
                  <span className="text-sm text-gray-300">
                    {column.label}
                    {column.required && <span className="text-xs text-gray-400 ml-1">(required)</span>}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Applied Filters Info */}
          {currentFilters && Object.keys(currentFilters).length > 0 && (
            <div className="mb-6 p-3 bg-blue-900/20 border border-blue-800 rounded-lg">
              <div className="flex items-start gap-2">
                <CheckSquare className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-blue-200">
                    Current Filters Applied
                  </p>
                  <p className="text-xs text-blue-300 mt-1">
                    Only tasks matching your current filters will be exported
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Export Preview Info */}
          <div className="p-3 bg-gray-900 rounded-lg">
            <h4 className="text-xs font-medium text-gray-300 mb-2">
              What will be exported:
            </h4>
            <ul className="text-xs text-gray-400 space-y-1">
              <li>• All tasks matching your current filters (if any)</li>
              <li>• Selected columns with headers</li>
              <li>• UTF-8 encoded for international characters</li>
              <li>• Date formats: YYYY-MM-DD HH:MM:SS</li>
            </ul>
          </div>
      </div>
    </Modal>
  );
}
