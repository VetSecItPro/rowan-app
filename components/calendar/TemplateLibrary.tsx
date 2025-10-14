'use client';

import { useState, useEffect } from 'react';
import { X, Clock, Plus, Trash2, Star } from 'lucide-react';
import { calendarService, EventTemplate, CreateTemplateInput } from '@/lib/services/calendar-service';
import { format, addHours } from 'date-fns';

interface TemplateLibraryProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
  onSelectTemplate: (template: EventTemplate) => void;
}

export function TemplateLibrary({ isOpen, onClose, spaceId, onSelectTemplate }: TemplateLibraryProps) {
  const [templates, setTemplates] = useState<EventTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (isOpen && spaceId) {
      loadTemplates();
    }
  }, [isOpen, spaceId]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      // Ensure system templates exist
      await calendarService.ensureSystemTemplates(spaceId);
      // Load all templates
      const data = await calendarService.getTemplates(spaceId);
      setTemplates(data);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = (template: EventTemplate) => {
    onSelectTemplate(template);
    onClose();
  };

  const handleDeleteTemplate = async (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      await calendarService.deleteTemplate(templateId);
      setTemplates(templates.filter(t => t.id !== templateId));
    } catch (error) {
      console.error('Error deleting template:', error);
      alert('Failed to delete template');
    }
  };

  const categories = [
    { value: 'all', label: 'All', icon: '📋' },
    { value: 'work', label: 'Work', icon: '💼' },
    { value: 'personal', label: 'Personal', icon: '👤' },
    { value: 'family', label: 'Family', icon: '👨‍👩‍👧‍👦' },
    { value: 'health', label: 'Health', icon: '💪' },
    { value: 'social', label: 'Social', icon: '🎉' }
  ];

  const filteredTemplates = selectedCategory === 'all'
    ? templates
    : templates.filter(t => t.category === selectedCategory);

  // Separate system and custom templates
  const systemTemplates = filteredTemplates.filter(t => t.is_system_template);
  const customTemplates = filteredTemplates.filter(t => !t.is_system_template);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-calendar p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">Event Templates</h2>
            <p className="text-purple-100 text-sm mt-1">Choose a template to create an event quickly</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Category Filter */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex gap-2 flex-wrap">
            {categories.map(cat => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedCategory === cat.value
                    ? 'bg-gradient-calendar text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <span className="mr-2">{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Templates Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-240px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* System Templates */}
              {systemTemplates.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500" />
                    Pre-built Templates
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {systemTemplates.map(template => (
                      <button
                        key={template.id}
                        onClick={() => handleSelectTemplate(template)}
                        className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-purple-400 dark:hover:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all text-left group"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="text-3xl">{template.icon || '📅'}</div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-purple-700 dark:group-hover:text-purple-300">
                                {template.name}
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {template.description}
                              </p>
                              {template.default_duration && (
                                <div className="flex items-center gap-1 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                  <Clock className="w-3 h-3" />
                                  {template.default_duration >= 60
                                    ? `${Math.floor(template.default_duration / 60)}h ${template.default_duration % 60 > 0 ? `${template.default_duration % 60}m` : ''}`
                                    : `${template.default_duration}m`
                                  }
                                </div>
                              )}
                            </div>
                          </div>
                          {template.use_count > 0 && (
                            <div className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                              Used {template.use_count}x
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Templates */}
              {customTemplates.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-purple-600" />
                    Your Custom Templates
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {customTemplates.map(template => (
                      <button
                        key={template.id}
                        onClick={() => handleSelectTemplate(template)}
                        className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-purple-400 dark:hover:border-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all text-left group relative"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="text-3xl">{template.icon || '📅'}</div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-purple-700 dark:group-hover:text-purple-300">
                                {template.name}
                              </h4>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                {template.description}
                              </p>
                              {template.default_duration && (
                                <div className="flex items-center gap-1 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                  <Clock className="w-3 h-3" />
                                  {template.default_duration >= 60
                                    ? `${Math.floor(template.default_duration / 60)}h ${template.default_duration % 60 > 0 ? `${template.default_duration % 60}m` : ''}`
                                    : `${template.default_duration}m`
                                  }
                                </div>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={(e) => handleDeleteTemplate(template.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-all"
                            title="Delete template"
                          >
                            <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                          </button>
                        </div>
                        {template.use_count > 0 && (
                          <div className="absolute top-3 right-3 text-xs text-purple-600 dark:text-purple-400 font-medium">
                            Used {template.use_count}x
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {filteredTemplates.length === 0 && !loading && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📋</div>
                  <p className="text-gray-600 dark:text-gray-400">
                    No templates found in this category
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            💡 Tip: Custom templates coming soon! Save your frequently used events as templates.
          </p>
        </div>
      </div>
    </div>
  );
}
