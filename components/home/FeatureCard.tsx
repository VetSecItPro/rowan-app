'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LucideIcon } from 'lucide-react';

interface FeatureCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  gradient: string;
  shadowColor: string;
  href: string;
}

export function FeatureCard({ title, description, icon: Icon, gradient, shadowColor, href }: FeatureCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <Link href={href} className="block relative group">
      <div
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`bg-transparent rounded-xl p-6 hover:-translate-y-2 hover:shadow-2xl hover:${shadowColor} transition-all duration-300 cursor-pointer`}
      >
        <div className={`w-[60px] h-[60px] rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4`}>
          <Icon className="w-7 h-7 text-white animate-bounce-subtle" />
        </div>
        <h3 className="text-gray-900 dark:text-white font-bold text-lg mb-2">{title}</h3>
        <p className="text-gray-600 dark:text-gray-400">{description}</p>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-lg whitespace-nowrap z-50 pointer-events-none">
          Click for details
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45"></div>
        </div>
      )}
    </Link>
  );
}
