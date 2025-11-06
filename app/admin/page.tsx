'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Delay the auth check to avoid hydration issues
    const timer = setTimeout(() => {
      checkAuth();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/admin/dashboard/stats', {
        method: 'GET',
        cache: 'no-cache',
      });

      if (response.ok) {
        // User is authenticated, redirect to dashboard
        router.replace('/admin/dashboard');
      } else {
        // User is not authenticated, redirect to login (don't log this as error)
        router.replace('/admin/login');
      }
    } catch (error) {
      // Network or other error, redirect to login silently
      router.replace('/admin/login');
    } finally {
      setIsChecking(false);
    }
  };

  // Only show loading if we're still checking
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If we get here, auth check failed and we should be redirecting
  return null;
}