'use client';

import { useRouter } from 'next/navigation';
import { ChevronRight, LayoutDashboard } from 'lucide-react';

interface BreadcrumbProps {
  currentPage: string;
}

export function Breadcrumbs({ currentPage }: BreadcrumbProps) {
  const router = useRouter();

  return (
    <div className="mb-6">
      <button
        onClick={() => router.push('/admin/dashboard')}
        className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
      >
        <LayoutDashboard className="w-4 h-4" />
        <span>Admin Dashboard</span>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 dark:text-gray-100 font-medium">{currentPage}</span>
      </button>
    </div>
  );
}
