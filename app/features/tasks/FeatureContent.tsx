'use client';

import { useRouter } from 'next/navigation';
import { Users, Zap, RefreshCw } from 'lucide-react';
import { FeaturePageLayout } from '@/components/features/FeaturePageLayout';
import { RelatedFeatures } from '@/components/features/RelatedFeatures';
import { TasksDemo } from '@/components/home/feature-demos/TasksDemo';

export function TasksFeatureContent() {
  const router = useRouter();

  return (
    <>
      <FeaturePageLayout
        featureName="Task Management"
        tagline="Task Management"
        headline="Never Ask |Who's Doing What| Again"
        description="Create, assign, and track tasks across your household. Everyone sees what needs to be done, who's responsible, and what's complete."
        colorScheme={{
          primary: 'blue',
          secondary: 'cyan',
          gradient: 'from-blue-500 to-cyan-500',
        }}
        benefits={[
          {
            icon: Users,
            title: 'Shared Accountability',
            description:
              'Everyone sees the task list. No more guessing who was supposed to do what — the whole family stays aligned.',
          },
          {
            icon: Zap,
            title: 'Smart Priorities',
            description:
              'Flag urgent tasks so the important things get done first. Set priorities and due dates that keep your household running smoothly.',
          },
          {
            icon: RefreshCw,
            title: 'Real-Time Updates',
            description:
              'When someone completes a task, everyone sees it instantly. Stay in sync without constant check-ins or reminders.',
          },
        ]}
        detailBullets={[
          'Create tasks in seconds',
          'Assign to family members',
          'Set priorities and due dates',
          'Track completion in real-time',
          'Recurring tasks for routines',
        ]}
        demoComponent={<TasksDemo />}
        onSignupClick={() => router.push('/signup')}
      />
      <RelatedFeatures currentFeature="tasks" />
    </>
  );
}
