'use client';

import { ReactNode } from 'react';
import { Header } from './Header';
import { Breadcrumb } from './Breadcrumb';

interface FeatureLayoutProps {
  children: ReactNode;
  breadcrumbItems: {
    label: string;
    href?: string;
  }[];
}

export function FeatureLayout({ children, breadcrumbItems }: FeatureLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black">
      <Header />
      <Breadcrumb items={breadcrumbItems} />
      <main>{children}</main>
    </div>
  );
}
