'use client';

import { useState } from 'react';
import { X, Trash2, Users, User } from 'lucide-react';
import { DeleteMessageMode } from '@/lib/services/messages-service';

interface DeleteMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (mode: DeleteMessageMode) => void;
  isOwnMessage: boolean;
  isDeleting?: boolean;
}

export function DeleteMessageModal({
  isOpen,
  onClose,
  onConfirm,
  isOwnMessage,
  isDeleting = false
}: DeleteMessageModalProps) {
  const [selectedMode, setSelectedMode] = useState<DeleteMessageMode>(
    isOwnMessage ? 'for_everyone' : 'for_me'
  );

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(selectedMode);
  };

  return (
    <div className="fixed inset-0 z-[200] sm:flex sm:items-center sm:justify-center sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="absolute top-14 left-0 right-0 bottom-0 sm:relative sm:inset-auto sm:top-auto bg-white dark:bg-gray-900 sm:rounded-2xl shadow-2xl sm:max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Delete Message
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            How would you like to delete this message?
          </p>

          {/* Delete Options */}
          <div className="space-y-3">
            {/* Delete for Me */}
            <button
              onClick={() => setSelectedMode('for_me')}
              disabled={isDeleting}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 ${
                selectedMode === 'for_me'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                selectedMode === 'for_me'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
              }`}>
                <User className="w-5 h-5" />
              </div>
              <div className="flex-1 text-left">
                <p className={`font-medium ${
                  selectedMode === 'for_me'
                    ? 'text-blue-700 dark:text-blue-300'
                    : 'text-gray-900 dark:text-white'
                }`}>
                  Delete for Me
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Others will still see this message
                </p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selectedMode === 'for_me'
                  ? 'border-blue-500 bg-blue-500'
                  : 'border-gray-300 dark:border-gray-600'
              }`}>
                {selectedMode === 'for_me' && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>
            </button>

            {/* Delete for Everyone - Only for own messages */}
            {isOwnMessage && (
              <button
                onClick={() => setSelectedMode('for_everyone')}
                disabled={isDeleting}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 ${
                  selectedMode === 'for_everyone'
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  selectedMode === 'for_everyone'
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                }`}>
                  <Users className="w-5 h-5" />
                </div>
                <div className="flex-1 text-left">
                  <p className={`font-medium ${
                    selectedMode === 'for_everyone'
                      ? 'text-red-700 dark:text-red-300'
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    Delete for Everyone
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    This message will be removed for all participants
                  </p>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedMode === 'for_everyone'
                    ? 'border-red-500 bg-red-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {selectedMode === 'for_everyone' && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 px-4 py-2.5 rounded-xl font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            className={`flex-1 px-4 py-2.5 rounded-xl font-medium text-white transition-colors disabled:opacity-50 ${
              selectedMode === 'for_everyone'
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
