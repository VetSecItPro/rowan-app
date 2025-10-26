'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  ArrowLeftIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  EyeIcon,
  CalendarIcon,
  ChartBarIcon,
  DocumentTextIcon,
  PrinterIcon,
  LinkIcon
} from '@heroicons/react/24/outline';
import { type GeneratedReport } from '@/lib/services/financial-reports-service';
import { downloadReportPDF, getReportShareUrl, updateReportViews } from '@/lib/services/financial-reports-service';

interface ReportViewerProps {
  report: GeneratedReport;
  onClose: () => void;
}

export function ReportViewer({ report, onClose }: ReportViewerProps) {
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    // Update view count when report is viewed
    updateReportViews(report.id);
  }, [report.id]);

  const handleDownload = async () => {
    if (!report.pdf_url) return;

    try {
      setLoading(true);
      const blob = await downloadReportPDF(report.id);
      // The function handles the download automatically
    } catch (error) {
      console.error('Error downloading report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      setLoading(true);
      const shareUrl = await getReportShareUrl(report.id);
      setShareUrl(shareUrl);
      setShowShareModal(true);
    } catch (error) {
      console.error('Error generating share URL:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyShareUrl = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      // You could add a toast notification here
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const renderMetrics = () => {
    if (!report.summary_stats || typeof report.summary_stats !== 'object') return null;

    const stats = report.summary_stats as Record<string, any>;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(stats).map(([key, value]) => (
          <div key={key} className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400 capitalize">
              {key.replace(/_/g, ' ')}
            </div>
            <div className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">
              {typeof value === 'number' && key.includes('amount') ? formatCurrency(value) : String(value)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderDataTable = () => {
    if (!report.data || typeof report.data !== 'object') return null;

    const data = report.data as Record<string, any>;

    if (data.expenses && Array.isArray(data.expenses) && data.expenses.length > 0) {
      return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white">
              Expense Details
            </h4>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {data.expenses.slice(0, 10).map((expense: any, index: number) => (
                  <tr key={expense.id || index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                      {format(new Date(expense.date), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-300">
                      {expense.description || expense.vendor || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                      {expense.category || 'Uncategorized'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300 text-right">
                      {formatCurrency(expense.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.expenses.length > 10 && (
            <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700 text-sm text-gray-500 dark:text-gray-400 text-center">
              Showing 10 of {data.expenses.length} expenses. Download PDF for complete data.
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <button
            onClick={onClose}
            className="mr-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {report.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {report.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <ShareIcon className="h-4 w-4 mr-1" />
            Share
          </button>

          {report.pdf_url && (
            <button
              onClick={handleDownload}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
              {loading ? 'Downloading...' : 'Download PDF'}
            </button>
          )}
        </div>
      </div>

      {/* Report Metadata */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="flex items-center">
            <CalendarIcon className="h-5 w-5 text-gray-400 mr-2" />
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">Date Range</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {format(new Date(report.date_range_start), 'MMM d')} - {format(new Date(report.date_range_end), 'MMM d, yyyy')}
              </div>
            </div>
          </div>

          <div className="flex items-center">
            <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-2" />
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">Report Type</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                {report.report_type}
              </div>
            </div>
          </div>

          <div className="flex items-center">
            <EyeIcon className="h-5 w-5 text-gray-400 mr-2" />
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">Views</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {report.view_count} view{report.view_count !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          <div className="flex items-center">
            <ArrowDownTrayIcon className="h-5 w-5 text-gray-400 mr-2" />
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">Downloads</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {report.download_count} download{report.download_count !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      {report.summary_stats && (
        <div className="space-y-4">
          <h4 className="text-lg font-medium text-gray-900 dark:text-white">
            Key Metrics
          </h4>
          {renderMetrics()}
        </div>
      )}

      {/* Charts Placeholder */}
      {report.charts_config && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Charts & Visualizations
          </h4>
          <div className="flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
            <div className="text-center">
              <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                Charts Available in PDF
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Download the PDF to view interactive charts and visualizations
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Data Table */}
      {renderDataTable()}

      {/* PDF Preview Notice */}
      {report.pdf_url && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex">
            <PrinterIcon className="h-5 w-5 text-blue-400 flex-shrink-0" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Complete Report Available
              </h3>
              <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                <p>
                  The complete report with detailed charts, analysis, and formatting is available as a PDF download.
                  This preview shows a subset of the data for quick reference.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && shareUrl && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onClick={() => setShowShareModal(false)}>
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800" onClick={e => e.stopPropagation()}>
            <div className="mt-3">
              <div className="flex items-center">
                <LinkIcon className="h-6 w-6 text-blue-600 mr-2" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Share Report
                </h3>
              </div>
              <div className="mt-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Share this report with others using the link below:
                </p>
                <div className="flex">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-l-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                  <button
                    onClick={copyShareUrl}
                    className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  This link will expire in 30 days and allows view-only access.
                </p>
              </div>
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setShowShareModal(false)}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}