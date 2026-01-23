'use client';

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

export function FeatureCard({ title, description, icon: Icon, gradient, href }: FeatureCardProps) {
  return (
    <Link href={href} className="block group">
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 transition-colors duration-200 hover:border-gray-700">
        <div className={`w-[60px] h-[60px] rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-4`}>
          <Icon className="w-7 h-7 text-white" />
        </div>
        <h3 className="text-white font-bold text-lg mb-2 group-hover:text-gray-200 transition-colors">{title}</h3>
        <p className="text-gray-400 group-hover:text-gray-300 transition-colors">{description}</p>
      </div>
    </Link>
  );
}
