import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing — Rowan',
  description: 'Simple plans for households broadly. Free tier plus full-access subscriptions for tasks, calendar, meals, budgets, and goals.',
  openGraph: {
    title: 'Pricing — Rowan',
    description: 'Simple plans for households broadly. Free tier plus full-access subscriptions.',
    type: 'website',
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
