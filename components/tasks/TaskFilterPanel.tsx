'use client';

import { useState, useEffect, useCallback } from 'react';
import { Filter, X, Search, Calendar, User, Tag, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface TaskFilterPanelProps {
  spaceId: string;
  onFilterChange: (filters: TaskFilters) => void;
}

export interface TaskFilters {
  search?: string;
  status?: string[];
  priority?: string[];
  assignees?: string[];
  categories?: string[];
  dueDateFrom?: string;
  dueDateTo?: string;
  tags?: string[];
  hasAttachments?: boolean;
  hasDependencies?: boolean;
  isPastDue?: boolean;
  frequency?: string[];
  itemType?: 'task' | 'chore' | 'all';
}

interface Category {
  id: string;
  name: string;
  color: string;
}

interface SpaceMember {
  user_id: string;
  users: {
    id: string;
    email: string;
    full_name: string | null;
  };
}

/** Renders a filter panel for filtering tasks by status, priority, and assignee. */
export function TaskFilterPanel({ spaceId, onFilterChange }: TaskFilterPanelProps) {
  const [filters, setFilters] = useState<TaskFilters>({});
  const [isExpanded, setIsExpanded] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [members, setMembers] = useState<SpaceMember[]>([]);
  const [, setLoading] = useState(true);

  const loadFilterOptions = useCallback(async () => {
    const supabase = createClient();

    const [categoriesData, membersData] = await Promise.all([
      supabase.from('task_categories').select('id, name, color').eq('space_id', spaceId),
      supabase.from('space_members').select(`
        user_id,
        users!user_id (
          id,
          email,
          full_name
        )
      `).eq('space_id', spaceId),
    ]);

    setCategories(categoriesData.data || []);
    setMembers((membersData.data as SpaceMember[]) || []);
    setLoading(false);
  }, [spaceId]);

  useEffect(() => {
    queueMicrotask(() => loadFilterOptions());
  }, [loadFilterOptions]);

  useEffect(() => {
    onFilterChange(filters);
  }, [filters, onFilterChange]);

  function updateFilter<K extends keyof TaskFilters>(key: K, value: TaskFilters[K]) {
    setFilters(prev => ({ ...prev, [key]: value }));
  }

  function toggleArrayFilter(key: keyof TaskFilters, value: string) {
    setFilters(prev => {
      const current = (prev[key] as string[]) || [];
      const newValue = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [key]: newValue.length > 0 ? newValue : undefined };
    });
  }

  function clearFilters() {
    setFilters({});
  }

  function getActiveFilterCount(): number {
    return Object.values(filters).filter(v => {
      if (Array.isArray(v)) return v.length > 0;
      return v !== undefined && v !== '';
    }).length;
  }

  const activeCount = getActiveFilterCount();

  const statusOptions = [
    { value: 'not-started', label: 'Not Started', color: 'bg-gray-700 text-gray-300' },
    { value: 'in-progress', label: 'In Progress', color: 'bg-blue-900/30 text-blue-300' },
    { value: 'completed', label: 'Completed', color: 'bg-green-900/30 text-green-300' },
    { value: 'blocked', label: 'Blocked', color: 'bg-red-900/30 text-red-300' },
    { value: 'on-hold', label: 'On Hold', color: 'bg-amber-900/30 text-amber-300' },
  ];

  const priorityOptions = [
    { value: 'urgent', label: 'Urgent', color: 'text-red-600' },
    { value: 'high', label: 'High', color: 'text-orange-600' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-600' },
    { value: 'low', label: 'Low', color: 'text-green-600' },
  ];

  return (
    <div className="bg-gray-800/80 rounded-lg border border-gray-700/50 shadow-lg">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="btn-touch w-full flex items-center justify-between p-4 hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <span className="font-medium text-white">Filters</span>
          {activeCount > 0 && (
            <span className="px-2 py-0.5 text-xs bg-blue-500 text-white rounded-full">
              {activeCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                clearFilters();
              }}
              className="btn-touch px-3 py-1 text-xs text-gray-400 hover:text-white transition-colors"
            >
              Clear all
            </button>
          )}
          <X className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-0' : 'rotate-45'}`} />
        </div>
      </button>

      {/* Filter Options */}
      {isExpanded && (
        <div className="p-4 border-t border-gray-700/50 space-y-4">
          {/* Search */}
          <div>
            <label htmlFor="field-1" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
              <Search className="w-4 h-4 inline mr-1" />
              Search
            </label>
            <input
              type="text"
              value={filters.search || ''}
              onChange={(e) => updateFilter('search', e.target.value || undefined)}
              placeholder="Search tasks..."
              className="w-full px-3 py-2 border border-gray-700/50 rounded-lg bg-gray-800/80 transition-colors hover:border-blue-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-800"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Status
            </label>
            <div className="flex flex-wrap gap-3 sm:gap-2">
              {statusOptions.map((status) => (
                <button
                  key={status.value}
                  onClick={() => toggleArrayFilter('status', status.value)}
                  className={`btn-touch px-3 py-1.5 text-xs rounded-lg transition-colors ${
                    filters.status?.includes(status.value)
                      ? `${status.color} hover:shadow-md`
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label htmlFor="field-3" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
              <AlertCircle className="w-4 h-4 inline mr-1" />
              Priority
            </label>
            <div className="flex flex-wrap gap-3 sm:gap-2">
              {priorityOptions.map((priority) => (
                <button
                  key={priority.value}
                  onClick={() => toggleArrayFilter('priority', priority.value)}
                  className={`btn-touch px-3 py-1.5 text-xs rounded-lg transition-colors ${
                    filters.priority?.includes(priority.value)
                      ? `${priority.color} bg-gray-700 hover:shadow-md`
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  {priority.label}
                </button>
              ))}
            </div>
          </div>

          {/* Assignees */}
          {members.length > 0 && (
            <div>
              <label htmlFor="field-4" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
                <User className="w-4 h-4 inline mr-1" />
                Assignee
              </label>
              <div className="space-y-2">
                {members.map((member) => (
                  <label
                    key={member.user_id}
                    htmlFor="field-5" className="btn-touch flex items-center gap-2 cursor-pointer hover:bg-gray-700 p-2 rounded transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={filters.assignees?.includes(member.user_id) || false}
                      id="field-5"
              onChange={() =>  toggleArrayFilter('assignees', member.user_id)}
                      className="rounded border-gray-300 text-blue-500"
                    />
                    <span className="text-sm text-gray-300">
                      {member.users.full_name || member.users.email}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Categories */}
          {categories.length > 0 && (
            <div>
              <label htmlFor="field-6" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
                <Tag className="w-4 h-4 inline mr-1" />
                Category
              </label>
              <div className="flex flex-wrap gap-3 sm:gap-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => toggleArrayFilter('categories', category.id)}
                    className={`btn-touch px-3 py-1.5 text-xs rounded-lg transition-colors ${
                      filters.categories?.includes(category.id)
                        ? `bg-${category.color}-100 text-${category.color}-700 hover:shadow-md`
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Due Date Range */}
          <div>
            <label htmlFor="field-7" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
              <Calendar className="w-4 h-4 inline mr-1" />
              Due Date
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={filters.dueDateFrom || ''}
                onChange={(e) => updateFilter('dueDateFrom', e.target.value || undefined)}
                className="px-3 py-2 text-sm border border-gray-700/50 rounded-lg bg-gray-800/80 transition-colors hover:border-blue-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-800"
              />
              <input
                type="date"
                value={filters.dueDateTo || ''}
                onChange={(e) => updateFilter('dueDateTo', e.target.value || undefined)}
                className="px-3 py-2 text-sm border border-gray-700/50 rounded-lg bg-gray-800/80 transition-colors hover:border-blue-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-800"
              />
            </div>
          </div>

          {/* Special Filters */}
          <div>
            <label htmlFor="field-8" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
              Special Filters
            </label>
            <div className="space-y-2">
              <label htmlFor="field-9" className="btn-touch flex items-center gap-2 cursor-pointer hover:bg-gray-700 p-2 rounded transition-colors">
                <input
                  type="checkbox"
                  checked={filters.isPastDue || false}
                  onChange={(e) => updateFilter('isPastDue', e.target.checked || undefined)}
                  className="rounded border-gray-300 text-blue-500"
                />
                <span className="text-sm text-gray-300">Past Due</span>
              </label>
              <label htmlFor="field-10" className="btn-touch flex items-center gap-2 cursor-pointer hover:bg-gray-700 p-2 rounded transition-colors">
                <input
                  type="checkbox"
                  checked={filters.hasAttachments || false}
                  onChange={(e) => updateFilter('hasAttachments', e.target.checked || undefined)}
                  className="rounded border-gray-300 text-blue-500"
                />
                <span className="text-sm text-gray-300">Has Attachments</span>
              </label>
              <label htmlFor="field-11" className="btn-touch flex items-center gap-2 cursor-pointer hover:bg-gray-700 p-2 rounded transition-colors">
                <input
                  type="checkbox"
                  checked={filters.hasDependencies || false}
                  onChange={(e) => updateFilter('hasDependencies', e.target.checked || undefined)}
                  className="rounded border-gray-300 text-blue-500"
                />
                <span className="text-sm text-gray-300">Has Dependencies</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
