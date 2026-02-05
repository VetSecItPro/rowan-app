import type { Metadata } from 'next';
import { TasksFeatureContent } from './FeatureContent';

export const metadata: Metadata = {
  title: 'Task Management - Rowan | Family Household Management',
  description:
    'Create, assign, and track tasks across your household. Everyone sees what needs to be done, who is responsible, and what is complete.',
  openGraph: {
    title: 'Task Management - Rowan',
    description:
      'Create, assign, and track tasks across your household. Everyone sees what needs to be done, who is responsible, and what is complete.',
    url: 'https://rowanapp.com/features/tasks',
  },
};

export default function TasksFeaturePage() {
  return <TasksFeatureContent />;
}
