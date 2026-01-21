'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, Sparkles, Trophy, TrendingUp, Target } from 'lucide-react';
import confetti from 'canvas-confetti';

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

  // Enhanced confetti celebration functions
  const triggerConfettiCelebration = useCallback(() => {
    if (percentageReached === 100) {
      // Epic celebration for 100% completion
      const end = Date.now() + 3000;
      const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#95E1D3', '#F38181', '#AA96DA'];

      function frame() {
        confetti({
          particleCount: 2,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: colors,
        });
        confetti({
          particleCount: 2,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: colors,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      }
      frame();

      // Additional center burst
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: colors,
        });
      }, 500);
    } else if (percentageReached >= 75) {
      // Strong celebration for 75%
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#AA96DA', '#95E1D3', '#F38181'],
      });
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#AA96DA', '#95E1D3'],
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#AA96DA', '#95E1D3'],
        });
      }, 300);
    } else if (percentageReached >= 50) {
      // Medium celebration for 50%
      confetti({
        particleCount: 60,
        spread: 50,
        origin: { y: 0.6 },
        colors: ['#4ECDC4', '#95E1D3', '#FFD700'],
      });
    } else {
      // Gentle celebration for 25%
      confetti({
        particleCount: 30,
        spread: 40,
        origin: { y: 0.6 },
        colors: ['#AA96DA', '#F38181'],
        gravity: 0.8,
      });
    }
  }, [percentageReached]);

  const handleClose = useCallback(() => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, 300); // Wait for exit animation
  }, [onClose]);

  useEffect(() => {
    // Trigger entrance animation
    setTimeout(() => {
      setIsVisible(true);
      setIsAnimating(true);
      // Trigger enhanced confetti after modal appears
      setTimeout(() => {
        triggerConfettiCelebration();
      }, 300);
    }, 10);

    // Auto-close after delay
    const closeTimer = setTimeout(() => {
      handleClose();
    }, autoCloseDelay);

    return () => {
      clearTimeout(closeTimer);
    };
  }, [autoCloseDelay, handleClose, triggerConfettiCelebration]);

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

        .float-animation {
          animation: float 3s ease-in-out infinite;
        }

        .pulse-glow {
          animation: pulse-glow 2s ease-in-out infinite;
        }
      `}</style>

      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4 transition-opacity duration-300 ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      >
        {/* Celebration Card */}
        <div
          onClick={(e) => e.stopPropagation()}
          className={`relative bg-gray-800 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden transition-all duration-500 ${
            isAnimating ? 'scale-100 opacity-100 translate-y-0' : 'scale-75 opacity-0 translate-y-8'
          }`}
        >
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-gray-900/80 hover:bg-gray-900 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
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
              <h3 className="text-xl font-bold text-white mb-2">
                {goalTitle}
              </h3>
              <p className="text-gray-400 mb-6">{milestoneDescription}</p>

              {/* Motivational Message */}
              <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 rounded-xl p-4 border border-indigo-800">
                <p className="text-sm text-indigo-300 font-medium">
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
