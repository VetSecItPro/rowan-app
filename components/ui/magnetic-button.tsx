'use client';

import { motion, useMotionValue, useSpring } from 'framer-motion';
import React, { useRef } from 'react';

interface MagneticButtonProps {
    children: React.ReactNode;
    className?: string;
    strength?: number;
    onClick?: () => void;
}

export function MagneticButton({
    children,
    className = "",
    strength = 30,
    onClick,
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

    return (
        <motion.div
            ref={ref}
            role="button"
            tabIndex={0}
            onMouseMove={handleMouseMove}
            onMouseLeave={reset}
            onClick={onClick}
            onKeyDown={handleKeyDown}
            style={{ x: springX, y: springY }}
            className={`inline-block cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 rounded-full ${className}`}
        >
            {children}
        </motion.div>
    );
}
