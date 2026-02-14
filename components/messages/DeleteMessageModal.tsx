'use client';

import { useState } from 'react';
import { Trash2, Users, User } from 'lucide-react';
import { DeleteMessageMode } from '@/lib/services/messages-service';
import { Modal } from '@/components/ui/Modal';

interface DeleteMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (mode: DeleteMessageMode) => void;
  isOwnMessage: boolean;
  isDeleting?: boolean;
}

/** Displays a confirmation modal for deleting a message. */
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

  const handleConfirm = () => {
    onConfirm(selectedMode);
  };

  const footerContent = (
    <div className="flex gap-3">
      <button
        onClick={onClose}
        disabled={isDeleting}
        className="flex-1 px-4 py-2.5 rounded-full font-medium text-gray-300 bg-gray-700 hover:bg-gray-600 transition-colors disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        onClick={handleConfirm}
        disabled={isDeleting}
        className={`flex-1 px-4 py-2.5 rounded-full font-medium text-white transition-colors disabled:opacity-50 ${
          selectedMode === 'for_everyone'
            ? 'bg-red-500 hover:bg-red-600'
            : 'bg-blue-500 hover:bg-blue-600'
        }`}
      >
        {isDeleting ? 'Deleting...' : 'Delete'}
      </button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Message"
      maxWidth="sm"
      footer={footerContent}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-900/30 flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-400" />
          </div>
          <p className="text-sm text-gray-400">
            How would you like to delete this message?
          </p>
        </div>

        {/* Delete Options */}
        <div className="space-y-3">
          {/* Delete for Me */}
          <button
            onClick={() => setSelectedMode('for_me')}
            disabled={isDeleting}
            className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 ${
              selectedMode === 'for_me'
                ? 'border-blue-500 bg-blue-900/20'
                : 'border-gray-700 hover:border-gray-600'
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              selectedMode === 'for_me'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-800 text-gray-400'
            }`}>
              <User className="w-5 h-5" />
            </div>
            <div className="flex-1 text-left">
              <p className={`font-medium ${
                selectedMode === 'for_me'
                  ? 'text-blue-300'
                  : 'text-white'
              }`}>
                Delete for Me
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Others will still see this message
              </p>
            </div>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              selectedMode === 'for_me'
                ? 'border-blue-500 bg-blue-500'
                : 'border-gray-600'
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
                  ? 'border-red-500 bg-red-900/20'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                selectedMode === 'for_everyone'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-800 text-gray-400'
              }`}>
                <Users className="w-5 h-5" />
              </div>
              <div className="flex-1 text-left">
                <p className={`font-medium ${
                  selectedMode === 'for_everyone'
                    ? 'text-red-300'
                    : 'text-white'
                }`}>
                  Delete for Everyone
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  This message will be removed for all participants
                </p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selectedMode === 'for_everyone'
                  ? 'border-red-500 bg-red-500'
                  : 'border-gray-600'
              }`}>
                {selectedMode === 'for_everyone' && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
