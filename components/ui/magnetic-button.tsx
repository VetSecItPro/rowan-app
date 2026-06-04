'use client';

import { motion, useMotionValue, useSpring } from 'framer-motion';
import React, { useRef } from 'react';

interface MagneticButtonProps {
    children: React.ReactNode;
    className?: string;
    strength?: number;
    onClick?: () => void;
    testId?: string;
}

/** Renders a button with magnetic cursor-following hover animation. */
export function MagneticButton({
    children,
    className = "",
    strength = 30,
    onClick,
    testId,
}: MagneticButtonProps) {
    const ref = useRef<HTMLDivElement>(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const springX = useSpring(x, { stiffness: 150, damping: 15, mass: 0.1 });
    const springY = useSpring(y, { stiffness: 150, damping: 15, mass: 0.1 });

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const { clientX, clientY } = e;
        const { height, width, left, top } = ref.current?.getBoundingClientRect() || { height: 0, width: 0, left: 0, top: 0 };

        const middleX = clientX - (left + width / 2);
        const middleY = clientY - (top + height / 2);

        x.set(middleX / (strength / 2));
        y.set(middleY / (strength / 2));
    };

    const reset = () => {
        x.set(0);
        y.set(0);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.();
        }
    };

    // a11y (nested-interactive): only become a real button when THIS component
    // is the control (an onClick was passed). When it merely wraps an inner
    // interactive (a <Link>/<button> child, e.g. the final CTA), stay a purely
    // presentational motion wrapper - otherwise role="button" nests an <a>
    // inside a button, which axe flags and screen readers mis-announce. The
    // inner control then carries its own semantics + focus ring.
    const isControl = typeof onClick === 'function';

    return (
        <motion.div
            ref={ref}
            role={isControl ? 'button' : undefined}
            tabIndex={isControl ? 0 : undefined}
            data-testid={testId}
            onMouseMove={handleMouseMove}
            onMouseLeave={reset}
            onClick={onClick}
            onKeyDown={isControl ? handleKeyDown : undefined}
            style={{ x: springX, y: springY }}
            className={`inline-block cursor-pointer rounded-full ${isControl ? 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900' : ''} ${className}`}
        >
            {children}
        </motion.div>
    );
}
