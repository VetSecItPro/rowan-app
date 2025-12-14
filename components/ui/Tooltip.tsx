'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';

interface TooltipProps {
  content: string;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

export function Tooltip({ content, children, position = 'top', delay = 0 }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState(position);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showTooltip = () => {
    if (delay > 0) {
      timeoutRef.current = setTimeout(() => setIsVisible(true), delay);
    } else {
      setIsVisible(true);
    }
  };

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };

  // Smart positioning to prevent overflow
  useEffect(() => {
    if (isVisible && tooltipRef.current && triggerRef.current) {
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
      };

      let newPosition = position;

      // Check if tooltip overflows viewport and adjust
      if (position === 'top' && tooltipRect.top < 0) {
        newPosition = 'bottom';
      } else if (position === 'bottom' && tooltipRect.bottom > viewport.height) {
        newPosition = 'top';
      } else if (position === 'left' && tooltipRect.left < 0) {
        newPosition = 'right';
      } else if (position === 'right' && tooltipRect.right > viewport.width) {
        newPosition = 'left';
      }

      if (newPosition !== tooltipPosition) {
        setTooltipPosition(newPosition);
      }
    }
  }, [isVisible, position, tooltipPosition]);

  const getTooltipStyles = () => {
    const baseStyles = 'absolute z-50 px-2 py-1 text-xs text-white bg-gray-900 dark:bg-gray-700 rounded shadow-lg whitespace-nowrap pointer-events-none';

    switch (tooltipPosition) {
      case 'top':
        return `${baseStyles} bottom-full left-1/2 -translate-x-1/2 mb-2`;
      case 'bottom':
        return `${baseStyles} top-full left-1/2 -translate-x-1/2 mt-2`;
      case 'left':
        return `${baseStyles} right-full top-1/2 -translate-y-1/2 mr-2`;
      case 'right':
        return `${baseStyles} left-full top-1/2 -translate-y-1/2 ml-2`;
      default:
        return `${baseStyles} bottom-full left-1/2 -translate-x-1/2 mb-2`;
    }
  };

  return (
    <div
      ref={triggerRef}
      className="relative inline-block"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      {isVisible && content && (
        <div
          ref={tooltipRef}
          className={getTooltipStyles()}
          role="tooltip"
        >
          {content}
          {/* Tooltip arrow */}
          <div
            className={`absolute w-2 h-2 bg-gray-900 dark:bg-gray-700 transform rotate-45 ${
              tooltipPosition === 'top' ? 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2' :
              tooltipPosition === 'bottom' ? 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2' :
              tooltipPosition === 'left' ? 'right-0 top-1/2 -translate-y-1/2 translate-x-1/2' :
              'left-0 top-1/2 -translate-y-1/2 -translate-x-1/2'
            }`}
          />
        </div>
      )}
    </div>
  );
}
