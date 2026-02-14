'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: string;
  children: ReactNode;
  delay?: number;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

/** Renders a tooltip popup on hover with configurable position and delay. */
export function Tooltip({ content, children, delay = 300, position = 'top', className = '' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const isClient = typeof window !== 'undefined';

  const showTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        let x = 0;
        let y = 0;

        switch (position) {
          case 'top':
            x = rect.left + rect.width / 2;
            y = rect.top - 8;
            break;
          case 'bottom':
            x = rect.left + rect.width / 2;
            y = rect.bottom + 8;
            break;
          case 'left':
            x = rect.left - 8;
            y = rect.top + rect.height / 2;
            break;
          case 'right':
            x = rect.right + 8;
            y = rect.top + rect.height / 2;
            break;
        }

        setCoords({ x, y });
        setIsVisible(true);
      }
    }, delay);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return '-translate-x-1/2 -translate-y-full';
      case 'bottom':
        return '-translate-x-1/2';
      case 'left':
        return '-translate-x-full -translate-y-1/2';
      case 'right':
        return '-translate-y-1/2';
      default:
        return '-translate-x-1/2 -translate-y-full';
    }
  };

  const tooltipElement = isVisible && isClient ? (
    <div
      className={`fixed z-[70] pointer-events-none ${getPositionClasses()}`}
      style={{ left: `${coords.x}px`, top: `${coords.y}px` }}
    >
      <div
        className={`
          px-3 py-2 rounded-lg shadow-lg
          bg-gray-800 text-white text-sm
          border border-gray-600
          max-w-xs
          animate-fadeIn
          ${className}
        `}
      >
        {content}
        {/* Arrow */}
        <div
          className={`absolute w-2 h-2 bg-gray-800 border-gray-600 transform rotate-45
            ${position === 'top' ? 'bottom-[-4px] left-1/2 -translate-x-1/2 border-b border-r' : ''}
            ${position === 'bottom' ? 'top-[-4px] left-1/2 -translate-x-1/2 border-t border-l' : ''}
            ${position === 'left' ? 'right-[-4px] top-1/2 -translate-y-1/2 border-r border-b' : ''}
            ${position === 'right' ? 'left-[-4px] top-1/2 -translate-y-1/2 border-l border-t' : ''}
          `}
        />
      </div>
    </div>
  ) : null;

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        className="inline-block"
      >
        {children}
      </div>
      {isClient && createPortal(tooltipElement, document.body)}
    </>
  );
}
