'use client';

import { useState, useEffect } from 'react';
import { Mail, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { csrfFetch } from '@/lib/utils/csrf-fetch';
import { Modal } from '@/components/ui/Modal';

interface InvitePartnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  spaceId: string;
  spaceName: string;
}

export function InvitePartnerModal({ isOpen, onClose, spaceId, spaceName }: InvitePartnerModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'member' | 'admin'>('member');
  const [loading, setLoading] = useState(false);
  const [invitationUrl, setInvitationUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setRole('member');
      setLoading(false);
      setInvitationUrl(null);
      setCopied(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      const response = await csrfFetch('/api/spaces/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          space_id: spaceId,
          email: email.trim().toLowerCase(),
          role: role,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to send invitation');
      }

      // Show appropriate message based on email status
      if (result.data.email_sent) {
        toast.success('Invitation sent successfully!');
      } else {
        // Email failed but invitation was created - show warning
        toast.warning('Invitation created, but email delivery failed. Share the link directly.', {
          duration: 5000,
        });
      }
      setInvitationUrl(result.data.invitation_url);
    } catch (error) {
      logger.error('Error sending invitation:', error, { component: 'InvitePartnerModal', action: 'component_action' });
      toast.error(error instanceof Error ? error.message : 'Failed to send invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyUrl = async () => {
    if (!invitationUrl) return;

    try {
      await navigator.clipboard.writeText(invitationUrl);
      setCopied(true);
      toast.success('Invitation link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy link');
    }
  };

  const handleClose = () => {
    setEmail('');
    setRole('member');
    setInvitationUrl(null);
    setCopied(false);
    onClose();
  };

  const formFooterContent = (
    <div className="flex gap-3">
      <button
        type="button"
        onClick={handleClose}
        disabled={loading}
        className="flex-1 px-6 py-3 bg-gray-700 text-gray-300 rounded-full hover:bg-gray-600 transition-colors font-medium disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="submit"
        form="invite-partner-form"
        disabled={loading}
        className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Sending...' : 'Send Invitation'}
      </button>
    </div>
  );

  const successFooterContent = (
    <button
      type="button"
      onClick={handleClose}
      className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors font-medium"
    >
      Done
    </button>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Invite to Space"
      subtitle={spaceName}
      maxWidth="md"
      headerGradient="bg-blue-600"
      footer={invitationUrl ? successFooterContent : formFooterContent}
    >
      {!invitationUrl ? (
        <form id="invite-partner-form" onSubmit={handleSubmit} className="space-y-6">
          {/* Email Input */}
          <div>
            <label htmlFor="field-1" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
              Email Address *
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                inputMode="email"
                required
                value={email}
                id="field-1"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="partner@example.com"
                className="w-full pl-11 pr-4 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white"
                disabled={loading}
              />
            </div>
            <p className="mt-2 text-sm text-gray-400">
              They&apos;ll receive an email with a link to join this space.
            </p>
          </div>

          {/* Role Selection */}
          <div className="relative z-50">
            <label htmlFor="role-select" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
              Role *
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'member' | 'admin')}
              className="w-full pl-4 pr-10 py-3 bg-gray-900 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-white appearance-none relative z-50"
              disabled={loading}
              id="role-select"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: 'right 12px center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: '16px',
                position: 'relative',
                zIndex: 9999
              }}
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <div className="mt-2 text-sm text-gray-400">
              <p className="mb-1"><span className="font-medium">Member:</span> Can view and collaborate on all content</p>
              <p><span className="font-medium">Admin:</span> Can invite/remove members and manage the workspace</p>
            </div>
          </div>
        </form>
      ) : (
        /* Success View with Invitation URL */
        <div className="space-y-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">
              Invitation Sent!
            </h3>
            <p className="text-sm text-gray-400 mt-2">
              An invitation has been sent to <span className="font-medium">{email}</span>
            </p>
          </div>

          {/* Invitation URL */}
          <div>
            <label htmlFor="field-2" className="block text-sm font-medium text-gray-300 mb-2 cursor-pointer">
              Invitation Link
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={invitationUrl}
                readOnly
                className="flex-1 px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm"
                id="field-2"
              />
              <button
                type="button"
                onClick={handleCopyUrl}
                className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                title="Copy link"
              >
                {copied ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Copy className="w-5 h-5" />
                )}
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-400">
              You can also share this link directly with them.
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
}
