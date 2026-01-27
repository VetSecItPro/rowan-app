'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Plus, List } from 'lucide-react';
import { FeedbackModal } from './FeedbackModal';
import { useAuth } from '@/lib/contexts/auth-context';

export function FeedbackButton() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Show for all logged-in users
  if (!user) {
    return null;
  }

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="px-3 py-1.5 sm:px-4 sm:py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-full transition-all active:scale-95"
          aria-label="Feedback"
          title="Feedback"
        >
          Feedback
        </button>

        {/* Dropdown Menu */}
        {showDropdown && (
          <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg border border-gray-700 py-1 z-50">
            <button
              onClick={() => {
                setShowDropdown(false);
                setIsOpen(true);
              }}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Send Feedback
            </button>
            <Link
              href="/feedback"
              onClick={() => setShowDropdown(false)}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
            >
              <List className="w-4 h-4" />
              My Feedback
            </Link>
          </div>
        )}
      </div>

      <FeedbackModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
