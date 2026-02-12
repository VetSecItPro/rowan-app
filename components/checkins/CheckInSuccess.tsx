'use client';

import { useEffect, useState } from 'react';
import { Heart, Sparkles, CheckCircle, X } from 'lucide-react';

interface CheckInSuccessProps {
  isOpen: boolean;
  onClose: () => void;
  mood: string;
  streak: number;
}

const motivationalMessages = [
  "Check-in complete! See you tomorrow! 💫",
  "Great job staying connected! Keep it up! 🌟",
  "Your emotional awareness is growing stronger! ✨",
  "Another day, another step forward! 🎯",
  "Check in on your partner and enjoy your best life! 💝",
  "Well done! Consistency builds connection! 🌈",
  "You're building a beautiful habit! Keep going! 🚀",
  "Your future self will thank you! 💪",
];

const getMoodEmoji = (mood: string) => {
  const emojis: Record<string, string> = {
    great: '😊',
    good: '🙂',
    okay: '😐',
    meh: '😔',
    rough: '😫',
  };
  return emojis[mood] || '😊';
};

export function CheckInSuccess({ isOpen, onClose, mood, streak }: CheckInSuccessProps) {
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Pick a random motivational message
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessage(motivationalMessages[Math.floor(Math.random() * motivationalMessages.length)]);

      // Auto-close after 5 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-gradient-to-br from-gray-800 via-purple-900/30 to-pink-900/30 rounded-2xl max-w-md w-full p-8 shadow-2xl border border-pink-500/30 animate-celebration">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>

        {/* Success Icon with Animation */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-pink-400 to-purple-400 rounded-full blur-xl opacity-50 animate-pulse" />
            <div className="relative w-20 h-20 bg-gradient-to-r from-pink-500 to-purple-500 rounded-full flex items-center justify-center shadow-lg">
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
          </div>
        </div>

        {/* Mood Display */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-4 animate-celebration">{getMoodEmoji(mood)}</div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Check-In Complete!
          </h2>
          <p className="text-gray-300 text-lg">
            {message}
          </p>
        </div>

        {/* Streak Display */}
        {streak > 0 && (
          <div className="bg-gradient-to-r from-orange-900/30 to-yellow-900/30 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-500" />
              <span className="text-lg font-bold text-orange-400">
                {streak} Day Streak!
              </span>
              <Sparkles className="w-5 h-5 text-orange-500" />
            </div>
            {streak === 7 && (
              <p className="text-center text-sm text-orange-400 mt-2">
                🎉 One week milestone! Amazing!
              </p>
            )}
            {streak === 30 && (
              <p className="text-center text-sm text-orange-400 mt-2">
                🌟 One month strong! You&apos;re incredible!
              </p>
            )}
            {streak === 100 && (
              <p className="text-center text-sm text-orange-400 mt-2">
                🏆 100 days! You&apos;re a legend!
              </p>
            )}
          </div>
        )}

        {/* Tips */}
        <div className="bg-gray-700/50 rounded-lg p-4 border border-pink-500/30">
          <div className="flex items-start gap-3">
            <Heart className="w-5 h-5 text-pink-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-white mb-1">
                Pro Tip:
              </p>
              <p className="text-xs text-gray-300">
                Check your Journal view to see mood patterns and weekly insights!
              </p>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="mt-6 w-full py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
