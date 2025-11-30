import {
  CheckSquare,
  Calendar,
  Bell,
  MessageCircle,
  ShoppingCart,
  UtensilsCrossed,
  Home,
  Target,
  Heart,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  gradient: string;
  description: string;
}

export const NAVIGATION_ITEMS: NavItem[] = [
  {
    name: 'Tasks & Chores',
    href: '/tasks',
    icon: CheckSquare,
    gradient: 'bg-gradient-tasks',
    description: 'Get things done',
  },
  {
    name: 'Calendar',
    href: '/calendar',
    icon: Calendar,
    gradient: 'bg-gradient-calendar',
    description: 'Stay synced',
  },
  {
    name: 'Reminders',
    href: '/reminders',
    icon: Bell,
    gradient: 'bg-gradient-reminders',
    description: 'Never forget',
  },
  {
    name: 'Messages',
    href: '/messages',
    icon: MessageCircle,
    gradient: 'bg-gradient-messages',
    description: 'Chat instantly',
  },
  {
    name: 'Shopping Lists',
    href: '/shopping',
    icon: ShoppingCart,
    gradient: 'bg-gradient-shopping',
    description: 'Shop together',
  },
  {
    name: 'Meal Planning',
    href: '/meals',
    icon: UtensilsCrossed,
    gradient: 'bg-gradient-meals',
    description: 'Plan meals',
  },
  {
    name: 'Projects & Budget',
    href: '/projects',
    icon: Home,
    gradient: 'bg-gradient-projects',
    description: 'Track & manage',
  },
  {
    name: 'Goals & Milestones',
    href: '/goals',
    icon: Target,
    gradient: 'bg-gradient-goals',
    description: 'Track progress',
  },
  {
    name: 'Daily Check-In',
    href: '/dashboard',
    icon: Heart,
    gradient: 'bg-gradient-to-r from-pink-500 to-purple-500',
    description: 'Track your mood',
  },
];
