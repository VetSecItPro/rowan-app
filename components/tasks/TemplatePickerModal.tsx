'use client';

import { useState, useEffect } from 'react';
import { X, Star, Zap } from 'lucide-react';
import { taskTemplatesService, TaskTemplate } from '@/lib/services/task-templates-service';

interface TemplatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (templateId: string) => void;
  spaceId: string;
}

export function TemplatePickerModal({ isOpen, onClose, onSelect, spaceId }: TemplatePickerModalProps) {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen) loadTemplates();
  }, [isOpen, spaceId]);

  async function loadTemplates() {
    try {
      const data = await taskTemplatesService.getTemplates(spaceId);
      setTemplates(data);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredTemplates = templates.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Task Templates</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="w-full px-4 py-2 mb-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900"
          />

          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading templates...</div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No templates found</div>
          ) : (
            <div className="grid gap-3 max-h-96 overflow-y-auto">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => {
                    onSelect(template.id);
                    onClose();
                  }}
                  className="flex items-start gap-3 p-4 text-left bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  {template.is_favorite && <Star className="w-4 h-4 text-amber-500 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-white">{template.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">{template.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">Used {template.use_count} times</span>
                      {template.priority && (
                        <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                          {template.priority}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
