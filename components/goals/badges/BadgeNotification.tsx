'use client';

import { useEffect, useState } from 'react';
import type { UserBadge } from '@/lib/services/achievement-service';
import { format } from 'date-fns';

interface BadgeNotificationProps {
  badge: UserBadge;
  onClose: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

export default function BadgeNotification({
  badge,
  onClose,
  autoClose = true,
  autoCloseDelay = 5000,
}: BadgeNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Trigger confetti animation
    triggerConfetti();

    // Entrance animation
    setTimeout(() => setIsVisible(true), 50);

    // Auto close
    if (autoClose) {
      const timer = setTimeout(() => {
        handleClose();
      }, autoCloseDelay);

      return () => clearTimeout(timer);
    }
  }, [autoClose, autoCloseDelay]);

  function triggerConfetti() {
    // Create confetti effect using emoji particles
    const colors = ['#FFD700', '#FFA500', '#FF6347', '#9370DB', '#4169E1'];
    const emojis = ['🎉', '🎊', '⭐', '✨', '🏆', '👏'];

    // Create multiple confetti bursts
    for (let i = 0; i < 50; i++) {
      setTimeout(() => {
        const particle = document.createElement('div');
        particle.className = 'confetti-particle';
        particle.textContent = emojis[Math.floor(Math.random() * emojis.length)];
        particle.style.cssText = `
          position: fixed;
          top: 50%;
          left: 50%;
          font-size: ${Math.random() * 20 + 10}px;
          pointer-events: none;
          z-index: 9999;
          animation: confetti-fall ${Math.random() * 2 + 2}s ease-out forwards;
          transform: translate(-50%, -50%) rotate(${Math.random() * 360}deg);
        `;

        document.body.appendChild(particle);

        setTimeout(() => particle.remove(), 4000);
      }, i * 30);
    }
  }

  function handleClose() {
    setIsLeaving(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, 300);
  }

  if (!badge.badge) return null;

  const rarityColors = {
    common: 'from-gray-400 to-gray-600',
    uncommon: 'from-green-400 to-green-600',
    rare: 'from-blue-400 to-blue-600',
    epic: 'from-purple-400 to-purple-600',
    legendary: 'from-amber-400 to-amber-600',
  };

  return (
    <>
      {/* Confetti animation styles */}
      <style jsx global>{`
        @keyframes confetti-fall {
          0% {
            transform: translate(-50%, -50%) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translate(
                ${Math.random() * 200 - 100}vw,
                ${Math.random() * 100 + 50}vh
              )
              rotate(${Math.random() * 720}deg);
            opacity: 0;
          }
        }
      `}</style>

      {/* Backdrop */}
      <div
        className={`
          fixed inset-0 bg-black/50 z-50 transition-opacity duration-300
          ${isVisible && !isLeaving ? 'opacity-100' : 'opacity-0'}
        `}
        onClick={handleClose}
      />

      {/* Notification Card */}
      <div
        className={`
          fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50
          w-[90vw] max-w-md
          transition-all duration-500
          ${
            isVisible && !isLeaving
              ? 'opacity-100 scale-100'
              : 'opacity-0 scale-50'
          }
        `}
      >
        <div
          className={`
            relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl
            border-4 border-transparent
            bg-gradient-to-br ${rarityColors[badge.badge.rarity]}
            p-1
          `}
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Badge achievement header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold text-sm mb-4">
                <span>🎉</span>
                <span>Achievement Unlocked!</span>
                <span>🎉</span>
              </div>
            </div>

            {/* Badge icon with glow */}
            <div className="flex justify-center mb-6">
              <div
                className={`
                  text-8xl
                  animate-bounce
                  filter drop-shadow-2xl
                `}
              >
                {badge.badge.icon}
              </div>
            </div>

            {/* Badge details */}
            <div className="text-center space-y-3 mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {badge.badge.name}
              </h2>

              <p className="text-gray-600 dark:text-gray-300">
                {badge.badge.description}
              </p>

              {/* Rarity and points */}
              <div className="flex items-center justify-center gap-4">
                <span
                  className={`
                    inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
                    bg-gradient-to-r ${rarityColors[badge.badge.rarity]} text-white
                  `}
                >
                  {badge.badge.rarity}
                </span>

                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                  <span className="text-xl">⭐</span>
                  <span>+{badge.badge.points} points</span>
                </span>
              </div>

              {/* Earned date */}
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Earned on {format(new Date(badge.earned_at), 'MMMM d, yyyy')}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>

              <button
                onClick={() => {
                  // Share functionality (could be extended)
                  handleClose();
                }}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-colors"
              >
                Share Achievement
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
