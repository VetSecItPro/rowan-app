'use client';

import { useState, useEffect, ReactNode } from 'react';

interface ClientOnlyProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * ClientOnly component ensures children only render on the client
 * This prevents hydration mismatches for components that use browser APIs
 * or have different server/client initial states
 */
export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  // During SSR and before hydration, render fallback
  if (!hasMounted) {
    return <>{fallback}</>;
  }

  // After hydration, render children
  return <>{children}</>;
}