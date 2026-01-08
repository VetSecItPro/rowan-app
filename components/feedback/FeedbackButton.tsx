'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Plus, List } from 'lucide-react';
import { FeedbackModal } from './FeedbackModal';
import { useAuth } from '@/lib/contexts/auth-context';

// Beta period end date - Feb 15, 2026
const BETA_END_DATE = new Date('2026-02-15T23:59:59Z');

// Helper to check beta tester status (same logic as Header)
const isBetaTester = (user: {
  is_beta_tester?: boolean;
  beta_status?: string;
  beta_invite_code_id?: string;
  beta_ends_at?: string;
  created_at?: string;
} | null) => {
  if (!user) return false;

  // BETA PERIOD: All users created before Feb 15, 2026 are beta testers
  if (user.created_at) {
    const createdAt = new Date(user.created_at);
    if (createdAt < BETA_END_DATE) return true;
  }

  // Legacy checks (for backward compatibility)
  if (user.is_beta_tester && user.beta_status === 'approved') return true;
  if (user.beta_invite_code_id && user.beta_ends_at) {
    const endsAt = new Date(user.beta_ends_at);
    return endsAt > new Date();
  }
  return false;
};

export function FeedbackButton() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Show for beta mode OR for beta testers
  const isBetaMode = process.env.NEXT_PUBLIC_BETA_MODE === 'true';
  const shouldShow = isBetaMode || isBetaTester(user);

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

  if (!shouldShow) {
    return null;
  }

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="px-2.5 py-1 sm:px-4 sm:py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-[10px] sm:text-xs font-medium rounded-full transition-all active:scale-95"
          aria-label="Beta Feedback"
          title="Beta Feedback"
        >
          Beta Feedback
        </button>

        {/* Dropdown Menu */}
        {showDropdown && (
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
            <button
              onClick={() => {
                setShowDropdown(false);
                setIsOpen(true);
              }}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Send Feedback
            </button>
            <Link
              href="/feedback"
              onClick={() => setShowDropdown(false)}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
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
