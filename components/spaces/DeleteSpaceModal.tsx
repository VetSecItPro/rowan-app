'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Download, Database, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { csrfFetch } from '@/lib/utils/csrf-fetch';
import { Modal } from '@/components/ui/Modal';

interface DeleteSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  space: {
    id: string;
    name: string;
  };
  onSpaceDeleted: () => void;
}

interface ExportSummary {
  tasks: number;
  events: number;
  reminders: number;
  messages: number;
  shopping_lists: number;
  recipes: number;
  meal_plans: number;
  chores: number;
  expenses: number;
  budgets: number;
  goals: number;
  daily_checkins: number;
  total: number;
}

/** Displays a confirmation modal for permanently deleting a space. */
export function DeleteSpaceModal({ isOpen, onClose, space, onSpaceDeleted }: DeleteSpaceModalProps) {
  const [step, setStep] = useState<'warning' | 'export' | 'confirm' | 'deleting'>('warning');
  const [exportSummary, setExportSummary] = useState<ExportSummary | null>(null);
  const [loadingExportSummary, setLoadingExportSummary] = useState(false);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [isExporting, setIsExporting] = useState(false);
  const [hasExported, setHasExported] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [spaceNameConfirmation, setSpaceNameConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setStep('warning');
      setExportSummary(null);
      setLoadingExportSummary(false);
      setExportFormat('json');
      setIsExporting(false);
      setHasExported(false);
      setConfirmationText('');
      setSpaceNameConfirmation('');
      setIsDeleting(false);
    }
  }, [isOpen]);

  const loadExportSummary = async () => {
    setLoadingExportSummary(true);
    try {
      const response = await fetch(`/api/spaces/${space.id}/export`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to load export summary');
      }

      setExportSummary(result.data);
    } catch (error) {
      logger.error('Error loading export summary:', error, { component: 'DeleteSpaceModal', action: 'component_action' });
      toast.error(error instanceof Error ? error.message : 'Failed to load export summary');
    } finally {
      setLoadingExportSummary(false);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await csrfFetch(`/api/spaces/${space.id}/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format: exportFormat,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to export space data');
      }

      // Trigger file download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Get filename from response headers or generate one
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `${space.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-export.${exportFormat}`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setHasExported(true);
      toast.success('Space data exported successfully');
    } catch (error) {
      logger.error('Error exporting space data:', error, { component: 'DeleteSpaceModal', action: 'component_action' });
      toast.error(error instanceof Error ? error.message : 'Failed to export space data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteSpace = async () => {
    if (confirmationText !== 'DELETE_SPACE' || spaceNameConfirmation !== space.name) {
      toast.error('Please complete all confirmation fields correctly');
      return;
    }

    setIsDeleting(true);
    try {
      const response = await csrfFetch(`/api/spaces/${space.id}/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          confirmation: 'DELETE_SPACE',
          spaceName: space.name,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete space');
      }

      toast.success('Space deleted successfully');
      onSpaceDeleted();
      onClose();
    } catch (error) {
      logger.error('Error deleting space:', error, { component: 'DeleteSpaceModal', action: 'component_action' });
      toast.error(error instanceof Error ? error.message : 'Failed to delete space');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (isDeleting) return; // Prevent closing during deletion
    onClose();
  };

  const proceedToExport = () => {
    setStep('export');
    loadExportSummary();
  };

  const proceedToConfirm = () => {
    setStep('confirm');
  };

  const goBack = () => {
    if (step === 'export') setStep('warning');
    if (step === 'confirm') setStep('export');
  };

  const getFooterContent = () => {
    if (step === 'warning') {
      return (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleClose}
            className="flex-1 px-6 py-3 bg-gray-700 text-gray-300 rounded-full hover:bg-gray-600 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={proceedToExport}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors font-medium"
          >
            Export & Delete
          </button>
        </div>
      );
    }

    if (step === 'export') {
      return (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={goBack}
            className="flex-1 px-6 py-3 bg-gray-700 text-gray-300 rounded-full hover:bg-gray-600 transition-colors font-medium"
          >
            Back
          </button>
          <button
            type="button"
            onClick={proceedToConfirm}
            className="flex-1 px-6 py-3 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors font-medium"
          >
            Continue to Delete
          </button>
        </div>
      );
    }

    if (step === 'confirm') {
      return (
        <div className="flex gap-3">
          <button
            type="button"
            onClick={goBack}
            disabled={isDeleting}
            className="flex-1 px-6 py-3 bg-gray-700 text-gray-300 rounded-full hover:bg-gray-600 transition-colors font-medium disabled:opacity-50"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleDeleteSpace}
            disabled={isDeleting || confirmationText !== 'DELETE_SPACE' || spaceNameConfirmation !== space.name}
            className="flex-1 px-6 py-3 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isDeleting ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Delete Space Permanently
              </>
            )}
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Delete Space"
      subtitle={space.name}
      maxWidth="2xl"
      headerGradient="bg-gradient-to-r from-red-600 to-red-700"
      footer={getFooterContent()}
    >
      {step === 'warning' && (
        <div className="space-y-6">
          {/* Warning */}
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-red-100 mb-2">
                  Permanent Deletion Warning
                </h3>
                <p className="text-red-200 mb-3">
                  This action will permanently delete &quot;<strong>{space.name}</strong>&quot; and all its data including:
                </p>
                <ul className="text-red-200 text-sm space-y-1 ml-4">
                  <li>• All tasks and to-do lists</li>
                  <li>• Calendar events and reminders</li>
                  <li>• Messages and conversations</li>
                  <li>• Shopping lists and meal plans</li>
                  <li>• Budget data and expenses</li>
                  <li>• Goals and progress tracking</li>
                  <li>• All other space content</li>
                </ul>
                <p className="text-red-200 mt-3 font-medium">
                  This action cannot be undone.
                </p>
              </div>
            </div>
          </div>

          {/* Data Export Recommendation */}
          <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Download className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-100 mb-2">
                  Recommended: Export Your Data First
                </h3>
                <p className="text-blue-200">
                  Before deleting this space, we strongly recommend exporting all your data.
                  This allows you to keep a backup of your tasks, events, messages, and other content
                  for your records.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 'export' && (
        <div className="space-y-6">
          {/* Export Summary */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">
              Export Space Data
            </h3>

            {loadingExportSummary ? (
              <div className="bg-gray-700 rounded-lg p-6 text-center">
                <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-3"></div>
                <p className="text-gray-400">Loading export summary...</p>
              </div>
            ) : exportSummary ? (
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Database className="w-5 h-5 text-blue-400" />
                  <span className="font-medium text-white">
                    Data Summary for &quot;{space.name}&quot;
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { label: 'Tasks', count: exportSummary.tasks },
                    { label: 'Events', count: exportSummary.events },
                    { label: 'Reminders', count: exportSummary.reminders },
                    { label: 'Messages', count: exportSummary.messages },
                    { label: 'Shopping Lists', count: exportSummary.shopping_lists },
                    { label: 'Recipes', count: exportSummary.recipes },
                    { label: 'Meal Plans', count: exportSummary.meal_plans },
                    { label: 'Chores', count: exportSummary.chores },
                    { label: 'Expenses', count: exportSummary.expenses },
                    { label: 'Budgets', count: exportSummary.budgets },
                    { label: 'Goals', count: exportSummary.goals },
                    { label: 'Check-ins', count: exportSummary.daily_checkins },
                  ].map(({ label, count }) => (
                    <div key={label} className="flex justify-between text-gray-300">
                      <span>{label}:</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                  <div className="col-span-2 border-t border-gray-600 pt-2 mt-2">
                    <div className="flex justify-between font-semibold text-white">
                      <span>Total Records:</span>
                      <span>{exportSummary.total}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* Export Options */}
          {exportSummary && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Export Format
                </label>
                <div className="flex gap-3">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="format"
                      value="json"
                      checked={exportFormat === 'json'}
                      onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv')}
                      className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <span className="ml-2 text-sm text-gray-300">JSON (structured data)</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="format"
                      value="csv"
                      checked={exportFormat === 'csv'}
                      onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv')}
                      className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <span className="ml-2 text-sm text-gray-300">CSV (spreadsheet format)</span>
                  </label>
                </div>
              </div>

              <button
                type="button"
                onClick={handleExport}
                disabled={isExporting}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isExporting ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Export Space Data
                  </>
                )}
              </button>

              {hasExported && (
                <div className="bg-green-900/20 border border-green-800 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-green-200">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Data exported successfully!</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {step === 'confirm' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">
              Final Confirmation
            </h3>

            <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 text-red-200 mb-2">
                <AlertCircle className="w-5 h-5" />
                <span className="font-semibold">This action is permanent and cannot be undone</span>
              </div>
              <p className="text-red-300 text-sm">
                All data in &quot;{space.name}&quot; will be permanently deleted from our servers.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Type the space name to confirm: <strong>{space.name}</strong>
                </label>
                <input
                  type="text"
                  value={spaceNameConfirmation}
                  onChange={(e) => setSpaceNameConfirmation(e.target.value)}
                  placeholder={space.name}
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Type <strong>DELETE_SPACE</strong> to confirm deletion:
                </label>
                <input
                  type="text"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  placeholder="DELETE_SPACE"
                  className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 text-white"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
