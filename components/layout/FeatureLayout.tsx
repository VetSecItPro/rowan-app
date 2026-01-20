'use client';

import { ReactNode, useMemo, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Breadcrumb } from './Breadcrumb';
import { Footer } from '@/components/navigation/Footer';
import { SmartBackgroundCanvas } from '@/components/ui/SmartBackgroundCanvas';
import { useFeatureTracking, type FeatureName } from '@/lib/hooks/useFeatureTracking';

interface FeatureLayoutProps {
  children: ReactNode;
  breadcrumbItems: {
    label: string;
    href?: string;
  }[];
  backgroundVariant?: 'subtle' | 'ambient' | 'vibrant';
  enableTimeAware?: boolean;
  /** Hide footer on mobile - defaults to true for mobile-first UX */
  hideFooterOnMobile?: boolean;
}

export function FeatureLayout({
  children,
  breadcrumbItems,
  backgroundVariant = 'ambient',
  enableTimeAware = false,
  hideFooterOnMobile = true
}: FeatureLayoutProps) {
  const pathname = usePathname();
  type FeatureRoute = 'tasks' | 'calendar' | 'messages' | 'shopping' | 'meals' | 'reminders' | 'goals' | 'budget' | 'projects' | 'dashboard';
  const featureRoutes: FeatureRoute[] = ['tasks', 'calendar', 'messages', 'shopping', 'meals', 'reminders', 'goals', 'budget', 'projects', 'dashboard'];
  const isFeatureRoute = (value: string): value is FeatureRoute => featureRoutes.includes(value as FeatureRoute);

  // Auto-detect feature from pathname
  const currentFeature = useMemo(() => {
    if (!pathname) return 'dashboard';
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
        if (breadcrumbFeature && isFeatureRoute(breadcrumbFeature)) {
          return breadcrumbFeature;
        }
        return 'dashboard';
    }
  }, [pathname, breadcrumbItems]);

  // Track page views for analytics
  const { trackPageView } = useFeatureTracking();

  useEffect(() => {
    // Map feature names to valid tracking names
    const trackableFeatures: Record<string, FeatureName> = {
      tasks: 'tasks',
      calendar: 'calendar',
      messages: 'messages',
      shopping: 'shopping',
      meals: 'meals',
      reminders: 'reminders',
      goals: 'goals',
      budget: 'expenses', // Map budget to expenses
      projects: 'projects',
      dashboard: 'dashboard',
    };

    const featureName = trackableFeatures[currentFeature];
    if (featureName) {
      trackPageView(featureName);
    }
  }, [currentFeature, trackPageView]);

  return (
    <SmartBackgroundCanvas
      variant={backgroundVariant}
      feature={currentFeature}
      timeAware={enableTimeAware}
      className="min-h-screen"
      contentClassName="min-h-screen flex flex-col"
    >
      <Breadcrumb items={breadcrumbItems} />
      <main className="flex-1">{children}</main>
      {/* Hide footer on mobile for chat-style interfaces like Messages */}
      <div className={hideFooterOnMobile ? 'hidden md:block' : ''}>
        <Footer />
      </div>
    </SmartBackgroundCanvas>
  );
}
