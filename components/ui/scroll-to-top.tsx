'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import { MagneticButton } from '@/components/ui/magnetic-button';

export function ScrollToTop() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const toggleVisibility = () => {
            if (window.scrollY > 300) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        };

        window.addEventListener('scroll', toggleVisibility, { passive: true });
        return () => window.removeEventListener('scroll', toggleVisibility);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.5, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.5, y: 20 }}
                    className="fixed bottom-20 md:bottom-6 right-6 z-40 print:hidden"
                >
                    <MagneticButton strength={20}>
                        <button
                            onClick={scrollToTop}
                            className="p-3 rounded-full bg-gray-800/95 shadow-lg border border-gray-700 text-white hover:bg-gray-800 transition-colors"
                            aria-label="Scroll to top"
                        >
                            <ArrowUp className="w-5 h-5" />
                        </button>
                    </MagneticButton>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
