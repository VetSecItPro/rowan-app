'use client';

// Force dynamic rendering to prevent useContext errors during static generation
export const dynamic = 'force-dynamic';

import nextDynamic from 'next/dynamic';
import { MessageCircle, Search, Mail, Clock, MessageSquare, Smile, Paperclip, TrendingUp, X, Users } from 'lucide-react';
import { EmptyState } from '@/components/shared/EmptyState';
import { CollapsibleStatsGrid } from '@/components/ui/CollapsibleStatsGrid';
import { FeatureLayout } from '@/components/layout/FeatureLayout';
import PageErrorBoundary from '@/components/shared/PageErrorBoundary';
import { MessageCard } from '@/components/messages/MessageCard';
import { ThreadView } from '@/components/messages/ThreadView';
import { TypingIndicator } from '@/components/messages/TypingIndicator';
import { PinnedMessages } from '@/components/messages/PinnedMessages';
import { MentionInput } from '@/components/messages/MentionInput';
import { ConversationSidebar } from '@/components/messages/ConversationSidebar';
import { MessageNotificationBell } from '@/components/messages/MessageNotificationBell';
import { SwipeableMessageCard } from '@/components/messages/SwipeableMessageCard';

// Lazy-load modals and VoiceRecorder (only rendered when opened)
const NewMessageModal = nextDynamic(() => import('@/components/messages/NewMessageModal').then(m => ({ default: m.NewMessageModal })), { ssr: false });
const DeleteMessageModal = nextDynamic(() => import('@/components/messages/DeleteMessageModal').then(m => ({ default: m.DeleteMessageModal })), { ssr: false });
const VoiceRecorder = nextDynamic(() => import('@/components/messages/VoiceRecorder').then(m => ({ default: m.VoiceRecorder })), { ssr: false });
const NewConversationModal = nextDynamic(() => import('@/components/messages/NewConversationModal').then(m => ({ default: m.NewConversationModal })), { ssr: false });
const ForwardMessageModal = nextDynamic(() => import('@/components/messages/ForwardMessageModal').then(m => ({ default: m.ForwardMessageModal })), { ssr: false });

import { useMessagesData } from '@/lib/hooks/useMessagesData';
import { useMessagesModals } from '@/lib/hooks/useMessagesModals';
import { useMessagesHandlers } from '@/lib/hooks/useMessagesHandlers';

// Family-friendly universal emojis (30 total) - organized by theme
const EMOJIS = [
  // Smiles & Emotions
  '😊', '😂', '😇', '😎', '😘', '🥰', '🤗', '❤️',
  // Gestures & Hands
  '👍', '🙏', '👏', '🤝', '💪',
  // Celebrations & Parties
  '🎉', '🎈', '🎂', '🎁', '🎊',
  // Nature & Flowers
  '🌸', '🌺', '💐', '🌈', '☀️',
  // Sparkles & Stars
  '✨', '🌟',
  // Food & Drinks
  '🍕', '☕',
  // Other
  '📅', '✅', '🏠'
];

export default function MessagesPage() {
  // =============================================
  // HOOK WIRING
  // =============================================

  const data = useMessagesData();
  const modals = useMessagesModals();
  const handlers = useMessagesHandlers({
    // From data hook
    user: data.user,
    currentSpace: data.currentSpace,
    messages: data.messages,
    setMessages: data.setMessages,
    setStats: data.setStats,
    conversations: data.conversations,
    setConversations: data.setConversations,
    conversationId: data.conversationId,
    setConversationId: data.setConversationId,
    conversationTitle: data.conversationTitle,
    messageInput: data.messageInput,
    setMessageInput: data.setMessageInput,
    isSending: data.isSending,
    setIsSending: data.setIsSending,
    pinnedMessages: data.pinnedMessages,
    setPinnedMessages: data.setPinnedMessages,
    typingTimeoutRef: data.typingTimeoutRef,
    fileInputRef: data.fileInputRef,
    scrollToBottom: data.scrollToBottom,
    loadMessages: data.loadMessages,
    // From modals hook
    editingMessage: modals.editingMessage,
    confirmDialog: modals.confirmDialog,
    forwardingMessage: modals.forwardingMessage,
    conversationTitleInput: modals.conversationTitleInput,
    closeEditModal: modals.closeEditModal,
    openDeleteConfirm: modals.openDeleteConfirm,
    closeDeleteConfirm: modals.closeDeleteConfirm,
    closeEmojiPicker: modals.closeEmojiPicker,
    setShowVoiceRecorder: modals.setShowVoiceRecorder,
    closeNewConversationModal: modals.closeNewConversationModal,
    setShowConversationSidebar: modals.setShowConversationSidebar,
    closeForwardModal: modals.closeForwardModal,
    finishEditingTitle: modals.finishEditingTitle,
    cancelEditingTitle: modals.cancelEditingTitle,
    openEditModal: modals.openEditModal,
    openThread: modals.openThread,
    openForwardModal: modals.openForwardModal,
    startEditingTitle: modals.startEditingTitle,
  });

  // =============================================
  // DESTRUCTURE FOR JSX ACCESS
  // =============================================

  const {
    currentSpace, user, loading, filteredMessages, stats,
    conversations, conversationId, conversationTitle,
    messageInput, isSending, pinnedMessages, typingUsers,
    imageInputRef, fileInputRef, messagesEndRef,
    getDateLabel, shouldShowDateSeparator, emptyStateMessage,
  } = data;

  const {
    isModalOpen, editingMessage, confirmDialog, selectedThread,
    showEmojiPicker, showVoiceRecorder, showNewConversationModal,
    showConversationSidebar, showForwardModal, forwardingMessage,
    editingConversationTitle, conversationTitleInput, showMembersPanel,
    toggleEmojiPicker, closeEmojiPicker, toggleMembersPanel,
    setShowConversationSidebar, setShowMembersPanel, setConversationTitleInput,
    openNewConversationModal, closeNewConversationModal,
  } = modals;

  const {
    handleCreateMessage, handleDeleteMessage, handleConfirmDelete,
    handleTogglePin, handleUnpinMessage, handleEditMessage, handleCloseModal,
    handleSubmitMessage, handleEmojiClick, handleMessageInputChange,
    handleFileClick, handleImageChange, handleFileChange,
    handleReply, handleForwardMessage, handleForward,
    handleSelectConversation, handleDeleteConversation,
    handleRenameConversationFromSidebar, handleCreateConversation,
    handleSendVoice, handleEditConversationTitle,
    handleSaveConversationTitle, handleCancelEdit: _handleCancelEdit, handleTitleKeyDown,
  } = handlers;

  // =============================================
  // JSX
  // =============================================

  return (
    <FeatureLayout breadcrumbItems={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Messages' }]} hideFooterOnMobile>
      <PageErrorBoundary>
        {/* Mobile: fixed height container that doesn't scroll; Desktop: normal layout */}
        <div className="md:p-8 p-2 h-[calc(100dvh-100px)] md:h-auto overflow-hidden md:overflow-visible">
        <h1 className="sr-only">Messages</h1>
        <div className="max-w-7xl mx-auto h-full md:h-auto flex flex-col md:block md:space-y-8">
          {/* Header - Hidden on mobile for more chat space */}
          <div className="hidden md:flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-messages flex items-center justify-center">
              <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-messages bg-clip-text text-transparent">
                Messages
              </h1>
              <p className="text-sm sm:text-base text-gray-400 mt-1">
                Stay connected with your partner
              </p>
            </div>
            {/* Notification Bell */}
            {user && currentSpace && (
              <MessageNotificationBell
                userId={user.id}
                spaceId={currentSpace.id}
              />
            )}
          </div>


          {/* Stats Dashboard - Collapsed on mobile, expanded on desktop */}
          <CollapsibleStatsGrid
            icon={MessageCircle}
            title="Messages Stats"
            summary={`${stats.unread} unread • ${stats.today} today`}
            iconGradient="bg-gradient-messages"
            gridClassName="stats-grid-mobile gap-3 sm:gap-6"
          >
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-2 sm:mb-4">
                <h3 className="text-xs sm:text-sm text-gray-400 font-medium">Today</h3>
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-green-500 rounded-xl flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-xl sm:text-3xl font-bold text-white">{stats.today}</p>
                {stats.today > 0 && (
                  <div className="flex items-center gap-1 text-green-400">
                    <MessageSquare className="w-3 h-3" />
                    <span className="text-xs font-medium">Active</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-2 sm:mb-4">
                <h3 className="text-xs sm:text-sm text-gray-400 font-medium">This Week</h3>
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-messages rounded-xl flex items-center justify-center">
                  <Clock className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-xl sm:text-3xl font-bold text-white">{stats.thisWeek}</p>
                {stats.thisWeek > 0 && (
                  <div className="flex items-center gap-1 text-emerald-400">
                    <TrendingUp className="w-3 h-3" />
                    <span className="text-xs font-medium">Recent</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-2 sm:mb-4">
                <h3 className="text-xs sm:text-sm text-gray-400 font-medium">Unread</h3>
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                  <Mail className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-xl sm:text-3xl font-bold text-white">{stats.unread}</p>
                {stats.unread > 0 && (
                  <div className="flex items-center gap-1 text-blue-400">
                    <Mail className="w-3 h-3" />
                    <span className="text-xs font-medium">New!</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 sm:p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-2 sm:mb-4">
                <h3 className="text-xs sm:text-sm text-gray-400 font-medium">All Time</h3>
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                </div>
              </div>
              <div className="flex items-end justify-between">
                <p className="text-xl sm:text-3xl font-bold text-white">{stats.total}</p>
                {stats.total > 0 && (
                  <div className="flex items-center gap-1 text-purple-400">
                    <MessageCircle className="w-3 h-3" />
                    <span className="text-xs font-medium">Overall</span>
                  </div>
                )}
              </div>
            </div>
          </CollapsibleStatsGrid>

          {/* Conversations and Chat Interface */}
          <div className="flex gap-4 flex-1 min-h-0 md:h-chat-container md:min-h-[500px]">
            {/* Conversation Sidebar - Desktop */}
            <div className="hidden md:block w-80 flex-shrink-0">
              <div className="sticky top-4 h-full">
                <ConversationSidebar
                  conversations={conversations}
                  activeConversationId={conversationId || undefined}
                  onSelectConversation={handleSelectConversation}
                  onNewConversation={openNewConversationModal}
                  onDeleteConversation={handleDeleteConversation}
                  onRenameConversation={handleRenameConversationFromSidebar}
                />
              </div>
            </div>

            {/* Chat Interface - WhatsApp Style */}
            <div className="flex-1 min-h-0 bg-[#0b141a] md:rounded-3xl overflow-hidden flex flex-col md:border md:border-gray-700">
            {/* Chat Header - WhatsApp Style */}
            <div className="px-3 py-2 bg-[#202c33] border-b border-gray-700">
              <div className="flex items-center gap-3">
                {/* Back/Menu Button */}
                <button
                  onClick={() => setShowConversationSidebar(true)}
                  className="md:hidden p-2 -ml-1 hover:bg-gray-700 rounded-full transition-colors"
                  aria-label="Open conversations"
                >
                  <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {/* Avatar */}
                <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>

                {/* Chat Info */}
                <div className="flex-1 min-w-0">
                  {editingConversationTitle ? (
                    <input
                      type="text"
                      value={conversationTitleInput}
                      onChange={(e) => setConversationTitleInput(e.target.value)}
                      onKeyDown={handleTitleKeyDown}
                      onBlur={handleSaveConversationTitle}
                      autoFocus
                      className="text-base font-semibold text-white bg-transparent border-b-2 border-emerald-500 outline-none w-full max-w-[200px]"
                    />
                  ) : (
                    <h2
                      className="text-base font-semibold text-white truncate cursor-pointer hover:text-emerald-400 transition-colors"
                      onClick={handleEditConversationTitle}
                    >
                      {conversationTitle}
                    </h2>
                  )}
                  <p className="text-xs text-emerald-400">online</p>
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={toggleMembersPanel}
                    className={`p-2 rounded-full transition-colors ${
                      showMembersPanel
                        ? 'bg-emerald-900/50 text-emerald-400'
                        : 'hover:bg-gray-700 text-gray-400'
                    }`}
                    title="View members"
                  >
                    <Users className="w-5 h-5" />
                  </button>
                  <button className="hidden sm:flex p-2 hover:bg-gray-700 rounded-full transition-colors">
                    <Search className="w-5 h-5 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Members Panel - Slides down */}
              {showMembersPanel && (
                <div className="px-4 py-3 bg-gray-800/95 border-b border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-300">Chat Members</h3>
                    <button
                      onClick={() => setShowMembersPanel(false)}
                      className="p-1 hover:bg-gray-700 rounded-full"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {/* Current user */}
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-900/30 rounded-full">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                        {user?.name?.charAt(0)?.toUpperCase() || 'Y'}
                      </div>
                      <span className="text-sm text-gray-300">You</span>
                    </div>
                    {/* Show other space members */}
                    {currentSpace && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-700/50 rounded-full">
                        <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white text-xs font-medium">
                          <Users className="w-3 h-3" />
                        </div>
                        <span className="text-sm text-gray-400">Space members</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Thread Navigation Bar */}
            {conversations.length > 1 && (
              <div className="md:hidden px-2 py-1.5 border-b border-gray-700 bg-[#202c33]">
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
                  {/* New Thread Button - First */}
                  <button
                    onClick={openNewConversationModal}
                    className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-500 text-white shadow-md hover:bg-emerald-600 transition-all duration-200"
                  >
                    + New
                  </button>
                  {conversations.map((conv) => (
                    <button
                      key={conv.id}
                      onClick={() => handleSelectConversation(conv.id)}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                        conv.id === conversationId
                          ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-md'
                          : 'bg-gray-700/60 text-gray-300 border border-gray-600/50'
                      }`}
                    >
                      <span className="truncate max-w-[100px] inline-block align-middle">
                        {conv.title || 'Untitled'}
                      </span>
                      {conv.unread_count > 0 && conv.id !== conversationId && (
                        <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold bg-red-500 text-white rounded-full">
                          {conv.unread_count > 9 ? '9+' : conv.unread_count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages Area - Dark WhatsApp Style */}
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 py-2 space-y-1 relative bg-[#0b141a]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
              }}
            >

              {/* Content */}
              <div className="relative z-10 space-y-1">
              {/* Pinned Messages Section */}
              {pinnedMessages.length > 0 && (
                <PinnedMessages
                  messages={pinnedMessages}
                  onUnpin={handleUnpinMessage}
                />
              )}

              {loading ? (
                <div className="space-y-2 py-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[70%] ${i % 2 === 0 ? 'bg-gray-700' : 'bg-emerald-600/60'} rounded-2xl px-3 py-2 animate-pulse`}>
                        <div className={`h-4 rounded w-24 mb-2 ${i % 2 === 0 ? 'bg-gray-600' : 'bg-emerald-400/50'}`} />
                        <div className={`h-3 rounded w-16 ${i % 2 === 0 ? 'bg-gray-600' : 'bg-emerald-400/30'}`} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredMessages.length === 0 ? (
                <EmptyState
                  feature="messages"
                  title={emptyStateMessage.primary}
                  description={emptyStateMessage.secondary}
                  className="h-full"
                />
              ) : (
                <>
                  {filteredMessages.map((message, index) => {
                    const previousMessage = index > 0 ? filteredMessages[index - 1] : null;
                    const showDateSeparator = shouldShowDateSeparator(message, previousMessage);

                    return (
                      <div key={message.id}>
                        {/* Date Separator - WhatsApp Style */}
                        {showDateSeparator && (
                          <div className="flex items-center justify-center my-3">
                            <span className="px-3 py-1 text-[11px] font-medium text-gray-300 bg-gray-700/90 rounded-lg shadow-sm">
                              {getDateLabel(new Date(message.created_at))}
                            </span>
                          </div>
                        )}

                        {/* Message Card with Swipe Gestures */}
                        <SwipeableMessageCard
                          isOwn={message.sender_id === user?.id}
                          onEdit={() => handleEditMessage(message)}
                          onDelete={() => handleDeleteMessage(message.id)}
                        >
                          <MessageCard
                            message={message}
                            onEdit={handleEditMessage}
                            onDelete={handleDeleteMessage}
                            onMarkRead={() => {}}
                            onTogglePin={handleTogglePin}
                            onForward={handleForwardMessage}
                            isOwn={message.sender_id === user?.id}
                            currentUserId={user?.id || ''}
                            onReply={handleReply}
                            showReplyButton={true}
                          />
                        </SwipeableMessageCard>
                      </div>
                    );
                  })}

                  {/* Typing Indicator */}
                  {typingUsers.length > 0 && (
                    <TypingIndicator
                      userName="Partner"
                      userColor="#34D399"
                    />
                  )}

                  {/* Scroll anchor for auto-scroll */}
                  <div ref={messagesEndRef} />
                </>
              )}

              </div> {/* Close Content div */}
            </div>

            {/* Message Input - WhatsApp Style */}
            <div className="flex-shrink-0 px-2 py-2 bg-[#202c33]">
              <div className="flex items-center gap-2">
                {/* Message Input with Emoji Inside */}
                <div className="flex-1 flex items-center bg-[#2a3942] rounded-3xl shadow-sm relative">
                  {/* Emoji Button - Inside Input */}
                  <div className="relative flex-shrink-0">
                    <button
                      type="button"
                      onClick={toggleEmojiPicker}
                      className="p-2.5 hover:bg-gray-700/50 rounded-full transition-colors ml-1"
                    >
                      <Smile className="w-5 h-5 text-gray-400" />
                    </button>
                    {/* Emoji Picker */}
                    {showEmojiPicker && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={closeEmojiPicker} aria-hidden="true" />
                        <div className="absolute bottom-full mb-2 left-0 bg-gray-800 rounded-2xl shadow-xl p-3 grid grid-cols-6 gap-1 z-20 min-w-[240px] border border-gray-700">
                          {EMOJIS.map((emoji, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleEmojiClick(emoji)}
                              className="w-9 h-9 flex items-center justify-center hover:bg-gray-700 rounded-lg text-xl transition-colors"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Text Input */}
                  {currentSpace && (
                    <MentionInput
                      value={messageInput}
                      onChange={handleMessageInputChange}
                      onSubmit={handleSubmitMessage}
                      spaceId={currentSpace.id}
                      placeholder="Message"
                      disabled={isSending}
                      showToolbar={false}
                      className="flex-1 text-[15px] bg-transparent border-0"
                    />
                  )}

                  {/* Attachment Button - Inside Input on right */}
                  <button
                    type="button"
                    onClick={handleFileClick}
                    className="p-2.5 hover:bg-gray-700/50 rounded-full transition-colors mr-1 flex-shrink-0"
                  >
                    <Paperclip className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                {/* Voice/Send Button - Pill Shaped */}
                {messageInput.trim() ? (
                  <button
                    type="button"
                    onClick={handleSubmitMessage}
                    disabled={isSending}
                    className="h-11 px-5 bg-emerald-500 hover:bg-emerald-600 rounded-full flex items-center justify-center transition-colors shadow-md flex-shrink-0"
                  >
                    {isSending ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                      </svg>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={modals.toggleVoiceRecorder}
                    className={`h-11 w-11 rounded-full flex items-center justify-center transition-colors shadow-md flex-shrink-0 ${
                      showVoiceRecorder
                        ? 'bg-red-500 hover:bg-red-600'
                        : 'bg-emerald-500 hover:bg-emerald-600'
                    }`}
                  >
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Voice Recorder */}
              {showVoiceRecorder && (
                <div className="mt-2 p-3 bg-gray-800 rounded-2xl shadow-sm">
                  <VoiceRecorder
                    onSendVoice={handleSendVoice}
                    onCancel={() => modals.setShowVoiceRecorder(false)}
                  />
                </div>
              )}

              {/* Hidden File Inputs */}
              <input
                ref={imageInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.gif,.webp"
                multiple
                onChange={handleImageChange}
                className="hidden"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            </div>
          </div>

          {/* Mobile Conversation Sidebar Drawer */}
          {showConversationSidebar && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-black/50 z-40 md:hidden"
                onClick={() => setShowConversationSidebar(false)}
                aria-hidden="true"
              />

              {/* Drawer - Narrower and more transparent */}
              <div className="fixed inset-y-0 left-0 w-72 z-50 md:hidden">
                <ConversationSidebar
                  conversations={conversations}
                  activeConversationId={conversationId || undefined}
                  onSelectConversation={handleSelectConversation}
                  onNewConversation={openNewConversationModal}
                  onDeleteConversation={handleDeleteConversation}
                  onRenameConversation={handleRenameConversationFromSidebar}
                  onClose={() => setShowConversationSidebar(false)}
                />
              </div>
            </>
          )}
        </div>
      </div>
      </PageErrorBoundary>

      {/* Edit Message Modal (only for editing) */}
      {currentSpace && editingMessage && (
        <NewMessageModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleCreateMessage}
          editMessage={editingMessage}
          spaceId={currentSpace.id}
          conversationId={conversationId}
        />
      )}

      <DeleteMessageModal
        isOpen={confirmDialog.isOpen}
        onClose={modals.closeDeleteConfirm}
        onConfirm={handleConfirmDelete}
        isOwnMessage={confirmDialog.isOwnMessage}
      />

      {/* New Conversation Modal */}
      {currentSpace && (
        <NewConversationModal
          isOpen={showNewConversationModal}
          onClose={closeNewConversationModal}
          onCreate={handleCreateConversation}
          spaceId={currentSpace.id}
        />
      )}

      {/* Forward Message Modal */}
      {forwardingMessage && (
        <ForwardMessageModal
          isOpen={showForwardModal}
          onClose={modals.closeForwardModal}
          onForward={handleForward}
          conversations={conversations}
          messagePreview={forwardingMessage.content}
        />
      )}

      {/* Thread View Modal */}
      {selectedThread && conversationId && currentSpace && user && (
        <ThreadView
          parentMessage={selectedThread}
          conversationId={conversationId}
          spaceId={currentSpace.id}
          currentUserId={user.id}
          partnerName="Partner"
          partnerColor="#34D399"
          onClose={modals.closeThread}
        />
      )}
    </FeatureLayout>
  );
}
