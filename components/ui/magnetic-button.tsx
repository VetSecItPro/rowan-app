'use client';

import { motion } from 'framer-motion';
import React, { useRef, useState } from 'react';

interface MagneticButtonProps {
    children: React.ReactNode;
    className?: string;
    strength?: number; // How strong the pull is (higher = moves more)
    onClick?: () => void;
}

export function MagneticButton({
    children,
    className = "",
    strength = 30,
    onClick,
}: MagneticButtonProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const { clientX, clientY } = e;
        const { height, width, left, top } = ref.current?.getBoundingClientRect() || { height: 0, width: 0, left: 0, top: 0 };

        // Calculate distance from center
        const middleX = clientX - (left + width / 2);
        const middleY = clientY - (top + height / 2);

        setPosition({ x: middleX / (strength / 2), y: middleY / (strength / 2) });
    };

    const reset = () => {
        setPosition({ x: 0, y: 0 });
    };

    const { x, y } = position;

    return (
        <motion.div
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={reset}
            onClick={onClick}
            animate={{ x, y }}
            transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
            className={`inline-block cursor-pointer ${className}`}
        >
            {children}
        </motion.div>
    );
}
