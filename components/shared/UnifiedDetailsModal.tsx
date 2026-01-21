'use client';

import { useState } from 'react';
import { logger } from '@/lib/logger';
import {
  X, FileText, Paperclip, MessageSquare, CheckSquare, Home,
  Calendar, Clock, User, Send, Trash2, Upload, Edit3,
} from 'lucide-react';
import { Task, Chore } from '@/lib/types';
import {
  TASK_CATEGORIES,
  CHORE_CATEGORIES,
  PRIORITY_LEVELS,
  STATUS_TYPES
} from '@/lib/constants/item-categories';
import { Dropdown } from '@/components/ui/Dropdown';

type ItemType = Task | Chore;
type ItemKind = 'task' | 'chore';
type TabId = 'overview' | 'comments' | 'files';

type CommentEntry = {
  id: number | string;
  user: string;
  content: string;
  timestamp: Date;
  avatar: string;
};

type AttachmentEntry = {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: Date;
};

type ItemWithType = ItemType & { type?: ItemKind };
type EditableItemData = Partial<Task & Chore>;

interface UnifiedDetailsModalProps {
  item: ItemWithType | null;
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
  userId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onEdit?: (item: any) => void;
  onDelete?: (itemId: string, type?: 'task' | 'chore') => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSave?: (item: any) => void | Promise<void | { id: string }>;
  onUpdate?: () => void;
}

const buildInitialComments = (isOpen: boolean): CommentEntry[] => {
  if (!isOpen) return [];
  return [
    { id: 1, user: 'Mom', content: 'Don\'t forget to check the expiration dates!', timestamp: new Date(Date.now() - 3600000), avatar: '👩' },
    { id: 2, user: 'Dad', content: 'I can help with this on Saturday', timestamp: new Date(Date.now() - 1800000), avatar: '👨' }
  ];
};

function DetailsModalContent({
  item,
  isOpen,
  onClose,
  onEdit,
  onSave,
  onUpdate
}: UnifiedDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [comments, setComments] = useState<CommentEntry[]>(() => buildInitialComments(isOpen));
  const [newComment, setNewComment] = useState('');
  const [attachments, setAttachments] = useState<AttachmentEntry[]>([]);
  const [editedStatus, setEditedStatus] = useState<string>(item?.status || 'pending');
  const [editedPriority, setEditedPriority] = useState<string>((item as EditableItemData | null)?.priority || 'medium');
  const [hasChanges, setHasChanges] = useState(false);

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    setComments(prev => [...prev, {
      id: Date.now(),
      user: 'You',
      content: newComment,
      timestamp: new Date(),
      avatar: '😊'
    }]);
    setNewComment('');
  };

  const handleFileUpload = (files: FileList) => {
    Array.from(files).forEach(file => {
      setAttachments(prev => [...prev, {
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date()
      }]);
    });
  };

  const handleStatusChange = (value: string) => {
    setEditedStatus(value);
    setHasChanges(true);
  };

  const handlePriorityChange = (value: string) => {
    setEditedPriority(value);
    setHasChanges(true);
  };

  const handleSaveChanges = async () => {
    if (!item || !onSave) return;
    try {
      await onSave({
        ...item,
        status: editedStatus,
        priority: editedPriority
      });
      setHasChanges(false);
      onUpdate?.();
    } catch (error) {
      logger.error('Failed to save changes:', error, { component: 'UnifiedDetailsModal' });
    }
  };

  if (!isOpen || !item) return null;

  const itemType = item.type || 'task';
  const categories = itemType === 'task' ? TASK_CATEGORIES : CHORE_CATEGORIES;
  const itemData = item as EditableItemData;
  const category = itemData.category;
  const categoryInfo = category ? categories[category as keyof typeof categories] : undefined;

  // Format relative time
  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  // Get status options for dropdown
  const getStatusOptions = () => {
    return Object.entries(STATUS_TYPES).map(([key, status]) => ({
      value: key,
      label: `${status.emoji} ${status.label}`
    }));
  };

  // Get priority options for dropdown
  const getPriorityOptions = () => {
    return Object.entries(PRIORITY_LEVELS).map(([key, priority]) => ({
      value: key,
      label: `${priority.emoji} ${priority.label}`
    }));
  };

  return (
    <div className="fixed inset-0 z-[60] sm:flex sm:items-center sm:justify-center sm:p-4 bg-black/60 backdrop-blur-sm">
      {/* Compact Elegant Modal - Fixed height for stability */}
      <div className="absolute top-14 left-0 right-0 bottom-0 sm:relative sm:inset-auto sm:top-auto bg-gray-900 w-full sm:max-w-lg sm:h-[540px] sm:max-h-[90vh] sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">

        {/* Header - Compact gradient */}
        <div className={`flex-shrink-0 px-4 py-3 ${itemType === 'task' ? 'bg-gradient-to-r from-blue-600 to-blue-500' : 'bg-gradient-to-r from-amber-600 to-amber-500'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                {itemType === 'task' ? (
                  <CheckSquare className="w-5 h-5 text-white" />
                ) : (
                  <Home className="w-5 h-5 text-white" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-white truncate">{item.title}</h2>
                <div className="flex items-center gap-2 text-white/80 text-xs">
                  <span className="capitalize">{itemType}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${getPriorityColor(editedPriority)}`} />
                    {PRIORITY_LEVELS[editedPriority as keyof typeof PRIORITY_LEVELS]?.label || 'Medium'}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors flex-shrink-0"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Tabs - Minimal */}
        <div className="flex border-b border-gray-700 bg-gray-800/50">
          {([
            { id: 'overview', label: 'Overview', icon: FileText },
            { id: 'comments', label: `Comments`, icon: MessageSquare, badge: comments.length },
            { id: 'files', label: 'Files', icon: Paperclip, badge: attachments.length }
          ] as Array<{ id: TabId; label: string; icon: typeof FileText; badge?: number }>).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-900'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.badge && tab.badge > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-gray-700">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto sm:min-h-[320px]">

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="p-4 space-y-4">
              {/* Description */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Description</h4>
                <p className="text-sm text-gray-300 bg-gray-800 rounded-lg p-3">
                  {item.description || 'No description provided.'}
                </p>
              </div>

              {/* Quick Edit */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Quick Edit</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Status</label>
                    <Dropdown
                      value={editedStatus}
                      onChange={handleStatusChange}
                      options={getStatusOptions()}
                      placeholder="Select status..."
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Priority</label>
                    <Dropdown
                      value={editedPriority}
                      onChange={handlePriorityChange}
                      options={getPriorityOptions()}
                      placeholder="Select priority..."
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Due Date */}
                {item.due_date && (
                  <div className="p-3 bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium">Due Date</span>
                    </div>
                    <p className="text-sm font-medium text-white">
                      {new Date(item.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                )}

                {/* Assigned To */}
                <div className="p-3 bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2 text-gray-400 mb-1">
                    <User className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">Assigned To</span>
                  </div>
                  <p className="text-sm font-medium text-white">
                    {item.assigned_to ? 'Family Member' : 'Unassigned'}
                  </p>
                </div>

                {/* Category */}
                {categoryInfo && (
                  <div className="p-3 bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-2 text-gray-400 mb-1">
                      <span className="text-xs font-medium">Category</span>
                    </div>
                    <p className="text-sm font-medium text-white">
                      {categoryInfo.emoji} {categoryInfo.label}
                    </p>
                  </div>
                )}

                {/* Created */}
                <div className="p-3 bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2 text-gray-400 mb-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">Created</span>
                  </div>
                  <p className="text-sm font-medium text-white">
                    {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Comments Tab */}
          {activeTab === 'comments' && (
            <div className="p-4 space-y-4">
              {/* Comments List */}
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {comments.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No comments yet</p>
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex gap-2.5">
                      <div className="w-8 h-8 bg-blue-900/30 rounded-full flex items-center justify-center text-sm flex-shrink-0">
                        {comment.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium text-white">{comment.user}</span>
                          <span className="text-xs text-gray-400">{formatRelativeTime(comment.timestamp)}</span>
                        </div>
                        <p className="text-sm text-gray-300">{comment.content}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment */}
              <div className="flex gap-2 pt-2 border-t border-gray-700">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 px-3 py-2 text-sm border border-gray-700 rounded-lg focus:ring-2 bg-gray-800"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
                />
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Files Tab */}
          {activeTab === 'files' && (
            <div className="p-4 space-y-4">
              {/* Upload Area */}
              <label className="block border-2 border-dashed border-gray-700 rounded-lg p-6 text-center cursor-pointer hover:border-blue-500 transition-colors">
                <input
                  type="file"
                  multiple
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                  className="hidden"
                />
                <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-400">Click to upload files</p>
              </label>

              {/* Files List */}
              {attachments.length > 0 && (
                <div className="space-y-2">
                  {attachments.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-2.5 bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-2 min-w-0">
                        <Paperclip className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-sm text-gray-300 truncate">{file.name}</span>
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {(file.size / 1024).toFixed(0)} KB
                        </span>
                      </div>
                      <button
                        onClick={() => setAttachments(prev => prev.filter(a => a.id !== file.id))}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {attachments.length === 0 && (
                <div className="text-center py-4 text-gray-400">
                  <p className="text-sm">No files attached</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex-shrink-0 px-4 py-3 border-t border-gray-700 bg-gray-800/50">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => onEdit?.(item as (Task & { type: 'task' }) | (Chore & { type: 'chore' }))}
              className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              Edit
            </button>
            <div className="flex items-center gap-2">
              {hasChanges && (
                <button
                  onClick={handleSaveChanges}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Save Changes
                </button>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:bg-gray-700 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function UnifiedDetailsModal(props: UnifiedDetailsModalProps) {
  const { item, isOpen } = props;
  const modalKey = `${item?.id ?? 'none'}-${isOpen ? 'open' : 'closed'}`;
  return <DetailsModalContent key={modalKey} {...props} />;
}
