import React from 'react';
import { haptic, hapticStyles } from '@/lib/utils/haptic-feedback';

type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection' | 'none';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** Enable haptic feedback on press. Set to 'none' to disable. */
  hapticFeedback?: HapticType;
  /** Enhanced mobile touch interactions */
  touchOptimized?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className = '',
    variant = 'default',
    size = 'default',
    hapticFeedback = 'light',
    touchOptimized = true,
    onClick,
    ...props
  }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background';

    const variants = {
      default: 'bg-primary text-primary-foreground hover:bg-primary/90',
      destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      outline: 'border border-input hover:bg-accent hover:text-accent-foreground',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      ghost: 'hover:bg-accent hover:text-accent-foreground',
      link: 'underline-offset-4 hover:underline text-primary',
    };

    const sizes = {
      default: 'h-10 py-2 px-4',
      sm: 'h-9 px-3 rounded-md',
      lg: 'h-11 px-8 rounded-md',
      icon: 'h-10 w-10',
    };

    // Enhanced click handler with haptic feedback
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      // Trigger haptic feedback based on variant and hapticFeedback prop
      if (hapticFeedback !== 'none') {
        if (hapticFeedback === 'light' || hapticFeedback === 'selection') {
          haptic[hapticFeedback]();
        } else if (variant === 'destructive') {
          haptic.warning();
        } else {
          haptic[hapticFeedback] || haptic.light();
        }
      }

      // Call original onClick if provided
      onClick?.(e);
    };

    // Get touch interaction styles
    const touchStyles = touchOptimized ? hapticStyles.touchable : '';

    // Mobile-enhanced sizing for better touch targets
    const mobileSizes = {
      default: 'h-12 md:h-10 py-2 px-4',
      sm: 'h-10 md:h-9 px-3 rounded-md',
      lg: 'h-12 md:h-11 px-8 rounded-md',
      icon: 'h-12 w-12 md:h-10 md:w-10',
    };

    const actualSizes = touchOptimized ? mobileSizes : sizes;

    return (
      <button
        className={`${baseStyles} ${variants[variant]} ${actualSizes[size]} ${touchStyles} ${className}`}
        ref={ref}
        onClick={handleClick}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';