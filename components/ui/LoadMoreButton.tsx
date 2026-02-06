'use client';

import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface LoadMoreButtonProps {
  remaining: number;
  onClick: () => void;
}

export function LoadMoreButton({ remaining, onClick }: LoadMoreButtonProps) {
  return (
    <motion.button
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClick}
      className="w-full py-3 mt-4 flex items-center justify-center gap-2 rounded-xl bg-gray-800/50 border border-gray-700/50 text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
    >
      <ChevronDown className="w-4 h-4" />
      Show {remaining} more
    </motion.button>
  );
}
