'use client';

import React, { useState, useRef, useEffect, memo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthWithSpaces } from '@/lib/hooks/useAuthWithSpaces';
import { useSpaceMembers } from '@/lib/hooks/useSpaceMembers';
import { useNumericLimit } from '@/lib/hooks/useFeatureGate';
import { csrfFetch } from '@/lib/utils/csrf-fetch';
import { showError, showWarning } from '@/lib/utils/toast';
import { logger } from '@/lib/logger';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import {
  User,
  Camera,
  Mail,
  Save,
  Trash2,
  UserPlus,
  Crown,
  Check,
  Copy,
  Loader2,
  Edit,
  X,
  Download,
  Users,
  CheckCircle2,
} from 'lucide-react';

// Image validation constants
const ALLOWED_PROFILE_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ALLOWED_PROFILE_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const MIN_IMAGE_DIMENSION = 100;
const MAX_IMAGE_DIMENSION = 2000;

type UserRole = 'Admin' | 'Member' | 'Viewer';

interface ProfileTabProps {
  onShowCreateSpaceModal: () => void;
  onShowInviteModal: () => void;
  onShowDeleteSpaceModal: () => void;
  onShowExportModal: () => void;
  onShowDeleteAccountModal: () => void;
  invitationRefreshKey?: number;
}

/** Renders the profile settings tab with avatar, name, and bio editing. */
export const ProfileTab = memo(function ProfileTab({
  onShowCreateSpaceModal,
  onShowInviteModal,
  onShowDeleteSpaceModal,
  onShowExportModal,
  onShowDeleteAccountModal,
  invitationRefreshKey,
}: ProfileTabProps) {
  const { user, currentSpace, spaces, switchSpace, refreshSpaces, refreshProfile } = useAuthWithSpaces();
  const spaceId = currentSpace?.id;

  // Space creation limit based on subscription tier
  const { limit: maxSpaces, promptIfExceeded: promptSpaceUpgrade } = useNumericLimit('maxSpaces');
  const ownedSpacesCount = spaces?.filter(s => s.role === 'owner').length || 0;

  // Profile state
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const profileImageInputRef = useRef<HTMLInputElement>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  // Use the space members hook
  const {
    spaceMembers,
    isLoadingMembers,
    isUpdatingRole,
    fetchSpaceMembers,
    handleUpdateMemberRole,
    handleRemoveMember,
    confirmRemoveMember,
    showRemoveMemberConfirm,
    setShowRemoveMemberConfirm,
    memberToRemove,
    setMemberToRemove,
    pendingInvitations,
    isLoadingInvitations,
    copiedInvitationId,
    resendingInvitationId,
    cancellingInvitationId,
    fetchPendingInvitations,
    handleCopyInvitationUrl,
    handleResendInvitation,
    handleCancelInvitation,
    isRenamingSpace,
    setIsRenamingSpace,
    newSpaceNameEdit,
    setNewSpaceNameEdit,
    isSavingSpaceName,
    handleRenameSpace,
  } = useSpaceMembers(spaceId, currentSpace?.name, refreshSpaces);

  // Update profile data when user changes
  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
      });
      setProfileImage(user.avatar_url || null);
    }
  }, [user]);

  // Fetch space members and invitations when spaceId changes
  useEffect(() => {
    if (spaceId) {
      Promise.all([fetchSpaceMembers(), fetchPendingInvitations()]);
    }
  }, [spaceId, fetchSpaceMembers, fetchPendingInvitations]);

  // Refetch pending invitations when a new invitation is sent
  useEffect(() => {
    if (invitationRefreshKey && invitationRefreshKey > 0) {
      fetchPendingInvitations();
    }
  }, [invitationRefreshKey, fetchPendingInvitations]);

  const validateProfileImage = (file: File): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      // Check file type
      if (!ALLOWED_PROFILE_IMAGE_TYPES.includes(file.type)) {
        reject('Invalid file type. Only JPG, PNG, and WebP images are allowed.');
        return;
      }

      // Check file extension
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!ALLOWED_PROFILE_IMAGE_EXTENSIONS.includes(extension)) {
        reject('Invalid file extension. Only .jpg, .jpeg, .png, and .webp files are allowed.');
        return;
      }

      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        reject(`File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB.`);
        return;
      }

      // Check image dimensions (use globalThis.Image to access native browser Image, not Next.js Image)
      const img = new globalThis.Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);

        if (img.width < MIN_IMAGE_DIMENSION || img.height < MIN_IMAGE_DIMENSION) {
          reject(`Image dimensions must be at least ${MIN_IMAGE_DIMENSION}x${MIN_IMAGE_DIMENSION} pixels. Your image is ${img.width}x${img.height} pixels.`);
          return;
        }

        if (img.width > MAX_IMAGE_DIMENSION || img.height > MAX_IMAGE_DIMENSION) {
          reject(`Image dimensions must not exceed ${MAX_IMAGE_DIMENSION}x${MAX_IMAGE_DIMENSION} pixels. Your image is ${img.width}x${img.height} pixels.`);
          return;
        }

        resolve(true);
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject('Failed to load image. Please try a different file.');
      };

      img.src = objectUrl;
    });
  };

  const handleProfileImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await validateProfileImage(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      showError(error instanceof Error ? error.message : String(error));
    }

    // Reset input
    e.target.value = '';
  };

  const handleSaveProfile = async () => {
    setIsSavingProfile(true);

    try {
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(profileData.email)) {
        showWarning('Please enter a valid email address');
        setIsSavingProfile(false);
        return;
      }

      // Validate name
      if (!profileData.name.trim()) {
        showWarning('Please enter your name');
        setIsSavingProfile(false);
        return;
      }

      // Call profile update API
      const response = await csrfFetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: profileData.name.trim(),
          email: profileData.email.trim(),
          avatar_url: profileImage, // Include profile picture
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      // Success - show animated confirmation
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 2200);

      // Refresh the auth context to get updated user data
      await refreshProfile();
    } catch (error) {
      logger.error('Failed to update profile:', error, { component: 'ProfileTab', action: 'execution' });

      // Show user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Failed to update profile. Please try again.';
      showError(errorMessage);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Callback to refresh invitations and members after modal closes
  const handleInviteModalClose = () => {
    onShowInviteModal();
    // Refresh pending invitations to show the newly created one
    fetchPendingInvitations();
    // Also refresh members in case someone just accepted an invitation
    fetchSpaceMembers();
  };

  const handleCancelInvitationWithConfirm = async (invitationId: string) => {
    if (!confirm('Are you sure you want to cancel this invitation?')) return;
    await handleCancelInvitation(invitationId);
  };

  return (
    <>
      <div className="space-y-6 sm:space-y-8">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-purple-900/40 flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">Profile & Spaces</h2>
            <p className="text-sm sm:text-base text-gray-400">Update your personal information and manage your spaces</p>
          </div>
        </div>

        {/* Avatar Upload */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0">
            {profileImage ? (
              <Image
                src={profileImage}
                alt="Profile"
                fill
                sizes="(max-width: 640px) 80px, 96px"
                className="rounded-full object-cover shadow-xl"
                unoptimized
              />
            ) : (
              <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-2xl sm:text-3xl font-bold shadow-xl">
                {profileData.name.charAt(0).toUpperCase()}
              </div>
            )}
            <button
              onClick={() => profileImageInputRef.current?.click()}
              className="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white hover:bg-purple-700 transition-colors shadow-md"
              aria-label="Change profile picture"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <div className="text-center sm:text-left">
            <h3 className="text-base sm:text-lg font-semibold text-white">{profileData.name}</h3>
            <p className="text-xs sm:text-sm text-gray-400">{profileData.email}</p>
            <button
              onClick={() => profileImageInputRef.current?.click()}
              className="btn-touch mt-2 text-xs sm:text-sm text-purple-400 hover:underline transition-all active:scale-95 hover:text-purple-300"
            >
              Change profile picture
            </button>
            <p className="text-xs text-gray-400 mt-1">
              Max 2MB • JPG, PNG, WebP • 100-2000px
            </p>
          </div>
        </div>

        {/* Hidden File Input */}
        <input
          ref={profileImageInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          onChange={handleProfileImageChange}
          className="hidden"
        />

        {/* Form Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          <div>
            <label htmlFor="field-1" className="block text-xs sm:text-sm font-medium text-gray-300 mb-2 cursor-pointer">
              Full Name
            </label>
            <input
              type="text"
              value={profileData.name}
              id="field-1"
              onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base bg-gray-900 border border-gray-600 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white transition-all"
            />
          </div>

          <div>
            <label htmlFor="field-2" className="block text-xs sm:text-sm font-medium text-gray-300 mb-2 cursor-pointer">
              Email Address
            </label>
            <input
              type="email"
              inputMode="email"
              value={profileData.email}
              id="field-2"
              onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
              className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base bg-gray-900 border border-gray-600 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white transition-all"
            />
          </div>
        </div>

        {/* Spaces Management Section */}
        <div className="border-t border-gray-700 pt-6 sm:pt-8">
          <h3 className="text-lg sm:text-xl font-bold text-white mb-4">Your Spaces</h3>

          {/* Switch Space - Only show when user has multiple spaces */}
          {spaces && spaces.length > 1 && (
            <div className="mb-6">
              <h4 className="text-base font-semibold text-white mb-3">Switch Space</h4>
              <div className="space-y-3">
                {spaces.map((space) => (
                  <div
                    key={space.id}
                    className={`btn-touch p-4 rounded-xl border transition-all cursor-pointer active:scale-95 ${
                      currentSpace?.id === space.id
                        ? 'bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-800 shadow-lg hover:shadow-xl'
                        : 'bg-gray-900/50 border-gray-700 hover:border-purple-800 hover:shadow-md hover:scale-105'
                    }`}
                    onClick={() => switchSpace(space)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold">
                          {space.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{space.name}</p>
                          <p className="text-xs text-gray-400">
                            {space.role === 'owner' ? 'Owner' : 'Member'}
                            {currentSpace?.id === space.id && ' • Active'}
                          </p>
                        </div>
                      </div>
                      {currentSpace?.id === space.id && (
                        <Check className="w-5 h-5 text-purple-400" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Current Space Actions */}
          {currentSpace && (
            <div className="mb-6 p-4 bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-800 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-semibold">
                    {currentSpace.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-white">
                      {!isRenamingSpace ? currentSpace.name : 'Renaming...'}
                    </h4>
                    <p className="text-xs text-gray-400">
                      Current Space
                    </p>
                  </div>
                </div>
                {!isRenamingSpace && (
                  <Edit
                    className="w-5 h-5 text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
                    onClick={() => {
                      setIsRenamingSpace(true);
                      setNewSpaceNameEdit(currentSpace.name);
                    }}
                  />
                )}
              </div>

              {isRenamingSpace ? (
                <div className="space-y-3">
                  <div>
                    <input
                      type="text"
                      value={newSpaceNameEdit}
                      onChange={(e) => setNewSpaceNameEdit(e.target.value)}
                      placeholder="Enter new space name"
                      className="w-full px-3 py-2 text-sm bg-gray-800 border border-purple-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white"
                      autoFocus
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleRenameSpace}
                      disabled={isSavingSpaceName || !newSpaceNameEdit.trim()}
                      className="px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSavingSpaceName ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-3 h-3" />
                          Save
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setIsRenamingSpace(false);
                        setNewSpaceNameEdit('');
                      }}
                      disabled={isSavingSpaceName}
                      className="px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors text-sm disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 flex-wrap">
                  {/* Only owners and admins can invite members */}
                  {(currentSpace?.role === 'owner' || currentSpace?.role === 'admin') && (
                    <button
                      onClick={handleInviteModalClose}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm flex items-center gap-2 hover:shadow-lg"
                    >
                      <UserPlus className="w-4 h-4" />
                      Invite Members
                    </button>
                  )}
                  {/* Owners and admins can delete spaces */}
                  {(currentSpace?.role === 'owner' || currentSpace?.role === 'admin') && (
                    <button
                      onClick={onShowDeleteSpaceModal}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm flex items-center gap-2 hover:shadow-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Space
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Pending Invitations - Only visible to owners and admins */}
          {spaceId && (currentSpace?.role === 'owner' || currentSpace?.role === 'admin') && (
            <div className="mb-6 p-4 bg-gray-900/50 border border-gray-700 rounded-xl">
              <h4 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
                <Mail className="w-4 h-4 text-purple-600" />
                Pending Invitations
                {pendingInvitations.length > 0 && (
                  <span className="px-2 py-0.5 bg-purple-900/30 text-purple-400 text-xs rounded-full">
                    {pendingInvitations.length}
                  </span>
                )}
              </h4>

              {isLoadingInvitations ? (
                <div className="flex items-center gap-2 text-gray-400 py-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Loading invitations...</span>
                </div>
              ) : pendingInvitations.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">
                  No pending invitations. Use the button above to invite members.
                </p>
              ) : (
                <div className="space-y-3 mt-3">
                  {pendingInvitations.map((invitation) => {
                    const expiresAt = new Date(invitation.expires_at);
                    const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

                    return (
                      <div
                        key={invitation.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-gray-800 border border-gray-700 rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">
                            {invitation.email}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs px-2 py-0.5 bg-gray-700 text-gray-400 rounded">
                              {invitation.role}
                            </span>
                            <span className="text-xs text-gray-400">
                              Expires in {daysLeft} {daysLeft === 1 ? 'day' : 'days'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Copy URL Button */}
                          <button
                            onClick={() => handleCopyInvitationUrl(invitation.id, invitation.invitation_url)}
                            className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-900/20 rounded-lg transition-colors"
                            title="Copy invitation link"
                          >
                            {copiedInvitationId === invitation.id ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>

                          {/* Resend Button */}
                          <button
                            onClick={() => handleResendInvitation(invitation.id)}
                            disabled={resendingInvitationId === invitation.id}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-900/20 rounded-lg transition-colors disabled:opacity-50"
                            title="Resend invitation"
                          >
                            {resendingInvitationId === invitation.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Mail className="w-4 h-4" />
                            )}
                          </button>

                          {/* Cancel Button */}
                          <button
                            onClick={() => handleCancelInvitationWithConfirm(invitation.id)}
                            disabled={cancellingInvitationId === invitation.id}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
                            title="Cancel invitation"
                          >
                            {cancellingInvitationId === invitation.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <X className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Space Members */}
          {spaceId && (currentSpace?.role === 'owner' || spaceMembers.some(m => m.isCurrentUser && m.role === 'Admin')) && (
            <div className="mb-6 p-4 bg-gray-900/50 border border-gray-700 rounded-xl">
              <h4 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                Space Members
                {spaceMembers.length > 0 && (
                  <span className="px-2 py-0.5 bg-purple-900/30 text-purple-400 text-xs rounded-full">
                    {spaceMembers.length}
                  </span>
                )}
              </h4>

              {isLoadingMembers ? (
                <div className="flex items-center gap-2 text-gray-400 py-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Loading members...</span>
                </div>
              ) : spaceMembers.length === 0 ? (
                <p className="text-sm text-gray-400 py-2">
                  No members yet. Invite someone to join your space!
                </p>
              ) : (
                <div className="space-y-3 mt-3">
                  {spaceMembers.map((member) => (
                    <div
                      key={member.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg border transition-all ${
                        member.isCurrentUser
                          ? 'bg-purple-900/20 border-purple-800'
                          : 'bg-gray-800 border-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 ${
                          member.color_theme === 'blue' ? 'bg-gradient-to-br from-blue-500 to-blue-600' :
                          member.color_theme === 'green' ? 'bg-gradient-to-br from-green-500 to-green-600' :
                          member.color_theme === 'pink' ? 'bg-gradient-to-br from-pink-500 to-pink-600' :
                          member.color_theme === 'orange' ? 'bg-gradient-to-br from-orange-500 to-orange-600' :
                          member.color_theme === 'teal' ? 'bg-gradient-to-br from-teal-500 to-teal-600' :
                          'bg-gradient-to-br from-purple-500 to-purple-600'
                        }`}>
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate flex items-center gap-2">
                            {member.name}
                            {member.isCurrentUser && (
                              <span className="text-xs px-1.5 py-0.5 bg-purple-900/30 text-purple-400 rounded">
                                You
                              </span>
                            )}
                            {member.role === 'Admin' && (
                              <Crown className="w-3.5 h-3.5 text-amber-500" />
                            )}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            {member.email}
                          </p>
                        </div>
                      </div>

                      {/* Role and Actions */}
                      <div className="flex items-center gap-2">
                        {/* Role selector - only for non-owners and not current user */}
                        {!member.isCurrentUser && member.role !== 'Admin' && currentSpace?.role === 'owner' && (
                          <>
                            <select
                              value={member.role}
                              onChange={(e) => handleUpdateMemberRole(member.id, e.target.value as UserRole)}
                              disabled={isUpdatingRole === member.id}
                              className="text-xs px-2 py-1 bg-gray-700 border border-gray-600 rounded-lg text-gray-300 focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                            >
                              <option value="Member">Member</option>
                              <option value="Admin">Admin</option>
                            </select>
                            {isUpdatingRole === member.id && (
                              <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                            )}
                          </>
                        )}

                        {/* Static role badge for owners or when not editable */}
                        {(member.role === 'Admin' || member.isCurrentUser || currentSpace?.role !== 'owner') && (
                          <span className={`text-xs px-2 py-1 rounded ${
                            member.role === 'Admin'
                              ? 'bg-amber-900/30 text-amber-400'
                              : 'bg-gray-700 text-gray-400'
                          }`}>
                            {member.role}
                          </span>
                        )}

                        {/* Remove member button */}
                        {!member.isCurrentUser && member.role !== 'Admin' && currentSpace?.role === 'owner' && (
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Remove member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Create New Space */}
          <div className="mb-6 p-4 bg-gray-900/50 border border-gray-700 rounded-xl">
            <h4 className="text-base font-semibold text-white mb-2">Create New Space</h4>
            <p className="text-sm text-gray-400 mb-3">
              Start a new space for work or a different purpose
              {maxSpaces !== Infinity && (
                <span className="ml-2 text-xs text-gray-400">
                  ({ownedSpacesCount}/{maxSpaces} spaces used)
                </span>
              )}
            </p>
            <button
              onClick={() => {
                // Check if user has reached their space limit
                if (promptSpaceUpgrade(ownedSpacesCount)) {
                  onShowCreateSpaceModal();
                }
              }}
              className="px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-lg transition-all text-sm flex items-center gap-2 shadow-lg shadow-teal-500/25 hover:shadow-xl"
            >
              <UserPlus className="w-4 h-4" />
              New Space
            </button>
          </div>

          {/* Account Actions */}
          <div className="mb-6 p-4 bg-gray-900/50 border border-gray-700 rounded-xl">
            <h4 className="text-base font-semibold text-white mb-3">Account Actions</h4>
            <div className="space-y-2">
              <button
                onClick={onShowExportModal}
                className="w-full px-4 py-3 bg-blue-900/20 hover:bg-blue-900/30 border border-blue-800 text-blue-300 hover:text-blue-200 rounded-lg transition-all text-sm flex items-center gap-3"
              >
                <Download className="w-4 h-4" />
                <span>Export Data</span>
              </button>
              <button
                onClick={onShowDeleteAccountModal}
                className="w-full px-4 py-3 bg-red-900/20 hover:bg-red-900/30 border border-red-800 text-red-300 hover:text-red-200 rounded-lg transition-all text-sm flex items-center gap-3"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Account</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSaveProfile}
            disabled={isSavingProfile || showSaveSuccess}
            className={`w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base text-white rounded-lg sm:rounded-xl transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              showSaveSuccess ? 'bg-green-600' : 'bg-purple-600 hover:bg-purple-700'
            }`}
          >
            <AnimatePresence mode="wait">
              {isSavingProfile ? (
                <motion.span
                  key="saving"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </motion.span>
              ) : showSaveSuccess ? (
                <motion.span
                  key="success"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                  className="flex items-center gap-2"
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 15, delay: 0.1 }}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </motion.div>
                  Saved!
                </motion.span>
              ) : (
                <motion.span
                  key="default"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  Save Changes
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>

      {/* Remove Member Confirm Dialog */}
      <ConfirmDialog
        isOpen={showRemoveMemberConfirm}
        onClose={() => {
          setShowRemoveMemberConfirm(false);
          setMemberToRemove(null);
        }}
        onConfirm={confirmRemoveMember}
        title="Remove Member"
        message={`Are you sure you want to remove ${spaceMembers.find(m => m.id === memberToRemove)?.name} from this space? They will lose access to all shared content.`}
        confirmLabel="Remove"
        cancelLabel="Cancel"
        variant="danger"
      />
    </>
  );
});
