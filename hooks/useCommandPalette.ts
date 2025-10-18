'use client';

import { useState, useCallback, useEffect } from 'react';

interface UseCommandPaletteReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export function useCommandPalette(): UseCommandPaletteReturn {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  // Listen for keyboard shortcuts globally
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open command palette with Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggle();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggle]);

  return {
    isOpen,
    open,
    close,
    toggle
  };
}

// Helper hook for triggering the command palette from components
export function useCommandPaletteTrigger() {
  const [triggerEvent, setTriggerEvent] = useState<string | null>(null);

  const trigger = useCallback((action?: string) => {
    // Dispatch a custom event that the command palette can listen to
    const event = new CustomEvent('command-palette-trigger', {
      detail: { action }
    });
    document.dispatchEvent(event);
    setTriggerEvent(action || 'open');

    // Clear the trigger after a short delay
    setTimeout(() => setTriggerEvent(null), 100);
  }, []);

  return { trigger, triggerEvent };
}