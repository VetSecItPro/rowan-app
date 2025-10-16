'use client';

import { ReactNode } from 'react';
import { Header } from './Header';
import { Breadcrumb } from './Breadcrumb';
import { Footer } from '@/components/navigation/Footer';

interface FeatureLayoutProps {
  children: ReactNode;
  breadcrumbItems: {
    label: string;
    href?: string;
  }[];
}

export function FeatureLayout({ children, breadcrumbItems }: FeatureLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col">
      <Header />
      <Breadcrumb items={breadcrumbItems} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
