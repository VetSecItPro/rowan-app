'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ComponentProps } from 'react';

type ThemeProviderProps = ComponentProps<typeof NextThemesProvider>;

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  // Always render NextThemesProvider to avoid hydration mismatch
  // next-themes handles SSR internally with suppressHydrationWarning
  return (
    <NextThemesProvider {...props}>
      {children}
    </NextThemesProvider>
  );
}
