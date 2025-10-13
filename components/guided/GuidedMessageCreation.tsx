'use client';

import { useState } from 'react';
import { MessageSquare, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import StepIndicator from './StepIndicator';
import { useAuth } from '@/lib/contexts/auth-context';
import { messagesService } from '@/lib/services/messages-service';
import { markFlowComplete } from '@/lib/services/user-progress-service';

interface GuidedMessageCreationProps {
  onComplete: () => void;
  onSkip: () => void;
}

export default function GuidedMessageCreation({ onComplete, onSkip }: GuidedMessageCreationProps) {
  const { user, currentSpace } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form state
  const [content, setContent] = useState('');

  const stepTitles = ['Welcome', 'Write Message', 'Success'];

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCreateMessage = async () => {
    if (!currentSpace || !user) return;

    try {
      setLoading(true);

      // First, get or create a conversation
      const conversations = await messagesService.getConversations(currentSpace.id);
      let conversationId: string;

      if (conversations.length > 0) {
        conversationId = conversations[0].id;
      } else {
        // Create a new conversation
        const conversation = await messagesService.createConversation({
          space_id: currentSpace.id,
          participants: [user.id],
        });
        conversationId = conversation.id;
      }

      await messagesService.createMessage({
        space_id: currentSpace.id,
        conversation_id: conversationId,
        sender_id: user.id,
        content: content || 'My first message!',
      });

      // Mark this guided flow as complete
      await markFlowComplete(user.id, 'first_message_sent');

      setCurrentStep(3);
    } catch (error) {
      console.error('Error creating message:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-gray-900 dark:via-gray-800 dark:to-green-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-gray-50 dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
        <StepIndicator currentStep={currentStep} totalSteps={3} stepTitles={stepTitles} />

        {/* Step 1: Welcome */}
        {currentStep === 1 && (
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full">
              <MessageSquare className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>

            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                Send Your First Message
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Stay connected with your partner through shared messaging.
              </p>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                Share thoughts, ideas, and reminders in one place.
              </p>
            </div>

            <div className="flex gap-4 justify-center pt-4">
              <button
                onClick={onSkip}
                className="px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors min-h-[44px]"
                aria-label="Skip message creation"
              >
                Skip for now
              </button>
              <button
                onClick={handleNext}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 min-h-[44px]"
                aria-label="Start writing first message"
              >
                Get Started
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Write Message */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                What would you like to say?
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Write a message to share with your partner
              </p>
            </div>

            <div>
              <label htmlFor="message-content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Message *
              </label>
              <textarea
                id="message-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Type your message here..."
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                autoFocus
              />
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <p className="text-sm text-green-800 dark:text-green-300">
                <strong>Tip:</strong> Use messages to share quick thoughts, coordinate plans, or just say hi to your partner!
              </p>
            </div>

            <div className="flex gap-4 justify-between pt-4">
              <button
                onClick={handleBack}
                className="px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-2 min-h-[44px]"
                aria-label="Go back to previous step"
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>
              <button
                onClick={handleCreateMessage}
                disabled={!content.trim() || loading}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                aria-label={loading ? 'Sending message...' : 'Send message'}
              >
                {loading ? 'Sending...' : 'Send Message'}
                <Sparkles className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Success */}
        {currentStep === 3 && (
          <div className="text-center space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full">
              <MessageSquare className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>

            <div>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                Message Sent Successfully!
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Your first message has been delivered.
              </p>
              <p className="text-gray-500 dark:text-gray-400 mt-2">
                Your partner can now see it in the shared conversation.
              </p>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 justify-center">
                <Sparkles className="w-5 h-5 text-green-600 dark:text-green-400" />
                What you can do with messages:
              </h3>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2 text-left max-w-md mx-auto">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 dark:text-green-400 mt-0.5">•</span>
                  <span>Send text messages and attachments</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 dark:text-green-400 mt-0.5">•</span>
                  <span>Create multiple conversation threads</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 dark:text-green-400 mt-0.5">•</span>
                  <span>See read receipts and message status</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 dark:text-green-400 mt-0.5">•</span>
                  <span>Search through message history</span>
                </li>
              </ul>
            </div>

            <button
              onClick={onComplete}
              className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-xl min-h-[44px]"
              aria-label="Go to messages"
            >
              Go to Messages
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
