'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Keyboard } from 'lucide-react';

interface Shortcut {
  keys: string[];
  description: string;
}

interface ShortcutGroup {
  title: string;
  shortcuts: Shortcut[];
}

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
const modKey = isMac ? '\u2318' : 'Ctrl';

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    title: 'General',
    shortcuts: [
      { keys: ['?'], description: 'Show keyboard shortcuts' },
      { keys: [modKey, 'K'], description: 'Global search' },
      { keys: [modKey, 'N'], description: 'New item (context-aware)' },
      { keys: ['Esc'], description: 'Close dialogs' },
    ],
  },
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['1'], description: 'Tasks' },
      { keys: ['2'], description: 'Calendar' },
      { keys: ['3'], description: 'Reminders' },
      { keys: ['4'], description: 'Messages' },
      { keys: ['5'], description: 'Shopping' },
      { keys: ['6'], description: 'Meals' },
      { keys: ['7'], description: 'Budget' },
      { keys: ['8'], description: 'Goals' },
      { keys: ['9'], description: 'Dashboard' },
    ],
  },
];

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/** Renders a keyboard shortcuts help overlay with available bindings. */
export function KeyboardShortcuts() {
  const [isOpen, setIsOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  const getFocusableElements = useCallback(() => {
    if (!dialogRef.current) return [];
    return Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      .filter(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable
    ) {
      return;
    }

    if (e.key === '?' && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    }

    if (e.key === 'Escape' && isOpen) {
      e.preventDefault();
      setIsOpen(false);
    }
  }, [isOpen]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement;

    requestAnimationFrame(() => {
      const elements = getFocusableElements();
      if (elements.length > 0) elements[0].focus();
    });

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const elements = getFocusableElements();
      if (elements.length === 0) return;

      const first = elements[0];
      const last = elements[elements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTab);
    return () => {
      document.removeEventListener('keydown', handleTab);
      if (previouslyFocusedRef.current) {
        requestAnimationFrame(() => previouslyFocusedRef.current?.focus());
      }
    };
  }, [isOpen, getFocusableElements]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/80"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard shortcuts"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="relative w-full max-w-xl bg-gray-800 border border-gray-700/50 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-700/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-purple-900/40 flex items-center justify-center">
                  <Keyboard className="w-5 h-5 text-purple-400" />
                </div>
                <h2 className="text-lg font-semibold text-white">Keyboard Shortcuts</h2>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-700 text-gray-400 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50"
                aria-label="Close keyboard shortcuts"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 sm:px-6 py-5 max-h-[70vh] overflow-y-auto overscroll-contain">
              <div className="space-y-6">
                {SHORTCUT_GROUPS.map((group) => (
                  <div key={group.title}>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                      {group.title}
                    </h3>
                    <div className="space-y-1">
                      {group.shortcuts.map((shortcut) => (
                        <div
                          key={shortcut.description}
                          className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-700/40 transition-colors"
                        >
                          <span className="text-sm text-gray-300">{shortcut.description}</span>
                          <div className="flex items-center gap-1 flex-shrink-0 ml-4">
                            {shortcut.keys.map((key, i) => (
                              <span key={i} className="flex items-center gap-1">
                                {i > 0 && (
                                  <span className="text-gray-400 text-xs mx-0.5">+</span>
                                )}
                                <kbd className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 text-xs font-medium text-gray-300 bg-gray-900 border border-gray-600 rounded-md shadow-sm">
                                  {key}
                                </kbd>
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="px-5 sm:px-6 py-3 border-t border-gray-700/50 bg-gray-800/80">
              <p className="text-xs text-gray-400 text-center">
                Press <kbd className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-medium text-gray-400 bg-gray-900 border border-gray-600 rounded">?</kbd> to toggle this panel
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
