import {
  CheckSquare,
  Calendar,
  Bell,
  MessageCircle,
  ShoppingCart,
  UtensilsCrossed,
  Home,
  Wallet,
  Target,
  Heart,
  Wand2,
  Gift,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  gradient: string;
  description: string;
  /**
   * Phase 15.2 (focus the wedge): items outside the core household-ops loop
   * (e.g. Year in Review) are hidden from nav by default to shrink the
   * "complete-everything" surface for the launch ICP. The code/route stays;
   * set NEXT_PUBLIC_SHOW_SECONDARY_NAV=true to surface them again.
   */
  secondary?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

// Build-time flag: surface secondary-domain nav items when explicitly enabled.
const SHOW_SECONDARY_NAV = process.env.NEXT_PUBLIC_SHOW_SECONDARY_NAV === 'true';

// Grouped navigation — reduces cognitive load (Hick's law: <7 groups)
const ALL_NAVIGATION_GROUPS: NavGroup[] = [
  {
    label: 'Daily',
    items: [
      { name: 'Tasks & Chores', href: '/tasks', icon: CheckSquare, gradient: 'bg-gradient-tasks', description: 'Get things done' },
      { name: 'Calendar', href: '/calendar', icon: Calendar, gradient: 'bg-gradient-calendar', description: 'Stay synced' },
      { name: 'Reminders', href: '/reminders', icon: Bell, gradient: 'bg-gradient-reminders', description: 'Never forget' },
      { name: 'Daily Check-In', href: '/dashboard#daily-checkin', icon: Heart, gradient: 'bg-gradient-to-r from-pink-500 to-purple-500', description: 'Track your mood' },
    ],
  },
  {
    label: 'Family',
    items: [
      { name: 'Messages', href: '/messages', icon: MessageCircle, gradient: 'bg-gradient-messages', description: 'Chat instantly' },
    ],
  },
  {
    label: 'Household',
    items: [
      { name: 'Meal Planning', href: '/meals', icon: UtensilsCrossed, gradient: 'bg-gradient-meals', description: 'Plan meals' },
      { name: 'Shopping Lists', href: '/shopping', icon: ShoppingCart, gradient: 'bg-gradient-shopping', description: 'Shop together' },
      // Phase 15.2 (PR14): Budget is a CORE household domain - its own prominent
      // nav item pointing at the consolidated /budget hub. Projects (home-reno/
      // vendors) is SECONDARY and flag-gated, same as Year in Review.
      { name: 'Budget', href: '/budget', icon: Wallet, gradient: 'bg-gradient-projects', description: 'Money & spending' },
      { name: 'Projects', href: '/projects', icon: Home, gradient: 'bg-gradient-projects', description: 'Home projects', secondary: true },
    ],
  },
  {
    label: 'Growth',
    items: [
      { name: 'Goals & Milestones', href: '/goals', icon: Target, gradient: 'bg-gradient-goals', description: 'Track progress' },
      { name: 'Rewards Shop', href: '/rewards', icon: Gift, gradient: 'bg-gradient-to-r from-amber-500 to-orange-500', description: 'Redeem points' },
      { name: 'Year in Review', href: '/year-in-review', icon: Wand2, gradient: 'bg-gradient-to-r from-yellow-500 to-amber-500', description: 'Annual insights', secondary: true },
    ],
  },
];

// Visible navigation: secondary-domain items are filtered out unless the flag
// is set (Phase 15.2). Empty groups are dropped so a fully-secondary group
// doesn't render an empty header. Consumers (Sidebar, BottomNav) use this.
export const NAVIGATION_GROUPS: NavGroup[] = ALL_NAVIGATION_GROUPS
  .map((g) => ({ ...g, items: g.items.filter((i) => SHOW_SECONDARY_NAV || !i.secondary) }))
  .filter((g) => g.items.length > 0);

// Flat list for backward compatibility (BottomNav, etc.)
export const NAVIGATION_ITEMS: NavItem[] = NAVIGATION_GROUPS.flatMap(g => g.items);
