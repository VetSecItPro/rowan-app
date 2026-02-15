'use client';

import { useState, useEffect } from 'react';
import { format, subDays, subMonths, subQuarters, subYears, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';
import { logger } from '@/lib/logger';
import {
  Calendar,
  BarChart3,
  FileText,
  Settings,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { type ReportTemplate, type GeneratedReport, generateReport } from '@/lib/services/financial-reports-service';

interface ReportGeneratorProps {
  template: ReportTemplate;
  spaceId: string;
  onReportGenerated: (report: GeneratedReport) => void;
  onCancel: () => void;
}

interface DateRange {
  start: Date;
  end: Date;
}

type DatePresetValue = 'current_month' | 'last_month' | 'current_quarter' | 'last_quarter' | 'current_year' | 'last_year' | 'last_30_days' | 'last_90_days' | 'custom';

const datePresets = [
  { label: 'Current Month', value: 'current_month' },
  { label: 'Last Month', value: 'last_month' },
  { label: 'Current Quarter', value: 'current_quarter' },
  { label: 'Last Quarter', value: 'last_quarter' },
  { label: 'Current Year', value: 'current_year' },
  { label: 'Last Year', value: 'last_year' },
  { label: 'Last 30 Days', value: 'last_30_days' },
  { label: 'Last 90 Days', value: 'last_90_days' },
  { label: 'Custom Range', value: 'custom' }
];

/** Provides controls for generating a report from a selected template. */
export function ReportGenerator({ template, spaceId, onReportGenerated, onCancel }: ReportGeneratorProps) {
  const [title, setTitle] = useState(template.name);
  const [description, setDescription] = useState(template.description || '');
  const [datePreset, setDatePreset] = useState<DatePresetValue>((template.default_date_range as DatePresetValue) || 'current_month');
  const [customDateRange, setCustomDateRange] = useState<DateRange>({
    start: new Date(),
    end: new Date()
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update date range when preset changes
  useEffect(() => {
    const today = new Date();
    let range: DateRange;

    switch (datePreset) {
      case 'current_month':
        range = { start: startOfMonth(today), end: endOfMonth(today) };
        break;
      case 'last_month':
        const lastMonth = subMonths(today, 1);
        range = { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
        break;
      case 'current_quarter':
        range = { start: startOfQuarter(today), end: endOfQuarter(today) };
        break;
      case 'last_quarter':
        const lastQuarter = subQuarters(today, 1);
        range = { start: startOfQuarter(lastQuarter), end: endOfQuarter(lastQuarter) };
        break;
      case 'current_year':
        range = { start: startOfYear(today), end: endOfYear(today) };
        break;
      case 'last_year':
        const lastYear = subYears(today, 1);
        range = { start: startOfYear(lastYear), end: endOfYear(lastYear) };
        break;
      case 'last_30_days':
        range = { start: subDays(today, 30), end: today };
        break;
      case 'last_90_days':
        range = { start: subDays(today, 90), end: today };
        break;
      default:
        return; // Keep custom range as is
    }

    if (datePreset !== 'custom' as DatePresetValue) {
      setCustomDateRange(range);
    }
  }, [datePreset]);

  const getCurrentDateRange = (): DateRange => {
    return customDateRange;
  };

  const handleGenerate = async () => {
    try {
      setIsGenerating(true);
      setError(null);

      const dateRange = getCurrentDateRange();

      const result = await generateReport(
        template.id,
        spaceId,
        title,
        description,
        dateRange.start,
        dateRange.end
      );

      onReportGenerated(result);
    } catch (error) {
      logger.error('Error generating report:', error, { component: 'ReportGenerator', action: 'component_action' });
      setError('An unexpected error occurred while generating the report');
    } finally {
      setIsGenerating(false);
    }
  };

  const isValidConfiguration = () => {
    return title.trim() && customDateRange.start <= customDateRange.end;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-white">
            Generate Report
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Configure and generate your {template.name.toLowerCase()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-800 border border-gray-600 rounded-md hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={!isValidConfiguration() || isGenerating}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </div>
            ) : (
              'Generate Report'
            )}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-200">
                Generation Failed
              </h3>
              <div className="mt-2 text-sm text-red-300">
                {error}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <div className="space-y-6">
          {/* Template Info */}
          <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
            <div className="flex items-start">
              <FileText className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="ml-3">
                <h4 className="text-sm font-medium text-blue-200">
                  {template.name}
                </h4>
                <p className="text-sm text-blue-300 mt-1">
                  {template.description}
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs text-blue-400">
                  <span>Category: {template.category}</span>
                  <span>Type: {template.report_type}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Report Details */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-white">
              Report Details
            </h4>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Report Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm focus:ring-blue-500 bg-gray-700 text-white"
                placeholder="Enter report title"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm focus:ring-blue-500 bg-gray-700 text-white"
                placeholder="Enter report description"
              />
            </div>
          </div>

          {/* Date Range */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-white">
              Date Range
            </h4>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Time Period
              </label>
              <select
                value={datePreset}
                onChange={(e) => setDatePreset(e.target.value as DatePresetValue)}
                className="w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm focus:ring-blue-500 bg-gray-700 text-white"
              >
                {datePresets.map(preset => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>

            {datePreset === 'custom' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={format(customDateRange.start, 'yyyy-MM-dd')}
                    onChange={(e) => setCustomDateRange(prev => ({
                      ...prev,
                      start: new Date(e.target.value)
                    }))}
                    className="w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm focus:ring-blue-500 bg-gray-700 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={format(customDateRange.end, 'yyyy-MM-dd')}
                    onChange={(e) => setCustomDateRange(prev => ({
                      ...prev,
                      end: new Date(e.target.value)
                    }))}
                    className="w-full px-3 py-2 border border-gray-600 rounded-md shadow-sm focus:ring-blue-500 bg-gray-700 text-white"
                  />
                </div>
              </div>
            )}

            {/* Date Range Preview */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-3">
              <div className="flex items-center">
                <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-sm text-gray-400">
                  {format(customDateRange.start, 'MMM d, yyyy')} - {format(customDateRange.end, 'MMM d, yyyy')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="space-y-6">
          <h4 className="text-md font-medium text-white">
            Report Preview
          </h4>

          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            {/* Report Features */}
            <div className="space-y-4">
              <h5 className="text-sm font-medium text-white">
                This report will include:
              </h5>

              <div className="space-y-2">
                {template.config?.charts && (
                  <div className="flex items-center text-sm text-gray-400">
                    <BarChart3 className="h-4 w-4 mr-2 text-blue-500" />
                    Interactive charts and visualizations
                  </div>
                )}

                {template.config?.metrics && (
                  <div className="flex items-center text-sm text-gray-400">
                    <Settings className="h-4 w-4 mr-2 text-green-500" />
                    Key financial metrics and insights
                  </div>
                )}

                <div className="flex items-center text-sm text-gray-400">
                  <FileText className="h-4 w-4 mr-2 text-purple-500" />
                  Detailed data analysis and summaries
                </div>

                <div className="flex items-center text-sm text-gray-400">
                  <FileText className="h-4 w-4 mr-2 text-orange-500" />
                  Downloadable PDF report
                </div>
              </div>
            </div>

            {/* Requirements */}
            {(template.requires_goals || template.requires_budget) && (
              <div className="mt-6 pt-4 border-t border-gray-700">
                <h5 className="text-sm font-medium text-white mb-2">
                  Requirements:
                </h5>
                <div className="space-y-1">
                  {template.requires_budget && (
                    <div className="text-sm text-amber-400">
                      • Active budget data is required
                    </div>
                  )}
                  {template.requires_goals && (
                    <div className="text-sm text-amber-400">
                      • Goals data is required
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Generation Time Estimate */}
            <div className="mt-6 pt-4 border-t border-gray-700">
              <div className="flex items-center text-sm text-gray-400">
                <Clock className="h-4 w-4 mr-2" />
                Estimated generation time: 10-30 seconds
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}