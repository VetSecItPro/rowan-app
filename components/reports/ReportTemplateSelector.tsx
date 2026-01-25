'use client';

import { useState } from 'react';
import {
  ChartBarIcon,
  DocumentChartBarIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  PresentationChartBarIcon,
  CalendarIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { type ReportTemplate } from '@/lib/services/financial-reports-service';

interface ReportTemplateSelectorProps {
  templates: ReportTemplate[];
  onSelectTemplate: (template: ReportTemplate) => void;
}

const categoryIcons = {
  budget: CurrencyDollarIcon,
  expenses: DocumentChartBarIcon,
  goals: PresentationChartBarIcon,
  trends: ArrowTrendingUpIcon,
  summary: ChartBarIcon
};

const categoryColors = {
  budget: 'bg-green-900/20 text-green-400',
  expenses: 'bg-red-900/20 text-red-400',
  goals: 'bg-blue-900/20 text-blue-400',
  trends: 'bg-purple-900/20 text-purple-400',
  summary: 'bg-orange-900/20 text-orange-400'
};

export function ReportTemplateSelector({ templates, onSelectTemplate }: ReportTemplateSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');

  // Get unique categories and types
  const categories = Array.from(new Set(templates.map(t => t.category)));
  const reportTypes = Array.from(new Set(templates.map(t => t.report_type)));

  // Filter templates
  const filteredTemplates = templates.filter(template => {
    const categoryMatch = selectedCategory === 'all' || template.category === selectedCategory;
    const typeMatch = selectedType === 'all' || template.report_type === selectedType;
    return categoryMatch && typeMatch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-medium text-white">
          Choose a Report Template
        </h3>
        <p className="text-sm text-gray-400 mt-1">
          Select from pre-built templates to generate financial reports
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Category
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full rounded-md border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Report Type
          </label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full rounded-md border-gray-600 text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
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

      {/* Templates Grid */}
      {filteredTemplates.length === 0 ? (
        <div className="text-center py-12">
          <FunnelIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-white">
            No templates found
          </h3>
          <p className="mt-1 text-sm text-gray-400">
            Try adjusting your filters to see more templates.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => {
            const Icon = categoryIcons[template.category as keyof typeof categoryIcons] || ChartBarIcon;
            const colorClass = categoryColors[template.category as keyof typeof categoryColors] || categoryColors.summary;

            return (
              <div
                key={template.id}
                className="btn-touch bg-gray-800 border border-gray-700 rounded-lg p-6 hover:shadow-lg transition-all cursor-pointer active:scale-[0.98]"
                onClick={() => onSelectTemplate(template)}
              >
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
                    <Icon className="h-3 w-3 mr-1" />
                    {template.category}
                  </div>
                  <span className="text-xs text-gray-400 capitalize">
                    {template.report_type}
                  </span>
                </div>

                {/* Content */}
                <div className="mt-4">
                  <h4 className="text-lg font-medium text-white">
                    {template.name}
                  </h4>
                  <p className="text-sm text-gray-400 mt-2 line-clamp-3">
                    {template.description}
                  </p>
                </div>

                {/* Features */}
                <div className="mt-4">
                  <div className="flex flex-wrap gap-2">
                    {template.config?.charts && (
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-blue-900/20 text-blue-400">
                        <ChartBarIcon className="h-3 w-3 mr-1" />
                        Charts
                      </span>
                    )}
                    {template.requires_goals && (
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-purple-900/20 text-purple-400">
                        Goals
                      </span>
                    )}
                    {template.requires_budget && (
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-green-900/20 text-green-400">
                        Budget
                      </span>
                    )}
                  </div>
                </div>

                {/* Action */}
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <button className="btn-touch text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors active:scale-95">
                    Use Template →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* System Templates Info */}
      <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
        <div className="flex">
          <CalendarIcon className="h-5 w-5 text-blue-400 flex-shrink-0" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-200">
              About Report Templates
            </h3>
            <div className="mt-2 text-sm text-blue-300">
              <p>
                These templates are pre-configured to generate comprehensive financial reports.
                Each template includes specific charts, metrics, and data analysis tailored to different aspects of your finances.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}