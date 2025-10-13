'use client';

import { useState, useEffect } from 'react';
import { X, FileText, ShoppingCart, Plus, Loader2 } from 'lucide-react';
import { shoppingService } from '@/lib/services/shopping-service';
import { Tooltip } from '@/components/ui/Tooltip';

interface Template {
  id: string;
  name: string;
  description: string;
  items: any[];
  created_at: string;
}

interface TemplatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (templateId: string) => Promise<void>;
  onStartFresh: () => void;
  spaceId: string;
}

export function TemplatePickerModal({ isOpen, onClose, onSelectTemplate, onStartFresh, spaceId }: TemplatePickerModalProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && spaceId) {
      loadTemplates();
    }
  }, [isOpen, spaceId]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await shoppingService.getTemplates(spaceId);
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTemplate = async (templateId: string) => {
    try {
      setSelectedTemplateId(templateId);
      await onSelectTemplate(templateId);
      onClose();
    } catch (error) {
      console.error('Failed to create list from template:', error);
      alert('Failed to create list from template. Please try again.');
    } finally {
      setSelectedTemplateId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create Shopping List</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Start Fresh Option */}
          <button
            onClick={() => {
              onStartFresh();
              onClose();
            }}
            className="w-full p-4 border-2 border-emerald-500 dark:border-emerald-400 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors text-left group"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-shopping rounded-lg flex items-center justify-center flex-shrink-0">
                <Plus className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  Start with Empty List
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Create a new shopping list from scratch
                </p>
              </div>
            </div>
          </button>

          {/* Templates Section */}
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Loading templates...</p>
            </div>
          ) : templates.length > 0 ? (
            <>
              <div className="pt-4 pb-2">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  Or Choose a Template
                </h3>
              </div>
              <div className="space-y-3">
                {templates.map((template) => {
                  const itemCount = Array.isArray(template.items)
                    ? template.items.length
                    : typeof template.items === 'string'
                    ? JSON.parse(template.items).length
                    : 0;

                  return (
                    <button
                      key={template.id}
                      onClick={() => handleSelectTemplate(template.id)}
                      disabled={selectedTemplateId === template.id}
                      className="w-full p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-emerald-500 dark:hover:border-emerald-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                              {template.name}
                            </h4>
                            <Tooltip content={`${itemCount} items in template`}>
                              <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-medium rounded-full flex-shrink-0">
                                {itemCount} items
                              </span>
                            </Tooltip>
                          </div>
                          {template.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1 mt-1">
                              {template.description}
                            </p>
                          )}
                        </div>
                        {selectedTemplateId === template.id && (
                          <Loader2 className="w-5 h-5 text-emerald-500 animate-spin flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-8 px-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 dark:text-gray-400 mb-2">No templates saved yet</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Create a shopping list and save it as a template for future use!
              </p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
