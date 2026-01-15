'use client';

import { useEffect, useState } from 'react';
import type { UserBadge } from '@/lib/services/achievement-service';
import { format } from 'date-fns';
import confetti from 'canvas-confetti';

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
    if (!badge.badge) return;

    const rarity = badge.badge.rarity;

    // Define confetti patterns based on badge rarity
    switch (rarity) {
      case 'legendary':
        // Epic legendary celebration - golden rain effect
        const legendaryEnd = Date.now() + 4000;
        const legendaryColors = ['#FFD700', '#FFA500', '#FF8C00', '#FFFF00'];

        function legendaryFrame() {
          confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: legendaryColors,
            shapes: ['star'],
          });
          confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: legendaryColors,
            shapes: ['star'],
          });

          if (Date.now() < legendaryEnd) {
            requestAnimationFrame(legendaryFrame);
          }
        }
        legendaryFrame();

        // Multiple center bursts for legendary
        setTimeout(() => {
          confetti({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 },
            colors: legendaryColors,
            shapes: ['star', 'circle'],
          });
        }, 500);
        break;

      case 'epic':
        // Epic celebration with purple/pink theme
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#9370DB', '#8A2BE2', '#FF69B4', '#DA70D6'],
        });
        setTimeout(() => {
          confetti({
            particleCount: 60,
            angle: 60,
            spread: 50,
            origin: { x: 0 },
            colors: ['#9370DB', '#8A2BE2'],
          });
          confetti({
            particleCount: 60,
            angle: 120,
            spread: 50,
            origin: { x: 1 },
            colors: ['#9370DB', '#8A2BE2'],
          });
        }, 300);
        break;

      case 'rare':
        // Strong blue celebration
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#4169E1', '#1E90FF', '#87CEEB', '#6495ED'],
        });
        break;

      case 'uncommon':
        // Green celebration
        confetti({
          particleCount: 60,
          spread: 50,
          origin: { y: 0.6 },
          colors: ['#32CD32', '#90EE90', '#98FB98', '#00FF7F'],
        });
        break;

      case 'common':
      default:
        // Simple gray celebration
        confetti({
          particleCount: 40,
          spread: 40,
          origin: { y: 0.6 },
          colors: ['#808080', '#A9A9A9', '#C0C0C0', '#D3D3D3'],
        });
        break;
    }
  }

  function handleClose() {
    setIsLeaving(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, 300);
  }

  async function handleShare() {
    if (!badge.badge) return;

    const shareText = `🎉 Achievement Unlocked! 🎉\n\n${badge.badge.icon} ${badge.badge.name}\n"${badge.badge.description}"\n\n${badge.badge.rarity.charAt(0).toUpperCase() + badge.badge.rarity.slice(1)} Badge • +${badge.badge.points} points\n\nEarned on ${format(new Date(badge.earned_at), 'MMMM d, yyyy')}\n\n#RowanApp #Achievement #Goals`;

    try {
      // Try Web Share API first (mobile/modern browsers)
      if (navigator.share) {
        await navigator.share({
          title: '🎉 Achievement Unlocked!',
          text: shareText,
          url: window.location.origin,
        });
        return;
      }

      // Fallback to clipboard
      await navigator.clipboard.writeText(shareText);

      // Show success message using toast
      const { showSuccess } = await import('@/lib/utils/toast');
      showSuccess('Achievement copied to clipboard! 📋');
    } catch (error) {
      // Final fallback - create a temporary textarea
      const textArea = document.createElement('textarea');
      textArea.value = shareText;
      document.body.appendChild(textArea);
      textArea.select();

      try {
        document.execCommand('copy');
        const { showSuccess } = await import('@/lib/utils/toast');
        showSuccess('Achievement copied to clipboard! 📋');
      } catch (fallbackError) {
        const { showError } = await import('@/lib/utils/toast');
        showError('Unable to share achievement. Please try again.');
      } finally {
        document.body.removeChild(textArea);
      }
    }
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
            relative bg-gray-800 rounded-2xl shadow-2xl
            border-4 border-transparent
            bg-gradient-to-br ${rarityColors[badge.badge.rarity]}
            p-1
          `}
        >
          <div className="bg-gray-800 rounded-xl p-6">
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-300 transition-colors"
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
              <h2 className="text-2xl font-bold text-white">
                {badge.badge.name}
              </h2>

              <p className="text-gray-300">
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

                <span className="inline-flex items-center gap-1 text-amber-400 font-bold">
                  <span className="text-xl">⭐</span>
                  <span>+{badge.badge.points} points</span>
                </span>
              </div>

              {/* Earned date */}
              <p className="text-sm text-gray-400">
                Earned on {format(new Date(badge.earned_at), 'MMMM d, yyyy')}
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 bg-gray-700 text-gray-300 rounded-lg font-medium hover:bg-gray-600 transition-colors"
              >
                Close
              </button>

              <button
                onClick={handleShare}
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
