'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Home, Plus, UserPlus, Check } from 'lucide-react';
import type { Space } from '@/lib/types';

interface SpaceSelectorProps {
  spaces: (Space & { role: string })[];
  currentSpace: (Space & { role: string }) | null;
  onSpaceChange: (space: Space & { role: string }) => void;
  onCreateSpace: () => void;
  onInvitePartner: () => void;
  userColorTheme?: string;
}

export function SpaceSelector({
  spaces,
  currentSpace,
  onSpaceChange,
  onCreateSpace,
  onInvitePartner,
  userColorTheme = 'emerald',
}: SpaceSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get theme color class for space name
  const getThemeColorClass = (theme: string) => {
    switch (theme) {
      case 'emerald':
        return 'bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent';
      case 'purple':
        return 'bg-gradient-to-r from-purple-500 to-pink-600 bg-clip-text text-transparent';
      case 'blue':
        return 'bg-gradient-to-r from-blue-500 to-cyan-600 bg-clip-text text-transparent';
      case 'orange':
        return 'bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent';
      case 'pink':
        return 'bg-gradient-to-r from-pink-500 to-rose-600 bg-clip-text text-transparent';
      default:
        return 'bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent';
    }
  };

  // Ensure component is mounted (for SSR)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Update dropdown position when opened
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 8, // 8px gap
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Dropdown content to be portaled
  const dropdownContent = (
    <div
      ref={dropdownRef}
      className="fixed bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-[9999]"
      style={{
        top: `${dropdownPosition.top}px`,
        left: `${dropdownPosition.left}px`,
        minWidth: '288px', // w-72 = 18rem = 288px
      }}
    >
      {/* Header */}
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Your Spaces</h3>
      </div>

      {/* Space List */}
      <div className="max-h-64 overflow-y-auto py-1">
        {spaces.length > 0 ? (
          spaces.map((space) => (
            <button
              key={space.id}
              onClick={() => {
                onSpaceChange(space);
                setIsOpen(false);
              }}
              className="flex items-center justify-between w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Home className="w-4 h-4 text-gray-400" />
                <div className="text-left">
                  <div className="font-medium">{space.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {space.role}
                  </div>
                </div>
              </div>
              {currentSpace?.id === space.id && (
                <Check className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              )}
            </button>
          ))
        ) : (
          <div className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
            No spaces yet. Create one to get started!
          </div>
        )}
      </div>

      {/* Divider */}
      <hr className="my-1 border-gray-200 dark:border-gray-700" />

      {/* Actions */}
      <div className="py-1">
        <button
          onClick={() => {
            onCreateSpace();
            setIsOpen(false);
          }}
          className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create New Space
        </button>
        {currentSpace && (
          <button
            onClick={() => {
              onInvitePartner();
              setIsOpen(false);
            }}
            className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Invite to Space
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
      >
        <Home className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        <span className={`text-sm font-bold ${currentSpace ? getThemeColorClass(userColorTheme) : 'text-gray-900 dark:text-white'}`}>
          {currentSpace ? currentSpace.name : 'No Space'}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-600 dark:text-gray-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Portal the dropdown to document.body */}
      {mounted && isOpen && createPortal(dropdownContent, document.body)}
    </>
  );
}
