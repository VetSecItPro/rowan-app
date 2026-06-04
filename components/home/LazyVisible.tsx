'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

interface LazyVisibleProps {
  children: ReactNode;
  /** Reserve vertical space until the section loads, so deferral never shifts layout (CLS). */
  minHeight?: number;
  /** Preload margin - start loading this far before the section scrolls into view. */
  rootMargin?: string;
}

/**
 * Renders its children only once they're about to enter the viewport (Phase 14).
 *
 * The homepage sections are `next/dynamic({ ssr: false })`, but React mounts the
 * whole tree on load, so every chunk downloads + Framer-Motion evaluates up
 * front - that's the ~3s TBT / blocked main thread on `/`. Wrapping the
 * below-the-fold sections defers each dynamic import until the user actually
 * scrolls near it, so initial JS work drops to just the hero. `minHeight`
 * reserves space so the swap-in causes no layout shift; `rootMargin` preloads
 * early enough that there's no visible pop-in.
 */
export function LazyVisible({ children, minHeight = 240, rootMargin = '400px' }: LazyVisibleProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;
    // SSR/old browsers without IO: render immediately (no deferral, still correct).
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible, rootMargin]);

  return (
    <div ref={ref} style={visible ? undefined : { minHeight }}>
      {visible ? children : null}
    </div>
  );
}
