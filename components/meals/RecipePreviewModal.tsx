'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Clock, Users, ChefHat, ExternalLink, Plus, Calendar } from 'lucide-react';
import { ExternalRecipe } from '@/lib/services/external-recipes-service';
import { useScrollLock } from '@/lib/hooks/useScrollLock';
import { sanitizeUrl } from '@/lib/sanitize';

interface RecipePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  recipe: ExternalRecipe | null;
  onPlanMeal: (recipe: ExternalRecipe) => void;
  onAddToLibrary: (recipe: ExternalRecipe) => void;
}

export function RecipePreviewModal({
  isOpen,
  onClose,
  recipe,
  onPlanMeal,
  onAddToLibrary
}: RecipePreviewModalProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const headerRef = useRef<HTMLDivElement>(null);

  // Swipe to dismiss state
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchCurrent, setTouchCurrent] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const dismissThreshold = 120;
  const transform = touchStart !== null && touchCurrent !== null
    ? Math.max(0, touchCurrent - touchStart)
    : 0;
  const dragProgress = Math.min(transform / dismissThreshold, 1);
  const shouldDismiss = transform > dismissThreshold;

  useScrollLock(isOpen);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!headerRef.current?.contains(e.target as Node)) return;
    const touch = e.touches[0];
    setTouchStart(touch.clientY);
    setTouchCurrent(touch.clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || touchStart === null) return;
    const touch = e.touches[0];
    if (touch.clientY >= touchStart) {
      setTouchCurrent(touch.clientY);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    if (shouldDismiss) {
      onClose();
    }
    setTouchStart(null);
    setTouchCurrent(null);
    setIsDragging(false);
  };

  if (!isVisible || !recipe) return null;

  const safeImageUrl = recipe.image_url ? sanitizeUrl(recipe.image_url) : '';
  const safeSourceUrl = recipe.source_url ? sanitizeUrl(recipe.source_url) : '';

  const getSourceBadgeColor = (source: string) => {
    switch (source) {
      case 'themealdb':
        return 'bg-blue-100 bg-blue-900/30 text-blue-300';
      case 'spoonacular':
        return 'bg-emerald-100 bg-emerald-900/30 text-emerald-300';
      case 'edamam':
        return 'bg-green-100 bg-green-900/30 text-green-300';
      case 'tasty':
        return 'bg-orange-100 bg-orange-900/30 text-orange-300';
      case 'apininjas':
        return 'bg-purple-100 bg-purple-900/30 text-purple-300';
      default:
        return 'bg-gray-800 text-gray-300';
    }
  };

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'themealdb':
        return 'TheMealDB';
      case 'spoonacular':
        return 'Spoonacular';
      case 'edamam':
        return 'Edamam';
      case 'tasty':
        return 'Tasty';
      case 'apininjas':
        return 'API Ninjas';
      default:
        return source;
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Backdrop */}
      <div
        className={`
          absolute inset-0 bg-black/70 backdrop-blur-sm
          transition-opacity duration-300
          ${isAnimating ? 'opacity-100' : 'opacity-0'}
        `}
        onClick={onClose}
      />

      {/* Modal Container */}
      <div
        className={`
          relative w-full
          bg-gray-800
          border-t border-x sm:border border-gray-700/50
          rounded-t-2xl sm:rounded-xl
          max-h-[92vh] sm:max-h-[90vh]
          overflow-hidden
          overscroll-contain
          shadow-2xl
          flex flex-col
          transition-all duration-300 ease-out
          sm:max-w-4xl
          ${isAnimating
            ? 'translate-y-0 sm:translate-y-0 sm:scale-100 opacity-100'
            : 'translate-y-full sm:translate-y-4 sm:scale-95 opacity-0'
          }
          ${isDragging ? '!transition-none' : ''}
        `}
        style={{
          transform: isDragging ? `translateY(${transform}px)` : undefined,
          opacity: isDragging ? Math.max(0.5, 1 - dragProgress * 0.5) : undefined,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Image */}
        <div ref={headerRef} className="relative cursor-grab active:cursor-grabbing sm:cursor-default">
          {/* Swipe Indicator - Mobile Only */}
          <div
            className={`
              absolute top-2 left-1/2 -translate-x-1/2 z-20
              h-1 rounded-full
              transition-all duration-200
              sm:hidden
              ${shouldDismiss ? 'bg-green-500' : isDragging ? 'bg-white' : 'bg-white/60'}
            `}
            style={{
              width: isDragging ? '48px' : '36px',
              opacity: isDragging ? 1 : 0.8,
            }}
          />

          {safeImageUrl && (
            <div className="h-48 sm:h-64 overflow-hidden bg-gray-700 rounded-t-2xl sm:rounded-t-xl">
              <img
                src={safeImageUrl}
                alt={recipe.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-12 h-12 sm:w-10 sm:h-10 flex items-center justify-center bg-black/50 hover:bg-black/70 rounded-full transition-all active:scale-95"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 sm:w-4 sm:h-4 text-white" />
          </button>

          {/* Source Badge */}
          <div className="absolute top-4 left-4">
            <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${getSourceBadgeColor(recipe.source)}`}>
              {getSourceLabel(recipe.source)}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Title and Meta */}
          <div>
            <div className="flex items-start justify-between gap-4 mb-3">
              <h2 className="text-2xl font-bold text-white">
                {recipe.name}
              </h2>
              {safeSourceUrl && (
                <a
                  href={safeSourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-400 hover:text-orange-500 transition-colors"
                  title="View original recipe"
                >
                  <ExternalLink className="w-5 h-5" />
                </a>
              )}
            </div>

            {/* Meta Info */}
            <div className="flex items-center gap-6 text-sm text-gray-400">
              {recipe.prep_time && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{recipe.prep_time}m prep</span>
                </div>
              )}
              {recipe.cook_time && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{recipe.cook_time}m cook</span>
                </div>
              )}
              {recipe.servings && (
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span>{recipe.servings} servings</span>
                </div>
              )}
              {recipe.difficulty && (
                <div className="flex items-center gap-2">
                  <ChefHat className="w-4 h-4" />
                  <span className="capitalize">{recipe.difficulty}</span>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {recipe.description && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Description
              </h3>
              <p className="text-gray-400">
                {recipe.description}
              </p>
            </div>
          )}

          {/* Ingredients */}
          {recipe.ingredients && recipe.ingredients.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                Ingredients ({recipe.ingredients.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {recipe.ingredients.map((ing, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2 bg-gray-900 rounded-lg"
                  >
                    <div className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0" />
                    <span className="text-sm text-gray-300">
                      {[ing.amount, ing.unit, ing.name].filter(Boolean).join(' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          {recipe.instructions && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                Instructions
              </h3>
              <div className="prose prose-invert max-w-none">
                <p className="text-gray-400 whitespace-pre-wrap">
                  {recipe.instructions}
                </p>
              </div>
            </div>
          )}

          {/* Tags */}
          {recipe.cuisine && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">
                Cuisine
              </h3>
              <span className="inline-block px-3 py-1 bg-orange-900/30 text-orange-300 rounded-full text-sm">
                {recipe.cuisine}
              </span>
            </div>
          )}
        </div>

        {/* Footer Actions - Mobile Optimized */}
        <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-700/50 bg-gray-800/90 backdrop-blur-md pb-safe-4 sm:pb-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={onClose}
              className="px-3 sm:px-6 py-2.5 bg-gray-700 text-white rounded-full hover:bg-gray-600 transition-colors text-sm sm:text-base font-medium"
            >
              Close
            </button>
            <button
              onClick={() => {
                onAddToLibrary(recipe);
                onClose();
              }}
              className="flex-1 sm:flex-none px-3 sm:px-6 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-full transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base font-medium"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </button>
            <button
              onClick={() => {
                onPlanMeal(recipe);
                onClose();
              }}
              className="flex-1 sm:flex-none px-3 sm:px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-full transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-sm sm:text-base font-medium"
            >
              <Calendar className="w-4 h-4" />
              <span>Plan</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
