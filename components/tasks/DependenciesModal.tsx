'use client';

import { useState, useEffect } from 'react';
import { X, Link2, AlertCircle, Search, Trash2 } from 'lucide-react';
import { taskDependenciesService } from '@/lib/services/task-dependencies-service';
import { createClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

interface TaskDependency {
  id: string;
  task_id: string;
  depends_on_task_id: string;
  dependency_type: string;
  dependent_task?: any;
  created_at: string;
}

interface DependenciesModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: string;
  spaceId: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
}

export function DependenciesModal({ isOpen, onClose, taskId, spaceId }: DependenciesModalProps) {
  const [dependencies, setDependencies] = useState<TaskDependency[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Task[]>([]);
  const [dependencyType, setDependencyType] = useState<'blocks' | 'relates_to'>('blocks');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (isOpen) loadDependencies();
  }, [isOpen, taskId]);

  useEffect(() => {
    if (searchTerm.length >= 2) {
      searchTasks();
    } else {
      setSearchResults([]);
    }
  }, [searchTerm]);

  async function loadDependencies() {
    try {
      const data = await taskDependenciesService.getDependencies(taskId);
      setDependencies(data);
    } catch (error) {
      logger.error('Error loading dependencies:', error, { component: 'DependenciesModal', action: 'component_action' });
    } finally {
      setLoading(false);
    }
  }

  async function searchTasks() {
    const supabase = createClient();
    const { data } = await supabase
      .from('tasks')
      .select('id, title, status, priority')
      .eq('space_id', spaceId)
      .neq('id', taskId)
      .ilike('title', `%${searchTerm}%`)
      .limit(10);

    setSearchResults(data || []);
  }

  async function addDependency(dependentTaskId: string) {
    setAdding(true);
    try {
      await taskDependenciesService.addDependency(taskId, dependentTaskId, dependencyType);
      setSearchTerm('');
      setSearchResults([]);
      loadDependencies();
    } catch (error: any) {
      if (error.message?.includes('circular')) {
        alert('Cannot add dependency: This would create a circular dependency chain');
      } else {
        logger.error('Error adding dependency:', error, { component: 'DependenciesModal', action: 'component_action' });
        alert('Failed to add dependency');
      }
    } finally {
      setAdding(false);
    }
  }

  async function removeDependency(dependencyId: string) {
    try {
      await taskDependenciesService.removeDependency(dependencyId);
      loadDependencies();
    } catch (error) {
      logger.error('Error removing dependency:', error, { component: 'DependenciesModal', action: 'component_action' });
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50 dark:bg-green-900/20';
      case 'in-progress': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
      case 'blocked': return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      default: return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
    }
  }

  function getPriorityColor(priority: string) {
    switch (priority) {
      case 'urgent': return 'text-red-600';
      case 'high': return 'text-orange-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  }

  if (!isOpen) return null;

  const blocksDependencies = dependencies.filter(d => d.dependency_type === 'blocks');
  const relatedDependencies = dependencies.filter(d => d.dependency_type === 'relates_to');

  return (
    <div className="fixed inset-0 z-50 sm:flex sm:items-center sm:justify-center sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-50 dark:bg-gray-800 w-full h-full sm:w-auto sm:h-auto sm:rounded-xl sm:max-w-3xl sm:max-h-[90vh] overflow-y-auto overscroll-contain shadow-2xl flex flex-col">
        <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-between px-4 sm:px-6 py-4 rounded-t-xl">
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-white" />
            <h2 className="text-lg sm:text-xl font-bold text-white">Task Dependencies</h2>
          </div>
          <button onClick={onClose} className="w-12 h-12 sm:w-10 sm:h-10 flex items-center justify-center rounded-full hover:bg-white/20 transition-all active:scale-95">
            <X className="w-5 h-5 sm:w-4 sm:h-4 text-white" />
          </button>
        </div>

        <div className="flex-1 px-4 sm:px-6 py-4 sm:py-6 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading dependencies...</div>
          ) : (
            <>
              {/* Add Dependency Section */}
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Add Dependency
                </h3>

                <div className="flex gap-3 sm:gap-2 mb-3">
                  <button
                    onClick={() => setDependencyType('blocks')}
                    className={`px-3 py-1.5 text-sm rounded-lg ${
                      dependencyType === 'blocks'
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Blocks
                  </button>
                  <button
                    onClick={() => setDependencyType('relates_to')}
                    className={`px-3 py-1.5 text-sm rounded-lg ${
                      dependencyType === 'relates_to'
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    Relates To
                  </button>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search for tasks to link..."
                    className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800"
                  />
                </div>

                {searchResults.length > 0 && (
                  <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    {searchResults.map((task) => (
                      <button
                        key={task.id}
                        onClick={() => addDependency(task.id)}
                        disabled={adding}
                        className="w-full flex items-center justify-between p-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(task.status)}`}>
                              {task.status}
                            </span>
                            <span className={`text-xs ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Circular Dependency Warning */}
              <div className="flex items-start gap-2 p-3 mb-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  Circular dependencies are automatically prevented. If a task cannot be added, it would create a dependency loop.
                </p>
              </div>

              {/* Blocking Dependencies */}
              {blocksDependencies.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Blocking Tasks ({blocksDependencies.length})
                  </h3>
                  <div className="space-y-2">
                    {blocksDependencies.map((dep) => (
                      <div
                        key={dep.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {dep.dependent_task?.title || 'Unknown Task'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            This task blocks the dependent task
                          </p>
                        </div>
                        <button
                          onClick={() => removeDependency(dep.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Dependencies */}
              {relatedDependencies.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Related Tasks ({relatedDependencies.length})
                  </h3>
                  <div className="space-y-2">
                    {relatedDependencies.map((dep) => (
                      <div
                        key={dep.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {dep.dependent_task?.title || 'Unknown Task'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Related to this task
                          </p>
                        </div>
                        <button
                          onClick={() => removeDependency(dep.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {dependencies.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No dependencies yet. Add dependencies to organize task relationships.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
