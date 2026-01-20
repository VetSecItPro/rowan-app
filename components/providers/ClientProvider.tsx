'use client';

import { useSyncExternalStore } from 'react';

interface ClientProviderProps {
  children: React.ReactNode;
}

/**
 * ClientProvider - Prevents hydration mismatches by ensuring
 * children only render after client-side hydration is complete
 */
export function ClientProvider({ children }: ClientProviderProps) {
  const hasMounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

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

let mounted = false;
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => mounted;
const getServerSnapshot = () => false;

if (typeof window !== 'undefined' && !mounted) {
  const notify = () => {
    mounted = true;
    listeners.forEach((listener) => listener());
  };
  if (typeof queueMicrotask === 'function') {
    queueMicrotask(notify);
  } else {
    Promise.resolve().then(notify);
  }
}
