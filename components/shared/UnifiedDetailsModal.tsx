'use client';

import { useState, useEffect } from 'react';
import {
  X, FileText, Paperclip, MessageSquare, Link, CheckCircle,
  Zap, Download, Calendar, Clock, User, Share2, Star,
  Upload, Send, Trash2, Edit3, AlertCircle, Users
} from 'lucide-react';
import { Task, Chore } from '@/lib/types';
import {
  TASK_CATEGORIES,
  CHORE_CATEGORIES,
  PRIORITY_LEVELS,
  STATUS_TYPES,
  FAMILY_ROLES
} from '@/lib/constants/item-categories';

type ItemType = Task | Chore;

interface UnifiedDetailsModalProps {
  item: (ItemType & { type?: 'task' | 'chore' }) | null;
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
  userId: string;
  onUpdate: () => void;
}

interface TabConfig {
  id: string;
  label: string;
  icon: any;
  badge?: number;
  color?: string;
}

export function UnifiedDetailsModal({
  item,
  isOpen,
  onClose,
  spaceId,
  userId,
  onUpdate
}: UnifiedDetailsModalProps) {
  // State management
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    action: () => void;
    variant: 'danger' | 'warning' | 'info' | 'success';
  } | null>(null);

  // Comments state
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');

  // Attachments state
  const [attachments, setAttachments] = useState<any[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  // Dependencies state
  const [dependencies, setDependencies] = useState<any[]>([]);

  // Time tracking state
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [isTracking, setIsTracking] = useState(false);

  // Export state
  const [exportOptions, setExportOptions] = useState({
    format: 'csv',
    scope: 'this_item',
    columns: ['title', 'status', 'priority', 'due_date']
  });

  // Get item type and categories
  const itemType = item.type || 'task';
  const categories = itemType === 'task' ? TASK_CATEGORIES : CHORE_CATEGORIES;

  // Define tabs based on item type
  const tabs: TabConfig[] = [
    { id: 'overview', label: 'Overview', icon: FileText, color: 'blue' },
    { id: 'comments', label: 'Comments', icon: MessageSquare, badge: comments.length, color: 'green' },
    { id: 'attachments', label: 'Files', icon: Paperclip, badge: attachments.length, color: 'purple' },
    { id: 'time', label: 'Time Tracking', icon: Clock, color: 'amber' },
    ...(itemType === 'task' ? [
      { id: 'dependencies', label: 'Dependencies', icon: Link, badge: dependencies.length, color: 'indigo' },
      { id: 'approval', label: 'Approval', icon: CheckCircle, color: 'emerald' },
    ] : []),
    { id: 'actions', label: 'Actions', icon: Zap, color: 'red' },
    { id: 'export', label: 'Export', icon: Download, color: 'cyan' },
  ];

  // Load data based on active tab
  useEffect(() => {
    if (!isOpen) return;

    // Load initial data
    loadTabData(activeTab);
  }, [activeTab, isOpen]);

  const loadTabData = async (tabId: string) => {
    setLoading(true);
    try {
      switch (tabId) {
        case 'comments':
          // Load comments
          setComments([
            { id: 1, user: 'Mom', content: 'Don\'t forget to check the expiration dates!', timestamp: new Date(), avatar: '👩' },
            { id: 2, user: 'Dad', content: 'I can help with this on Saturday', timestamp: new Date(), avatar: '👨' }
          ]);
          break;
        case 'attachments':
          // Load attachments
          setAttachments([]);
          break;
        case 'dependencies':
          // Load dependencies
          setDependencies([]);
          break;
        case 'time':
          // Load time entries
          setTimeEntries([]);
          break;
      }
    } catch (error) {
      console.error('Error loading tab data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handler functions
  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    const comment = {
      id: Date.now(),
      user: 'You',
      content: newComment,
      timestamp: new Date(),
      avatar: '😊'
    };

    setComments(prev => [...prev, comment]);
    setNewComment('');
  };

  const handleFileUpload = (files: FileList) => {
    Array.from(files).forEach(file => {
      const attachment = {
        id: Date.now() + Math.random(),
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedBy: 'You',
        uploadedAt: new Date()
      };
      setAttachments(prev => [...prev, attachment]);
    });
  };

  const handleDeleteConfirmation = (title: string, message: string, action: () => void) => {
    setConfirmAction({
      title,
      message,
      action,
      variant: 'danger'
    });
  };

  const handleExport = async () => {
    // Implement export functionality
    console.log('Exporting with options:', exportOptions);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Ultra-Wide Modal for Family Collaboration */}
      <div className="relative bg-gray-50 dark:bg-gray-800 w-full max-w-7xl h-full max-h-[95vh] overflow-hidden rounded-none sm:rounded-2xl shadow-2xl flex flex-col">

        {/* Elegant Header with Item Info */}
        <div className="sticky top-0 z-10 bg-gradient-tasks text-white px-6 py-5 border-b border-blue-500/20">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4 flex-1">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
                {itemType === 'task' ? '✅' : '🏠'}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold mb-1 truncate">{item.title}</h2>
                <div className="flex items-center gap-4 text-blue-100 text-sm">
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4" />
                    {itemType === 'task' ? 'Task' : 'Chore'}
                  </span>
                  <span className="flex items-center gap-1">
                    {STATUS_TYPES[item.status as keyof typeof STATUS_TYPES]?.emoji}
                    {STATUS_TYPES[item.status as keyof typeof STATUS_TYPES]?.label}
                  </span>
                  {item.due_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Due {new Date(item.due_date).toLocaleDateString()}
                    </span>
                  )}
                  {item.assigned_to && (
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4" />
                      {item.assigned_to}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Enhanced Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="px-6">
            <nav className="flex space-x-1 overflow-x-auto py-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                  {tab.badge && tab.badge > 0 && (
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      activeTab === tab.id
                        ? 'bg-white/20 text-white'
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                    }`}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Main Information */}
                  <div className="lg:col-span-2 space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Description</h3>
                      <div className="p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                        <p className="text-gray-700 dark:text-gray-300">
                          {item.description || 'No description provided.'}
                        </p>
                      </div>
                    </div>

                    {/* Quick Edit Form */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Quick Edit</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                          <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-900">
                            {Object.entries(STATUS_TYPES).map(([key, status]) => (
                              <option key={key} value={key} selected={key === item.status}>
                                {status.emoji} {status.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Priority</label>
                          <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-900">
                            {Object.entries(PRIORITY_LEVELS).map(([key, priority]) => (
                              <option key={key} value={key}>
                                {priority.emoji} {priority.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Side Panel */}
                  <div className="space-y-6">
                    {/* Family Assignment */}
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Family Assignment
                      </h4>
                      <div className="space-y-2">
                        <div className="text-sm text-blue-700 dark:text-blue-300">
                          Assigned to: <span className="font-medium">{item.assigned_to || 'Unassigned'}</span>
                        </div>
                        <button className="text-blue-600 dark:text-blue-400 text-sm hover:underline">
                          Change assignment
                        </button>
                      </div>
                    </div>

                    {/* Category & Tags */}
                    <div className="p-4 bg-gray-100 dark:bg-gray-900 rounded-lg">
                      <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Details</h4>
                      <div className="space-y-3">
                        <div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">Category:</span>
                          <div className="mt-1">
                            {(item as any).category && categories[(item as any).category] ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md text-sm">
                                {categories[(item as any).category].emoji}
                                {categories[(item as any).category].label}
                              </span>
                            ) : (
                              <span className="text-gray-500">No category</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">Created:</span>
                          <div className="text-sm text-gray-900 dark:text-gray-100">
                            {new Date(item.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Comments Tab */}
            {activeTab === 'comments' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Family Discussion</h3>
                  <div className="text-sm text-gray-500">
                    {comments.length} comment{comments.length !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* Comments List */}
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-sm">
                        {comment.avatar}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900 dark:text-white">{comment.user}</span>
                          <span className="text-xs text-gray-500">
                            {comment.timestamp.toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Comment */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment for your family..."
                      className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-900"
                      onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                    />
                    <button
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Send
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Attachments Tab */}
            {activeTab === 'attachments' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Files & Attachments</h3>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer flex items-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Files
                  </label>
                </div>

                {/* Drop Zone */}
                <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragging
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600'
                }`}>
                  <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-600 dark:text-gray-400 mb-2">Drag and drop files here, or click to select</p>
                  <p className="text-sm text-gray-500">Support for images, documents, and more</p>
                </div>

                {/* Attachments List */}
                {attachments.length > 0 && (
                  <div className="space-y-3">
                    {attachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                          <Paperclip className="w-5 h-5 text-gray-400" />
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">{attachment.name}</div>
                            <div className="text-sm text-gray-500">
                              {(attachment.size / 1024).toFixed(1)} KB • Uploaded by {attachment.uploadedBy}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteConfirmation(
                            'Delete Attachment',
                            `Are you sure you want to delete "${attachment.name}"?`,
                            () => setAttachments(prev => prev.filter(a => a.id !== attachment.id))
                          )}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Export Tab */}
            {activeTab === 'export' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Export Options</h3>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Export Scope
                      </label>
                      <select
                        value={exportOptions.scope}
                        onChange={(e) => setExportOptions(prev => ({ ...prev, scope: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-900"
                      >
                        <option value="this_item">This {itemType} only</option>
                        <option value="related">This {itemType} + related items</option>
                        <option value="same_category">All {itemType}s in same category</option>
                        <option value="all">All {itemType}s</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Format
                      </label>
                      <div className="space-y-2">
                        {[
                          { value: 'csv', label: 'CSV Spreadsheet', icon: '📊' },
                          { value: 'pdf', label: 'PDF Report', icon: '📄' },
                          { value: 'json', label: 'JSON Data', icon: '🔧' }
                        ].map(format => (
                          <label key={format.value} className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer">
                            <input
                              type="radio"
                              name="format"
                              value={format.value}
                              checked={exportOptions.format === format.value}
                              onChange={(e) => setExportOptions(prev => ({ ...prev, format: e.target.value }))}
                              className="text-blue-600"
                            />
                            <span className="text-lg">{format.icon}</span>
                            <span className="text-gray-900 dark:text-white">{format.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Include Columns
                      </label>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {[
                          'title', 'description', 'status', 'priority', 'category',
                          'assigned_to', 'due_date', 'created_at', 'updated_at', 'tags'
                        ].map(column => (
                          <label key={column} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={exportOptions.columns.includes(column)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setExportOptions(prev => ({
                                    ...prev,
                                    columns: [...prev.columns, column]
                                  }));
                                } else {
                                  setExportOptions(prev => ({
                                    ...prev,
                                    columns: prev.columns.filter(c => c !== column)
                                  }));
                                }
                              }}
                              className="text-blue-600"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                              {column.replace('_', ' ')}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handleExport}
                      className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                    >
                      <Download className="w-5 h-5" />
                      Export {itemType}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Other tabs would go here... */}
            {activeTab === 'time' && (
              <div className="text-center py-12">
                <Clock className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Time Tracking</h3>
                <p className="text-gray-600 dark:text-gray-400">Track how much time you spend on this {itemType}</p>
                <button className="mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Start Timer
                </button>
              </div>
            )}

          </div>
        </div>

        {/* Inline Confirmation Overlay */}
        {confirmAction && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md mx-4 shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="w-6 h-6 text-red-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white">{confirmAction.title}</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-6">{confirmAction.message}</p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setConfirmAction(null)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    confirmAction.action();
                    setConfirmAction(null);
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}