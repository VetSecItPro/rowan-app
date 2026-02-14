'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface ComparisonContextValue {
  compareEnabled: boolean;
  setCompareEnabled: (enabled: boolean) => void;
  toggleCompare: () => void;
}

const ComparisonContext = createContext<ComparisonContextValue>({
  compareEnabled: false,
  setCompareEnabled: () => {},
  toggleCompare: () => {},
});

/** Provides period comparison state and controls to admin dashboard children. */
export function ComparisonProvider({ children }: { children: ReactNode }) {
  const [compareEnabled, setCompareEnabled] = useState(false);

  const toggleCompare = useCallback(() => {
    setCompareEnabled((prev) => !prev);
  }, []);

  return (
    <ComparisonContext.Provider value={{ compareEnabled, setCompareEnabled, toggleCompare }}>
      {children}
    </ComparisonContext.Provider>
  );
}

export function useComparison() {
  return useContext(ComparisonContext);
}
