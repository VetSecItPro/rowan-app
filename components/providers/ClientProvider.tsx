'use client';

import { useState, useEffect } from 'react';

interface ClientProviderProps {
  children: React.ReactNode;
}

/**
 * ClientProvider - Prevents hydration mismatches by ensuring
 * children only render after client-side hydration is complete
 */
export function ClientProvider({ children }: ClientProviderProps) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // During SSR and initial hydration, render a minimal loading state
  if (!hasMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-950 via-purple-950/30 to-blue-950/20">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Once mounted, render the actual content
  return <>{children}</>;
}