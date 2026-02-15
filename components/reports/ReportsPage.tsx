'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { logger } from '@/lib/logger';
import {
  FileText,
  BarChart3,
  Calendar,
  Folder,
  Plus
} from 'lucide-react';
import { ReportTemplateSelector } from './ReportTemplateSelector';
import { ReportLibrary } from './ReportLibrary';
import { ReportGenerator } from './ReportGenerator';
import { ReportViewer } from './ReportViewer';
import {
  getReportTemplates,
  getGeneratedReports,
  type ReportTemplate,
  type GeneratedReport
} from '@/lib/services/financial-reports-service';

type TabType = 'templates' | 'library' | 'generate' | 'viewer';

interface ReportsPageProps {
  className?: string;
}

/** Renders the main reports page with template selection and report list. */
export function ReportsPage({ className = '' }: ReportsPageProps) {
  const params = useParams();
  const spaceId = params?.spaceId as string;

  const [activeTab, setActiveTab] = useState<TabType>('templates');
  const [templates, setTemplates] = useState<ReportTemplate[]>([]);
  const [reports, setReports] = useState<GeneratedReport[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [selectedReport, setSelectedReport] = useState<GeneratedReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadData is a stable function
  }, [spaceId]);

  const loadData = async () => {
    if (!spaceId) return;

    try {
      setLoading(true);
      const [templates, reports] = await Promise.all([
        getReportTemplates(spaceId),
        getGeneratedReports(spaceId)
      ]);

      setTemplates(templates || []);
      setReports(reports || []);
    } catch (error) {
      logger.error('Error loading reports data:', error, { component: 'ReportsPage', action: 'component_action' });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = (template: ReportTemplate) => {
    setSelectedTemplate(template);
    setActiveTab('generate');
  };

  const handleViewReport = (report: GeneratedReport) => {
    setSelectedReport(report);
    setActiveTab('viewer');
  };

  const tabs = [
    {
      id: 'templates' as TabType,
      name: 'Templates',
      icon: FileText,
      description: 'Choose from pre-built report templates'
    },
    {
      id: 'library' as TabType,
      name: 'Report Library',
      icon: Folder,
      description: 'View and manage generated reports'
    },
    {
      id: 'generate' as TabType,
      name: 'Generate',
      icon: BarChart3,
      description: 'Create new reports',
      hidden: !selectedTemplate
    },
    {
      id: 'viewer' as TabType,
      name: 'View Report',
      icon: Calendar,
      description: 'View report details',
      hidden: !selectedReport
    }
  ];

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-700 rounded w-1/3"></div>
            <div className="h-4 bg-gray-700 rounded w-2/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">
              Financial Reports
            </h1>
            <p className="text-gray-400 mt-1">
              Generate detailed financial reports and insights
            </p>
          </div>
          <button
            onClick={() => setActiveTab('templates')}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Report
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="border-b border-gray-700">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.filter(tab => !tab.hidden).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap
                    ${isActive
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-gray-400 hover:text-gray-300'
                    }
                  `}
                >
                  <Icon className="h-5 w-5 inline-block mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'templates' && (
            <ReportTemplateSelector
              templates={templates}
              onSelectTemplate={handleGenerateReport}
            />
          )}

          {activeTab === 'library' && (
            <ReportLibrary
              reports={reports}
              onViewReport={handleViewReport}
              onReportUpdated={loadData}
            />
          )}

          {activeTab === 'generate' && selectedTemplate && (
            <ReportGenerator
              template={selectedTemplate}
              spaceId={spaceId}
              onReportGenerated={(report) => {
                setReports(prev => [report, ...prev]);
                handleViewReport(report);
              }}
              onCancel={() => {
                setSelectedTemplate(null);
                setActiveTab('templates');
              }}
            />
          )}

          {activeTab === 'viewer' && selectedReport && (
            <ReportViewer
              report={selectedReport}
              onClose={() => {
                setSelectedReport(null);
                setActiveTab('library');
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}