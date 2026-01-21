'use client';

import { useSyncExternalStore, ReactNode } from 'react';

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
  const hasMounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // During SSR and before hydration, render fallback
  if (!hasMounted) {
    return <>{fallback}</>;
  }

  // After hydration, render children
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
