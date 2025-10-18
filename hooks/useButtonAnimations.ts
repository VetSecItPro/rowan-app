'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

export interface ButtonAnimationOptions {
  /** Animation level controls sophistication */
  level?: 'basic' | 'enhanced' | 'dynamic' | 'premium';

  /** Feature context for color theming */
  feature?: 'tasks' | 'calendar' | 'messages' | 'shopping' | 'meals' | 'reminders' | 'goals' | 'budget' | 'projects' | 'dashboard';

  /** Enable breathing animation */
  breathing?: boolean;

  /** Enable magnetic attraction */
  magnetic?: boolean;

  /** Enable ripple effects */
  ripple?: boolean;

  /** Enable gradient shift */
  gradientShift?: boolean;

  /** Success state */
  success?: boolean;
}

// Feature detection utility
function useFeatureDetection() {
  const pathname = usePathname();

  return pathname.split('/').filter(Boolean)[0] as ButtonAnimationOptions['feature'] || 'dashboard';
}

// Magnetic attraction hook
export function useMagneticAttraction(enabled: boolean = true) {
  const elementRef = useRef<HTMLElement>(null);
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!enabled || !elementRef.current || !isHovering) return;

    const rect = elementRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Calculate magnetic pull (subtle effect)
    const deltaX = (e.clientX - centerX) * 0.08;
    const deltaY = (e.clientY - centerY) * 0.08;

    elementRef.current.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
  }, [enabled, isHovering]);

  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    if (elementRef.current) {
      elementRef.current.style.transform = '';
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove, enabled]);

  return {
    elementRef,
    magneticProps: {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
    },
  };
}

// Success animation hook
export function useSuccessAnimation(trigger: boolean) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (trigger) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 800);
      return () => clearTimeout(timer);
    }
  }, [trigger]);

  return isAnimating;
}

// Ripple effect hook
export function useRippleEffect(enabled: boolean = true) {
  const [rippleKey, setRippleKey] = useState(0);

  const triggerRipple = useCallback(() => {
    if (enabled) {
      setRippleKey(prev => prev + 1);
    }
  }, [enabled]);

  return { rippleKey, triggerRipple };
}

// Main hook for button animations
export function useButtonAnimations(options: ButtonAnimationOptions = {}) {
  const {
    level = 'enhanced',
    feature,
    breathing = false,
    magnetic = false,
    ripple = true,
    gradientShift = false,
    success = false
  } = options;

  const detectedFeature = useFeatureDetection();
  const currentFeature = feature || detectedFeature;

  // Animation hooks
  const { elementRef: magneticRef, magneticProps } = useMagneticAttraction(
    magnetic && level === 'premium'
  );

  const isSuccessAnimating = useSuccessAnimation(success);
  const { rippleKey, triggerRipple } = useRippleEffect(ripple && level !== 'basic');

  // Build animation classes
  const getAnimationClasses = useCallback(() => {
    const classes = [];

    // Base enhancement
    if (level !== 'basic') {
      classes.push('btn-enhanced');
    }

    // Feature-specific styling
    if (currentFeature) {
      classes.push(`btn-feature-${currentFeature}`);
    }

    // Breathing animation
    if (breathing && level !== 'basic') {
      classes.push('btn-breathing');
    }

    // Magnetic attraction
    if (magnetic && level === 'premium') {
      classes.push('btn-magnetic');
    }

    // Ripple effect
    if (ripple && level !== 'basic') {
      classes.push('btn-ripple');
    }

    // Gradient shift
    if (gradientShift && level === 'premium') {
      classes.push(`btn-gradient-shift-${currentFeature}`);
    }

    // Success states
    if (isSuccessAnimating) {
      classes.push('btn-celebration', 'btn-success-burst');
    }

    return classes.join(' ');
  }, [level, currentFeature, breathing, magnetic, ripple, gradientShift, isSuccessAnimating]);

  // Enhanced click handler
  const enhancedClickHandler = useCallback((originalHandler?: () => void) => {
    return () => {
      triggerRipple();
      originalHandler?.();
    };
  }, [triggerRipple]);

  return {
    // Refs
    buttonRef: magneticRef,

    // Props to spread on button
    animationProps: {
      ref: magneticRef,
      className: getAnimationClasses(),
      ...magneticProps,
    },

    // Utilities
    enhancedClickHandler,
    isSuccessAnimating,
    currentFeature,

    // Manual controls
    triggerRipple,
  };
}

// Quick retrofit hook for existing buttons
export function useQuickButtonEnhancement(
  buttonRef: React.RefObject<HTMLButtonElement>,
  options: ButtonAnimationOptions = {}
) {
  const animations = useButtonAnimations(options);

  useEffect(() => {
    if (buttonRef.current && animations.animationProps.className) {
      // Add animation classes to existing button
      const existingClasses = buttonRef.current.className;
      buttonRef.current.className = `${existingClasses} ${animations.animationProps.className}`;

      // Add event listeners for magnetic effect if enabled
      if (options.magnetic && options.level === 'premium') {
        const { onMouseEnter, onMouseLeave } = animations.animationProps;
        buttonRef.current.addEventListener('mouseenter', onMouseEnter);
        buttonRef.current.addEventListener('mouseleave', onMouseLeave);

        return () => {
          if (buttonRef.current) {
            buttonRef.current.removeEventListener('mouseenter', onMouseEnter);
            buttonRef.current.removeEventListener('mouseleave', onMouseLeave);
          }
        };
      }
    }
  }, [buttonRef, animations.animationProps, options.magnetic, options.level]);

  return animations;
}

// Utility for bulk enhancement of buttons
export function useBulkButtonEnhancement(
  selector: string = 'button',
  options: ButtonAnimationOptions = {}
) {
  const animations = useButtonAnimations(options);

  useEffect(() => {
    const buttons = document.querySelectorAll(selector);

    buttons.forEach((button) => {
      if (button instanceof HTMLButtonElement) {
        // Add animation classes
        button.classList.add(...animations.animationProps.className.split(' '));

        // Add magnetic effect if enabled
        if (options.magnetic && options.level === 'premium') {
          const { onMouseEnter, onMouseLeave } = animations.animationProps;
          button.addEventListener('mouseenter', onMouseEnter);
          button.addEventListener('mouseleave', onMouseLeave);
        }
      }
    });

    // Cleanup
    return () => {
      buttons.forEach((button) => {
        if (button instanceof HTMLButtonElement && options.magnetic && options.level === 'premium') {
          const { onMouseEnter, onMouseLeave } = animations.animationProps;
          button.removeEventListener('mouseenter', onMouseEnter);
          button.removeEventListener('mouseleave', onMouseLeave);
        }
      });
    };
  }, [selector, animations.animationProps, options.magnetic, options.level]);

  return animations;
}

// Performance-optimized version for production
export function useOptimizedButtonAnimations(options: ButtonAnimationOptions = {}) {
  const animations = useButtonAnimations(options);

  // Debounce expensive operations
  const [debouncedProps, setDebouncedProps] = useState(animations.animationProps);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedProps(animations.animationProps);
    }, 16); // ~60fps

    return () => clearTimeout(timer);
  }, [animations.animationProps]);

  return {
    ...animations,
    animationProps: debouncedProps,
  };
}