'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * DEPRECATED: Beta Signup Page
 *
 * This page previously used a password-based beta access flow.
 * It has been replaced with the email-based beta invite code system.
 *
 * Users are now redirected to the landing page to request a beta code.
 */
export default function BetaSignupPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to landing page with beta request section
    router.replace('/?beta=request');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Redirecting to beta signup...</p>
        <p className="text-sm text-gray-500 mt-2">
          Request your beta invite code at our homepage
        </p>
      </div>
    </div>
  );
}
