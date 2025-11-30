'use client';

import { useState } from 'react';
import { Download, FileText, X, Calendar, FileSpreadsheet, File } from 'lucide-react';
import { exportService } from '@/lib/services/export-service';
import { pdfExportService } from '@/lib/services/pdf-export-service';

interface ExportButtonProps {
  spaceId: string;
}

type ExportType = 'monthly' | 'yearly' | 'custom' | 'category';
type ExportFormat = 'csv' | 'pdf';

export default function ExportButton({ spaceId }: ExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exportType, setExportType] = useState<ExportType>('monthly');
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv');
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    try {
      setIsExporting(true);

      if (exportFormat === 'pdf') {
        // PDF exports only support monthly for now
        if (exportType === 'monthly') {
          await pdfExportService.exportMonthlyExpenseSummary(spaceId, year, month);
        } else {
          alert('PDF export currently only supports monthly summaries. Please select "This Month" or switch to CSV format.');
          return;
        }
      } else {
        // CSV exports
        if (exportType === 'monthly') {
          await exportService.exportMonthlyExpenses(spaceId, year, month);
        } else if (exportType === 'yearly') {
          await exportService.exportYearlyExpenses(spaceId, year);
        } else if (exportType === 'custom' && startDate && endDate) {
          await exportService.exportExpenses(spaceId, startDate, endDate);
        } else if (exportType === 'category' && startDate && endDate) {
          await exportService.exportCategoryBreakdown(spaceId, startDate, endDate);
        }
      }

      setIsOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export expenses. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="btn-touch flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-all active:scale-95 hover-lift shimmer-blue active-press hover:shadow-md"
      >
        <Download className="w-4 h-4" />
        Export
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
            onClick={() => setIsOpen(false)}
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      Export Expenses
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Download for tax software or records
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="btn-touch w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-all active:scale-95 hover-lift shimmer-blue active-press hover:shadow-md"
                  aria-label="Close"
                >
                  <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Export Format Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Export Format
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setExportFormat('csv')}
                      className={`btn-touch px-4 py-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 active:scale-95 hover-lift shimmer-blue active-press ${
                        exportFormat === 'csv'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:shadow-lg'
                          : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-300 hover:shadow-md'
                      }`}
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span className="font-medium">CSV</span>
                    </button>
                    <button
                      onClick={() => setExportFormat('pdf')}
                      className={`btn-touch px-4 py-3 rounded-lg border-2 transition-all flex items-center justify-center gap-2 active:scale-95 hover-lift shimmer-blue active-press ${
                        exportFormat === 'pdf'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:shadow-lg'
                          : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-300 hover:shadow-md'
                      }`}
                    >
                      <File className="w-4 h-4" />
                      <span className="font-medium">PDF</span>
                    </button>
                  </div>
                </div>

                {/* Export Type Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Export Period
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setExportType('monthly')}
                      className={`btn-touch px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium active:scale-95 hover-lift shimmer-blue active-press ${
                        exportType === 'monthly'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:shadow-lg'
                          : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-300 hover:shadow-md'
                      }`}
                    >
                      This Month
                    </button>
                    <button
                      onClick={() => setExportType('yearly')}
                      className={`btn-touch px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium active:scale-95 hover-lift shimmer-blue active-press ${
                        exportType === 'yearly'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:shadow-lg'
                          : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-300 hover:shadow-md'
                      }`}
                    >
                      Full Year
                    </button>
                    <button
                      onClick={() => setExportType('custom')}
                      className={`btn-touch px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium active:scale-95 hover-lift shimmer-blue active-press ${
                        exportType === 'custom'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:shadow-lg'
                          : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-300 hover:shadow-md'
                      }`}
                    >
                      Custom Range
                    </button>
                    <button
                      onClick={() => setExportType('category')}
                      className={`btn-touch px-4 py-3 rounded-lg border-2 transition-all text-sm font-medium active:scale-95 hover-lift shimmer-blue active-press ${
                        exportType === 'category'
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:shadow-lg'
                          : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-300 hover:shadow-md'
                      }`}
                    >
                      By Category
                    </button>
                  </div>
                </div>

                {/* Monthly/Yearly Options */}
                {(exportType === 'monthly' || exportType === 'yearly') && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Year
                      </label>
                      <select
                        value={year}
                        onChange={(e) => setYear(parseInt(e.target.value))}
                        className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        ))}
                      </select>
                    </div>

                    {exportType === 'monthly' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Month
                        </label>
                        <select
                          value={month}
                          onChange={(e) => setMonth(parseInt(e.target.value))}
                          className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          {[
                            'January',
                            'February',
                            'March',
                            'April',
                            'May',
                            'June',
                            'July',
                            'August',
                            'September',
                            'October',
                            'November',
                            'December',
                          ].map((monthName, index) => (
                            <option key={index} value={index + 1}>
                              {monthName}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {/* Custom Range Options */}
                {(exportType === 'custom' || exportType === 'category') && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Start Date
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        End Date
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Info Box */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    {exportFormat === 'pdf' ? (
                      <>
                        {exportType === 'monthly' ? (
                          <>
                            PDF report will include category breakdown and detailed expense list for{' '}
                            {new Date(year, month - 1).toLocaleDateString('en-US', {
                              month: 'long',
                              year: 'numeric',
                            })}
                          </>
                        ) : (
                          <>PDF export currently only supports monthly summaries. Please select &quot;This Month&quot;.</>
                        )}
                      </>
                    ) : (
                      <>
                        {exportType === 'yearly' && (
                          <>CSV file will include all expenses for {year} (for tax filing)</>
                        )}
                        {exportType === 'monthly' && (
                          <>
                            CSV file will include expenses for{' '}
                            {new Date(year, month - 1).toLocaleDateString('en-US', {
                              month: 'long',
                              year: 'numeric',
                            })}
                          </>
                        )}
                        {exportType === 'custom' && <>CSV file will include expenses in selected date range</>}
                        {exportType === 'category' && (
                          <>CSV file will group expenses by category with subtotals</>
                        )}
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setIsOpen(false)}
                  disabled={isExporting}
                  className="btn-touch px-6 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all font-medium disabled:opacity-50 active:scale-95 hover-lift shimmer-blue active-press hover:shadow-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExport}
                  disabled={
                    isExporting ||
                    ((exportType === 'custom' || exportType === 'category') && (!startDate || !endDate)) ||
                    (exportFormat === 'pdf' && exportType !== 'monthly')
                  }
                  className="btn-touch px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95 hover-lift shimmer-blue active-press hover:shadow-lg"
                >
                  {isExporting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Export {exportFormat.toUpperCase()}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
