'use client';

import { useState } from 'react';
import { logger } from '@/lib/logger';
import {
  FileText,
  Calendar,
  Eye,
  Download,
  Trash2,
  Clock,
  User,
  Search,
  Filter,
  Heart
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { type GeneratedReport } from '@/lib/services/financial-reports-service';
import { downloadReportPDF, deleteReport, toggleReportFavorite } from '@/lib/services/financial-reports-service';

interface ReportLibraryProps {
  reports: ReportWithFavorite[];
  onViewReport: (report: GeneratedReport) => void;
  onReportUpdated: () => void;
}

type ReportWithFavorite = GeneratedReport & { is_favorite?: boolean };

/** Displays a library of previously generated reports. */
export function ReportLibrary({ reports, onViewReport, onReportUpdated }: ReportLibraryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [loading, setLoading] = useState<string | null>(null);

  // Filter reports
  const filteredReports = reports.filter(report => {
    const matchesSearch = report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (report.description && report.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = selectedStatus === 'all' || report.status === selectedStatus;
    const matchesType = selectedType === 'all' || report.report_type === selectedType;

    return matchesSearch && matchesStatus && matchesType;
  });

  const handleDownload = async (report: GeneratedReport) => {
    if (!report.pdf_url) return;

    try {
      setLoading(report.id);
      await downloadReportPDF(report.id);
      // The function already handles the download automatically
    } catch (error) {
      logger.error('Error downloading report:', error, { component: 'ReportLibrary', action: 'component_action' });
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (report: GeneratedReport) => {
    if (!confirm('Are you sure you want to delete this report?')) return;

    try {
      setLoading(report.id);
      await deleteReport(report.id);
      onReportUpdated();
    } catch (error) {
      logger.error('Error deleting report:', error, { component: 'ReportLibrary', action: 'component_action' });
    } finally {
      setLoading(null);
    }
  };

  const handleToggleFavorite = async (report: GeneratedReport) => {
    try {
      await toggleReportFavorite(report.id);
      onReportUpdated();
    } catch (error) {
      logger.error('Error toggling favorite:', error, { component: 'ReportLibrary', action: 'component_action' });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get unique statuses and types for filtering
  const statuses = Array.from(new Set(reports.map(r => r.status)));
  const reportTypes = Array.from(new Set(reports.map(r => r.report_type)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-medium text-white">
            Report Library
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            View and manage your generated reports
          </p>
        </div>
        <div className="mt-3 sm:mt-0 flex items-center space-x-2">
          <span className="text-sm text-gray-400">
            {reports.length} report{reports.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search reports..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-md border-gray-600 text-white text-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            {statuses.map(status => (
              <option key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="rounded-md border-gray-600 text-white text-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            {reportTypes.map(type => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Reports List */}
      {filteredReports.length === 0 ? (
        <div className="text-center py-12">
          {searchQuery || selectedStatus !== 'all' || selectedType !== 'all' ? (
            <>
              <Filter className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-white">
                No reports found
              </h3>
              <p className="mt-1 text-sm text-gray-400">
                Try adjusting your search or filters.
              </p>
            </>
          ) : (
            <>
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-white">
                No reports yet
              </h3>
              <p className="mt-1 text-sm text-gray-400">
                Generate your first report to get started.
              </p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((report) => (
            <div
              key={report.id}
              className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Header */}
                  <div className="flex items-start gap-3">
                    <FileText className="h-6 w-6 text-gray-400 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <h4 className="text-lg font-medium text-white">
                        {report.title}
                      </h4>
                      {report.description && (
                        <p className="text-sm text-gray-400 mt-1">
                          {report.description}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleToggleFavorite(report)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Heart className={`h-5 w-5 ${report.is_favorite ? 'text-red-500 fill-red-500' : ''}`} />
                    </button>
                  </div>

                  {/* Metadata */}
                  <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(report.date_range_start).toLocaleDateString()} - {new Date(report.date_range_end).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatDistanceToNow(new Date(report.generated_at), { addSuffix: true })}
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {report.report_type}
                    </div>
                    {report.pdf_size && (
                      <div>
                        {formatFileSize(report.pdf_size)}
                      </div>
                    )}
                  </div>

                  {/* Status and Stats */}
                  <div className="flex items-center gap-4 mt-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      report.status === 'generated' ? 'bg-green-900/20 text-green-400' :
                      report.status === 'generating' ? 'bg-yellow-900/20 text-yellow-400' :
                      report.status === 'failed' ? 'bg-red-900/20 text-red-400' :
                      'bg-gray-900/20 text-gray-400'
                    }`}>
                      {report.status}
                    </span>

                    {report.view_count > 0 && (
                      <span className="text-xs text-gray-400">
                        {report.view_count} view{report.view_count !== 1 ? 's' : ''}
                      </span>
                    )}

                    {report.download_count > 0 && (
                      <span className="text-xs text-gray-400">
                        {report.download_count} download{report.download_count !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => onViewReport(report)}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </button>

                  {report.pdf_url && (
                    <button
                      onClick={() => handleDownload(report)}
                      disabled={loading === report.id}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-300 bg-gray-700 hover:bg-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 disabled:opacity-50"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      {loading === report.id ? 'Downloading...' : 'Download'}
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(report)}
                    disabled={loading === report.id}
                    className="inline-flex items-center px-3 py-1.5 border border-red-600 shadow-sm text-sm font-medium rounded-md text-red-400 bg-gray-700 hover:bg-red-900/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
