'use client';

import { ReactNode } from 'react';

/** Provides the base client-side layout structure for authenticated pages. */
export function ClientLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
