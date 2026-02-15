'use client';

import React, { forwardRef, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export interface EnhancedButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button variant determines visual style and animation level */
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'destructive' | 'success';

  /** Size affects padding, font size, and animation intensity */
  size?: 'sm' | 'md' | 'lg' | 'xl';

  /** Animation level - controls sophistication of effects */
  animationLevel?: 'basic' | 'enhanced' | 'dynamic' | 'premium';

  /** Feature context for color theming - auto-detected if not provided */
  feature?: 'tasks' | 'calendar' | 'messages' | 'shopping' | 'meals' | 'reminders' | 'goals' | 'budget' | 'projects' | 'dashboard';

  /** Enable breathing animation for important CTAs */
  breathing?: boolean;

  /** Enable magnetic attraction effect */
  magnetic?: boolean;

  /** Enable ripple effect on click */
  ripple?: boolean;

  /** Enable gradient shift on hover */
  gradientShift?: boolean;

  /** Loading state */
  loading?: boolean;

  /** Success state (triggers celebration) */
  success?: boolean;

  /** Icon to display alongside text */
  icon?: React.ReactNode;

  /** Icon position */
  iconPosition?: 'left' | 'right';

  /** Custom className */
  className?: string;

  /** Children */
  children?: React.ReactNode;
}

// Auto-detect feature from pathname
function useFeatureDetection(): EnhancedButtonProps['feature'] {
  const pathname = usePathname();

  return React.useMemo(() => {
    if (!pathname) return 'dashboard';
    const segments = pathname.split('/').filter(Boolean);
    const feature = segments[0];

    switch (feature) {
      case 'tasks': return 'tasks';
      case 'calendar': return 'calendar';
      case 'messages': return 'messages';
      case 'shopping': return 'shopping';
      case 'meals': return 'meals';
      case 'reminders': return 'reminders';
      case 'goals': return 'goals';
      case 'budget': return 'budget';
      case 'projects': return 'projects';
      case 'dashboard': return 'dashboard';
      default: return 'dashboard';
    }
  }, [pathname]);
}

// Hook for magnetic attraction effect
function useMagneticAttraction(enabled: boolean, ref: React.RefObject<HTMLButtonElement | null>) {
  const [isHovering, setIsHovering] = useState(false);
  const isHoveringRef = useRef(false);

  // Sync isHovering state to ref
  useEffect(() => {
    isHoveringRef.current = isHovering;
  }, [isHovering]);

  const handleMouseEnter = () => {
    setIsHovering(true);
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
    if (ref.current) {
      ref.current.style.transform = '';
    }
  };

  useEffect(() => {
    if (!enabled) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!enabled || !ref.current || !isHoveringRef.current) return;

      const rect = ref.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const deltaX = (e.clientX - centerX) * 0.1;
      const deltaY = (e.clientY - centerY) * 0.1;

      ref.current.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [enabled, ref]);

  return { handleMouseEnter, handleMouseLeave };
}

/** Renders a feature-rich button with animations, loading states, and haptic feedback. */
export const EnhancedButton = forwardRef<HTMLButtonElement, EnhancedButtonProps>(
  ({
    variant = 'primary',
    size = 'md',
    animationLevel = 'enhanced',
    feature,
    breathing = false,
    magnetic = false,
    ripple = true,
    gradientShift = false,
    loading = false,
    success = false,
    icon,
    iconPosition = 'left',
    className,
    children,
    onClick,
    disabled,
    ...props
  }, ref) => {
    const buttonRef = useRef<HTMLButtonElement>(null);
    const detectedFeature = useFeatureDetection();
    const currentFeature = feature || detectedFeature;

    const isSuccess = Boolean(success);
    const [, setRippleKey] = useState(0);

    // Combine refs
    React.useImperativeHandle(ref, () => buttonRef.current!);

    // Magnetic attraction
    const { handleMouseEnter, handleMouseLeave } = useMagneticAttraction(
      magnetic && animationLevel === 'premium',
      buttonRef
    );

    // Handle click with ripple effect
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || loading) return;

      if (ripple && animationLevel !== 'basic') {
        setRippleKey(prev => prev + 1);
      }

      onClick?.(e);
    };

    // Build className based on props
    const buttonClasses = cn(
      // Base styles
      'relative inline-flex items-center justify-center font-medium rounded-full transition-all duration-300',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',

      // Size variants
      {
        'px-3 py-1.5 text-sm': size === 'sm',
        'px-4 py-2 text-sm': size === 'md',
        'px-6 py-3 text-base': size === 'lg',
        'px-8 py-4 text-lg': size === 'xl',
      },

      // Variant styles
      {
        // Primary variant
        'bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl focus-visible:ring-blue-500':
          variant === 'primary' && currentFeature === 'tasks',
        'bg-purple-600 hover:bg-purple-700 text-white shadow-lg hover:shadow-xl focus-visible:ring-purple-500':
          variant === 'primary' && currentFeature === 'calendar',
        'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg hover:shadow-xl focus-visible:ring-emerald-500':
          variant === 'primary' && (currentFeature === 'messages' || currentFeature === 'shopping'),
        'bg-orange-600 hover:bg-orange-700 text-white shadow-lg hover:shadow-xl focus-visible:ring-orange-500':
          variant === 'primary' && currentFeature === 'meals',
        'bg-pink-600 hover:bg-pink-700 text-white shadow-lg hover:shadow-xl focus-visible:ring-pink-500':
          variant === 'primary' && currentFeature === 'reminders',
        'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg hover:shadow-xl focus-visible:ring-indigo-500':
          variant === 'primary' && currentFeature === 'goals',
        'bg-amber-600 hover:bg-amber-700 text-white shadow-lg hover:shadow-xl focus-visible:ring-amber-500':
          variant === 'primary' && (currentFeature === 'budget' || currentFeature === 'projects'),
        'bg-gray-600 hover:bg-gray-700 text-white shadow-lg hover:shadow-xl focus-visible:ring-gray-500':
          variant === 'primary' && currentFeature === 'dashboard',

        // Secondary variant
        'bg-gray-800 border text-gray-100 border-gray-600':
          variant === 'secondary',

        // Ghost variant
        'hover:bg-gray-800 text-gray-300':
          variant === 'ghost',

        // Outline variant
        'border-2 bg-transparent hover:bg-gray-900':
          variant === 'outline',

        // Destructive variant
        'bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl focus-visible:ring-red-500':
          variant === 'destructive',

        // Success variant
        'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl focus-visible:ring-green-500':
          variant === 'success',
      },

      // Animation classes based on level
      {
        'btn-enhanced': animationLevel !== 'basic',
        'btn-breathing': breathing && animationLevel !== 'basic',
        'btn-magnetic': magnetic && animationLevel === 'premium',
        'btn-ripple': ripple && animationLevel !== 'basic',
        'btn-celebration': isSuccess,
        'btn-success-burst': isSuccess,
        'btn-loading': loading,
      },

      // Feature-specific classes
      {
        [`btn-feature-${currentFeature}`]: animationLevel !== 'basic',
        [`btn-gradient-shift-${currentFeature}`]: gradientShift && animationLevel === 'premium',
      },

      className
    );

    return (
      <button
        ref={buttonRef}
        className={buttonClasses}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        disabled={disabled || loading}
        {...props}
      >
        {/* Loading spinner */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Button content */}
        <div className={cn('flex items-center gap-2', loading && 'opacity-0')}>
          {icon && iconPosition === 'left' && (
            <span className="flex-shrink-0">{icon}</span>
          )}

          {children && <span>{children}</span>}

          {icon && iconPosition === 'right' && (
            <span className="flex-shrink-0">{icon}</span>
          )}
        </div>

        {/* Success checkmark overlay */}
        {isSuccess && (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-5 h-5 text-white animate-pulse" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        )}
      </button>
    );
  }
);

EnhancedButton.displayName = 'EnhancedButton';

// Convenience components for common use cases
/** Renders a pre-configured primary variant of EnhancedButton. */
export const PrimaryButton = React.forwardRef<HTMLButtonElement, Omit<EnhancedButtonProps, 'variant'>>((props, ref) => (
  <EnhancedButton ref={ref} variant="primary" {...props} />
));

/** Renders a pre-configured secondary variant of EnhancedButton. */
export const SecondaryButton = React.forwardRef<HTMLButtonElement, Omit<EnhancedButtonProps, 'variant'>>((props, ref) => (
  <EnhancedButton ref={ref} variant="secondary" {...props} />
));

/** Renders a pre-configured call-to-action variant of EnhancedButton. */
export const CTAButton = React.forwardRef<HTMLButtonElement, Omit<EnhancedButtonProps, 'variant' | 'breathing' | 'ripple'>>((props, ref) => (
  <EnhancedButton ref={ref} variant="primary" breathing ripple animationLevel="dynamic" {...props} />
));

/** Renders a pre-configured premium variant of EnhancedButton with shine effect. */
export const PremiumButton = React.forwardRef<HTMLButtonElement, Omit<EnhancedButtonProps, 'animationLevel' | 'magnetic' | 'gradientShift'>>((props, ref) => (
  <EnhancedButton ref={ref} animationLevel="premium" magnetic gradientShift {...props} />
));

PrimaryButton.displayName = 'PrimaryButton';
SecondaryButton.displayName = 'SecondaryButton';
CTAButton.displayName = 'CTAButton';
PremiumButton.displayName = 'PremiumButton';
