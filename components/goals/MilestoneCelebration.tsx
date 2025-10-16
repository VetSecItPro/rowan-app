'use client';

import { useEffect, useState } from 'react';
import { X, Sparkles, Trophy, TrendingUp, Target } from 'lucide-react';

interface MilestoneCelebrationProps {
  goalTitle: string;
  milestoneTitle: string;
  milestoneDescription: string;
  percentageReached: number;
  onClose: () => void;
  autoCloseDelay?: number;
}

export default function MilestoneCelebration({
  goalTitle,
  milestoneTitle,
  milestoneDescription,
  percentageReached,
  onClose,
  autoCloseDelay = 8000,
}: MilestoneCelebrationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    setTimeout(() => {
      setIsVisible(true);
      setIsAnimating(true);
    }, 10);

    // Auto-close after delay
    const closeTimer = setTimeout(() => {
      handleClose();
    }, autoCloseDelay);

    return () => {
      clearTimeout(closeTimer);
    };
  }, [autoCloseDelay]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, 300); // Wait for exit animation
  };

  if (!isVisible) return null;

  const getMilestoneIcon = () => {
    if (percentageReached === 100) return <Trophy className="w-12 h-12" />;
    if (percentageReached >= 75) return <Sparkles className="w-12 h-12" />;
    if (percentageReached >= 50) return <TrendingUp className="w-12 h-12" />;
    return <Target className="w-12 h-12" />;
  };

  const getMilestoneColor = () => {
    if (percentageReached === 100) return 'from-green-500 to-emerald-600';
    if (percentageReached >= 75) return 'from-purple-500 to-indigo-600';
    if (percentageReached >= 50) return 'from-blue-500 to-cyan-600';
    return 'from-indigo-500 to-purple-600';
  };

  return (
    <>
      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        @keyframes pulse-glow {
          0%,
          100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.6;
          }
        }

        .confetti-piece {
          position: fixed;
          width: 10px;
          height: 10px;
          z-index: 61;
          animation: confetti-fall 3s linear forwards;
        }

        .float-animation {
          animation: float 3s ease-in-out infinite;
        }

        .pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }
      `}</style>

      {/* Confetti */}
      {isAnimating &&
        Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="confetti-piece"
            style={{
              left: `${Math.random() * 100}%`,
              top: `-20px`,
              background: [
                '#FFD700',
                '#FF6B6B',
                '#4ECDC4',
                '#95E1D3',
                '#F38181',
                '#AA96DA',
              ][Math.floor(Math.random() * 6)],
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          />
        ))}

      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 transition-opacity duration-300 ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      >
        {/* Celebration Card */}
        <div
          onClick={(e) => e.stopPropagation()}
          className={`relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden transition-all duration-500 ${
            isAnimating ? 'scale-100 opacity-100 translate-y-0' : 'scale-75 opacity-0 translate-y-8'
          }`}
        >
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white/80 dark:bg-gray-900/80 hover:bg-white dark:hover:bg-gray-900 transition-colors"
          >
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>

          {/* Gradient Header */}
          <div
            className={`relative bg-gradient-to-br ${getMilestoneColor()} p-8 text-white overflow-hidden`}
          >
            {/* Animated Background Circles */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/20 rounded-full blur-2xl pulse-glow" />
              <div
                className="absolute -bottom-10 -left-10 w-60 h-60 bg-white/20 rounded-full blur-2xl pulse-glow"
                style={{ animationDelay: '1s' }}
              />
            </div>

            {/* Content */}
            <div className="relative z-10 text-center">
              {/* Icon */}
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full mb-4 float-animation">
                {getMilestoneIcon()}
              </div>

              {/* Text */}
              <h2 className="text-3xl font-bold mb-2">{milestoneTitle}</h2>

              <div className="flex items-center justify-center gap-2">
                <div className="h-px bg-white/30 w-8" />
                <span className="text-5xl font-bold">{percentageReached}%</span>
                <div className="h-px bg-white/30 w-8" />
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-8">
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {goalTitle}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">{milestoneDescription}</p>

              {/* Motivational Message */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-4 border border-indigo-200 dark:border-indigo-800">
                <p className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">
                  {percentageReached === 100
                    ? '🎊 Amazing! You have reached your goal! Time to celebrate!'
                    : percentageReached >= 75
                    ? '🚀 You are so close! Keep up the great work!'
                    : percentageReached >= 50
                    ? '💪 Halfway there! You are doing fantastic!'
                    : '🎯 Great start! Every step brings you closer!'}
                </p>
              </div>

              {/* Action Button */}
              <button
                onClick={handleClose}
                className={`mt-6 w-full py-3 px-6 bg-gradient-to-r ${getMilestoneColor()} text-white font-semibold rounded-xl hover:shadow-lg transition-all`}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
