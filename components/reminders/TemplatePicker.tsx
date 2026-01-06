'use client';

import { useState, useEffect } from 'react';
import { Star, Sparkles, X } from 'lucide-react';
import { logger } from '@/lib/logger';
import {
  ReminderTemplate,
  reminderTemplatesService,
} from '@/lib/services/reminder-templates-service';
import { CreateReminderInput } from '@/lib/services/reminders-service';

interface TemplatePickerProps {
  spaceId: string;
  onSelectTemplate: (reminderData: Partial<CreateReminderInput>) => void;
  onClose: () => void;
}

export function TemplatePicker({ spaceId, onSelectTemplate, onClose }: TemplatePickerProps) {
  const [templates, setTemplates] = useState<ReminderTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<ReminderTemplate | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [customTime, setCustomTime] = useState('');

  // Load templates
  useEffect(() => {
    loadTemplates();
  }, [spaceId]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await reminderTemplatesService.getTemplates(spaceId);
      setTemplates(data);
    } catch (error) {
      logger.error('Failed to load templates:', error, { component: 'TemplatePicker', action: 'component_action' });
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateClick = (template: ReminderTemplate) => {
    setSelectedTemplate(template);

    // Extract variables and initialize them
    const vars = reminderTemplatesService.extractVariables(template);
    const initialVars: Record<string, string> = {};
    vars.forEach((v) => {
      initialVars[v] = '';
    });
    setVariables(initialVars);

    // Set default time if applicable
    if (template.reminder_type === 'time' && template.default_time_offset_minutes !== undefined) {
      const now = new Date();
      now.setMinutes(now.getMinutes() + template.default_time_offset_minutes);
      setCustomTime(now.toISOString().slice(0, 16));
    }
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplate) return;

    // Apply template with variables
    const reminderData = reminderTemplatesService.applyTemplate(
      selectedTemplate,
      variables,
      customTime ? new Date(customTime).toISOString() : undefined
    );

    // Increment usage count
    await reminderTemplatesService.incrementUsage(selectedTemplate.id);

    // Pass to parent (cast to match CreateReminderInput types)
    onSelectTemplate(reminderData as Partial<CreateReminderInput>);
    onClose();
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      bills: 'bg-green-500',
      health: 'bg-red-500',
      work: 'bg-blue-500',
      personal: 'bg-purple-500',
      household: 'bg-amber-500',
    };
    return colors[category] || 'bg-gray-500';
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'text-gray-600 dark:text-gray-400',
      medium: 'text-blue-600 dark:text-blue-400',
      high: 'text-orange-600 dark:text-orange-400',
      urgent: 'text-red-600 dark:text-red-400',
    };
    return colors[priority] || 'text-gray-600 dark:text-gray-400';
  };

  // Variable input form
  if (selectedTemplate) {
    const variableNames = Object.keys(variables);

    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedTemplate(null)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {selectedTemplate.emoji} {selectedTemplate.name}
            </h3>
          </div>
        </div>

        {/* Template Preview */}
        <div className="p-4 bg-pink-50 dark:bg-pink-900/20 border-b border-pink-200 dark:border-pink-800">
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
            <strong>Title:</strong> {selectedTemplate.template_title}
          </p>
          {selectedTemplate.template_description && (
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <strong>Description:</strong> {selectedTemplate.template_description}
            </p>
          )}
        </div>

        {/* Variable Inputs */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {variableNames.length > 0 ? (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Fill in the following details:
              </p>
              {variableNames.map((varName) => (
                <div key={varName}>
                  <label htmlFor="field-1" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 cursor-pointer">
                    {varName}
                  </label>
                  <input
                    type="text"
                    value={variables[varName]}
                    id="field-1"
                    onChange={(e) =>
                      setVariables({ ...variables, [varName]: e.target.value })
                    }
                    placeholder={`Enter ${varName.toLowerCase()}...`}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 dark:text-white"
                  />
                </div>
              ))}
            </>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              No additional details needed.
            </p>
          )}

          {/* Custom Time Input */}
          {selectedTemplate.reminder_type === 'time' && (
            <div>
              <label htmlFor="field-2" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 cursor-pointer">
                Reminder Time
              </label>
              <input
                type="datetime-local"
                value={customTime}
                id="field-2"
                onChange={(e) => setCustomTime(e.target.value)}
                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent text-gray-900 dark:text-white"
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
          <button
            onClick={() => setSelectedTemplate(null)}
            className="px-6 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-all font-medium"
          >
            Back
          </button>
          <button
            onClick={handleApplyTemplate}
            className="px-6 py-2.5 bg-gradient-to-r from-pink-500 to-pink-600 text-white rounded-full transition-all shadow-lg shadow-pink-500/25 font-medium hover:from-pink-600 hover:to-pink-700"
          >
            Use Template
          </button>
        </div>
      </div>
    );
  }

  // Template list view
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Choose a Template
        </h3>
      </div>

      {/* Template Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500" />
          </div>
        ) : templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Sparkles className="w-12 h-12 text-gray-400 mb-3" />
            <p className="text-gray-600 dark:text-gray-400">
              No templates available
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleTemplateClick(template)}
                className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-lg hover:border-pink-300 dark:hover:border-pink-600 transition-all text-left min-h-[80px]"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{template.emoji}</span>
                    <div>
                      <h4 className="text-base sm:text-sm font-semibold text-gray-900 dark:text-white">
                        {template.name}
                      </h4>
                      {template.is_system_template && (
                        <div className="flex items-center gap-1 text-xs text-pink-600 dark:text-pink-400">
                          <Star className="w-3 h-3 fill-current" />
                          System
                        </div>
                      )}
                    </div>
                  </div>
                  <span className={`text-xs font-medium ${getPriorityColor(template.priority)}`}>
                    {template.priority}
                  </span>
                </div>

                {/* Description */}
                {template.description && (
                  <p className="text-sm sm:text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                    {template.description}
                  </p>
                )}

                {/* Category Badge */}
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 text-xs font-medium text-white rounded ${getCategoryColor(
                      template.category
                    )}`}
                  >
                    {template.category}
                  </span>
                  {template.usage_count > 0 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Used {template.usage_count}×
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
