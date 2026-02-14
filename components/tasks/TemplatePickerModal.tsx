'use client';

import { useState, useEffect, useMemo } from 'react';
import { useDebounce } from 'use-debounce';
import { Star } from 'lucide-react';
import { taskTemplatesService, TaskTemplate } from '@/lib/services/task-templates-service';
import { Modal } from '@/components/ui/Modal';
import { logger } from '@/lib/logger';

interface TemplatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (templateId: string) => void;
  spaceId: string;
}

/** Displays a modal for selecting from task templates. */
export function TemplatePickerModal({ isOpen, onClose, onSelect, spaceId }: TemplatePickerModalProps) {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebounce(search, 300);

  useEffect(() => {
    if (isOpen) loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadTemplates is a stable function
  }, [isOpen, spaceId]);

  async function loadTemplates() {
    try {
      const data = await taskTemplatesService.getTemplates(spaceId);
      setTemplates(data);
    } catch (error) {
      logger.error('Error loading templates:', error, { component: 'TemplatePickerModal', action: 'component_action' });
    } finally {
      setLoading(false);
    }
  }

  const filteredTemplates = useMemo(() => {
    return templates.filter(t =>
      t.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      t.title.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [templates, debouncedSearch]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Task Templates"
      maxWidth="2xl"
      headerGradient="bg-gradient-to-r from-blue-500 to-blue-600"
    >
      <div className="space-y-4">
        <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates..."
            className="w-full px-4 py-2 mb-4 border border-gray-600 rounded-lg bg-gray-900"
          />

          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading templates...</div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No templates found</div>
          ) : (
            <div className="flex flex-col gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-3 max-h-96 overflow-y-auto">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => {
                    onSelect(template.id);
                    onClose();
                  }}
                  className="w-full flex items-start gap-3 p-4 text-left bg-gray-900 hover:bg-gray-800 border-2 border-gray-700 rounded-lg transition-colors min-h-[80px]"
                >
                  {template.is_favorite && <Star className="w-4 h-4 text-amber-500 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-sm font-medium text-white">{template.name}</h3>
                    <p className="text-sm sm:text-xs text-gray-400 truncate">{template.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-400">Used {template.use_count} times</span>
                      {template.priority && (
                        <span className="text-xs px-2 py-0.5 bg-blue-900 text-blue-300 rounded">
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
    </Modal>
  );
}
