'use client';

import { ReactNode, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { Header } from './Header';
import { Breadcrumb } from './Breadcrumb';
import { Footer } from '@/components/navigation/Footer';
import { SmartBackgroundCanvas } from '@/components/ui/SmartBackgroundCanvas';

interface FeatureLayoutProps {
  children: ReactNode;
  breadcrumbItems: {
    label: string;
    href?: string;
  }[];
  backgroundVariant?: 'subtle' | 'ambient' | 'vibrant';
  enableTimeAware?: boolean;
}

export function FeatureLayout({
  children,
  breadcrumbItems,
  backgroundVariant = 'ambient',
  enableTimeAware = false
}: FeatureLayoutProps) {
  const pathname = usePathname();

  // Auto-detect feature from pathname
  const currentFeature = useMemo(() => {
    const path = pathname.split('/').filter(Boolean);
    const featureSegment = path[0]; // Get the first segment after the base

    switch (featureSegment) {
      case 'tasks':
        return 'tasks';
      case 'calendar':
        return 'calendar';
      case 'messages':
        return 'messages';
      case 'shopping':
        return 'shopping';
      case 'meals':
        return 'meals';
      case 'reminders':
        return 'reminders';
      case 'goals':
        return 'goals';
      case 'budget':
        return 'budget';
      case 'projects':
        return 'projects';
      case 'dashboard':
        return 'dashboard';
      default:
        // Try to detect from breadcrumb if pathname detection fails
        const breadcrumbFeature = breadcrumbItems[0]?.label.toLowerCase();
        if (breadcrumbFeature && ['tasks', 'calendar', 'messages', 'shopping', 'meals', 'reminders', 'goals', 'budget', 'projects'].includes(breadcrumbFeature)) {
          return breadcrumbFeature as any;
        }
        return 'dashboard';
    }
  }, [pathname, breadcrumbItems]);

  return (
    <SmartBackgroundCanvas
      variant={backgroundVariant}
      feature={currentFeature}
      timeAware={enableTimeAware}
      className="min-h-screen"
      contentClassName="min-h-screen flex flex-col"
    >
      <Header />
      <Breadcrumb items={breadcrumbItems} />
      <main className="flex-1">{children}</main>
      <Footer />
    </SmartBackgroundCanvas>
  );
}
