'use client';

import { Check, X } from 'lucide-react';

/**
 * Real-time password strength indicator + checklist for the signup form.
 * Mirrors the backend Zod password rules in /api/auth/signup.
 */
export interface PasswordChecks {
  length: boolean;
  uppercase: boolean;
  lowercase: boolean;
  number: boolean;
  special: boolean;
}

/**
 * Returns a user-facing error message if the password fails any backend rule,
 * or null if it satisfies all of them. Keeps page.tsx free of validation noise.
 */
export function validatePassword(password: string): string | null {
  if (password.length < 10) return 'Password must be at least 10 characters long';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password))
    return 'Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)';
  return null;
}

export function computePasswordChecks(password: string): PasswordChecks {
  return {
    length: password.length >= 10,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };
}

const CHECKLIST: Array<{ key: keyof PasswordChecks; label: string; full?: boolean }> = [
  { key: 'length', label: '10+ characters' },
  { key: 'uppercase', label: 'Uppercase (A-Z)' },
  { key: 'lowercase', label: 'Lowercase (a-z)' },
  { key: 'number', label: 'Number (0-9)' },
  { key: 'special', label: 'Special (!@#$%^&*)', full: true },
];

function strengthBarColor(strength: number, level: number): string {
  if (strength < level) return 'bg-gray-700';
  if (strength <= 2) return 'bg-red-500';
  if (strength <= 3) return 'bg-yellow-500';
  if (strength <= 4) return 'bg-blue-500';
  return 'bg-emerald-500';
}

export function PasswordStrength({ password }: { password: string }) {
  if (password.length === 0) {
    return (
      <p className="mt-1 text-xs text-gray-400 ml-1">
        10+ characters with uppercase, lowercase, number, and special character
      </p>
    );
  }
  const checks = computePasswordChecks(password);
  const strength = Object.values(checks).filter(Boolean).length;
  return (
    <div className="mt-3 space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((level) => (
          <div
            key={level}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${strengthBarColor(strength, level)}`}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
        {CHECKLIST.map(({ key, label, full }) => {
          const ok = checks[key];
          return (
            <div
              key={key}
              className={`flex items-center gap-1.5 ${full ? 'col-span-2' : ''} ${ok ? 'text-emerald-400' : 'text-gray-400'}`}
            >
              {ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
              <span>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
