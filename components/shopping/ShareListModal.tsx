'use client';

import { useState, useEffect } from 'react';
import { X, Share2, Copy, Check, Eye, EyeOff, Globe, Lock } from 'lucide-react';
import { ShoppingList } from '@/lib/services/shopping-service';
import { copyToClipboard } from '@/lib/utils/share';

interface ShareListModalProps {
  isOpen: boolean;
  onClose: () => void;
  list: ShoppingList | null;
  onUpdateSharing: (listId: string, isPublic: boolean) => Promise<ShoppingList>;
}

export function ShareListModal({ isOpen, onClose, list, onUpdateSharing }: ShareListModalProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [isPublic, setIsPublic] = useState(false);

  // Update local state when list changes
  useEffect(() => {
    if (list) {
      setIsPublic(list.is_public || false);

      // Generate share URL if list is public and has a token
      if (list.is_public && list.share_token) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
        setShareUrl(`${baseUrl}/shopping/share/${list.share_token}`);
      } else {
        setShareUrl('');
      }
    }
  }, [list]);

  const handleToggleSharing = async () => {
    if (!list) return;

    setIsSharing(true);
    try {
      const newPublicState = !isPublic;
      const updatedList = await onUpdateSharing(list.id, newPublicState);

      setIsPublic(newPublicState);

      // Generate new share URL if made public
      if (newPublicState && updatedList.share_token) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
        setShareUrl(`${baseUrl}/shopping/share/${updatedList.share_token}`);
      } else {
        setShareUrl('');
      }
    } catch (error) {
      console.error('Failed to update sharing:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyLink = async () => {
    if (shareUrl) {
      const success = await copyToClipboard(shareUrl);
      if (success) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const handleShare = async () => {
    if (shareUrl && navigator.share) {
      try {
        await navigator.share({
          title: `Shopping List: ${list?.title}`,
          text: `Check out this shopping list`,
          url: shareUrl,
        });
      } catch (error) {
        // User cancelled or share failed, fallback to copy
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  if (!isOpen || !list) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-t-lg">
          <h2 className="text-lg font-semibold text-white">
            Share Shopping List
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-full transition-all"
            aria-label="Close sharing modal"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 dark:text-white mb-2">
              {list.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {list.items?.length || 0} items • {list.store_name || 'No store set'}
            </p>
          </div>

          {/* Public/Private Toggle */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  isPublic
                    ? 'bg-green-100 dark:bg-green-900/30'
                    : 'bg-gray-100 dark:bg-gray-700'
                }`}>
                  {isPublic ? (
                    <Globe className="w-5 h-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <Lock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {isPublic ? 'Public Link' : 'Private List'}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {isPublic
                      ? 'Anyone with the link can view this list'
                      : 'Only space members can access this list'
                    }
                  </p>
                </div>
              </div>

              <button
                onClick={handleToggleSharing}
                disabled={isSharing}
                className={`relative inline-flex items-center w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                  isPublic ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-gray-600'
                } ${isSharing ? 'opacity-50 cursor-not-allowed' : ''}`}
                aria-label={`${isPublic ? 'Make private' : 'Make public'}`}
              >
                <span
                  className={`inline-block w-4 h-4 bg-white rounded-full transform transition-transform ${
                    isPublic ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Share Link Section */}
          {isPublic && shareUrl && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Shareable Link
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    onClick={handleCopyLink}
                    className={`px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      copied
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-600'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                    aria-label="Copy link"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Recipients can view and check off items without signing up
                </p>
              </div>

              {/* Share Actions */}
              <div className="flex gap-2">
                <button
                  onClick={handleShare}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <Share2 className="w-4 h-4" />
                  Share Link
                </button>
              </div>
            </div>
          )}

          {/* Privacy Notice */}
          <div className="mt-6 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex gap-2">
              <div className="flex-shrink-0">
                <div className="w-4 h-4 mt-0.5 text-blue-600 dark:text-blue-400">
                  ℹ️
                </div>
              </div>
              <div>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  {isPublic ? (
                    <>
                      <strong>Public lists</strong> can be viewed by anyone with the link.
                      Links are secure and hard to guess, but avoid sharing sensitive information.
                    </>
                  ) : (
                    <>
                      <strong>Private lists</strong> are only accessible to members of your space.
                      Make public to share with people outside your space.
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 p-6 pt-0">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}