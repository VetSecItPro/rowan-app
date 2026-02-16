'use client';

import { createContext, useContext, ReactNode } from 'react';

/**
 * When true, the main app layout handles footer rendering.
 * FeatureLayout skips its own footer to avoid duplicates
 * and ensure the footer appears below the content + chat row.
 */
const LayoutFooterContext = createContext(false);

export const useLayoutHandlesFooter = () => useContext(LayoutFooterContext);

export function LayoutFooterProvider({ children }: { children: ReactNode }) {
  return (
    <LayoutFooterContext.Provider value={true}>
      {children}
    </LayoutFooterContext.Provider>
  );
}
