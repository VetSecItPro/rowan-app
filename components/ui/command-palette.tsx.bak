'use client';

import { useState, useEffect, useCallback } from 'react';
import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Plus,
  Calendar,
  CheckSquare,
  Bell,
  MessageCircle,
  ShoppingCart,
  UtensilsCrossed,
  Target,
  CreditCard,
  Settings,
  Home,
  User,
  FileText,
  BarChart3,
  Lightbulb,
  Clock,
  Star,
  Archive,
  Trash2,
  Filter,
  Download,
  Upload,
  Share,
  Copy,
  Edit,
  Eye,
  ArrowRight,
  Sparkles,
  Command as CommandIcon
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

// ==================== TYPES ====================

interface CommandAction {
  id: string;
  title: string;
  description?: string;
  icon: React.ComponentType<any>;
  action: () => void;
  shortcut?: string[];
  category: 'navigation' | 'create' | 'actions' | 'settings' | 'recent';
  keywords: string[];
  featured?: boolean;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ==================== COMMAND PALETTE ====================

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [pages, setPages] = useState<string[]>([]);
  const router = useRouter();
  const { currentSpace, user } = useAuth();

  // Navigation actions
  const navigationActions: CommandAction[] = [
    {
      id: 'nav-dashboard',
      title: 'Dashboard',
      description: 'Go to main dashboard',
      icon: Home,
      action: () => router.push('/dashboard'),
      shortcut: ['g', 'd'],
      category: 'navigation',
      keywords: ['home', 'main', 'overview'],
      featured: true
    },
    {
      id: 'nav-tasks',
      title: 'Tasks',
      description: 'View and manage tasks',
      icon: CheckSquare,
      action: () => router.push('/tasks'),
      shortcut: ['g', 't'],
      category: 'navigation',
      keywords: ['todo', 'tasks', 'work'],
      featured: true
    },
    {
      id: 'nav-calendar',
      title: 'Calendar',
      description: 'View calendar and events',
      icon: Calendar,
      action: () => router.push('/calendar'),
      shortcut: ['g', 'c'],
      category: 'navigation',
      keywords: ['schedule', 'events', 'dates'],
      featured: true
    },
    {
      id: 'nav-goals',
      title: 'Goals',
      description: 'Track your goals and milestones',
      icon: Target,
      action: () => router.push('/goals'),
      shortcut: ['g', 'g'],
      category: 'navigation',
      keywords: ['objectives', 'targets', 'achievements'],
      featured: true
    },
    {
      id: 'nav-budget',
      title: 'Budget',
      description: 'Manage finances and expenses',
      icon: CreditCard,
      action: () => router.push('/budget'),
      shortcut: ['g', 'b'],
      category: 'navigation',
      keywords: ['money', 'expenses', 'finance'],
      featured: true
    },
    {
      id: 'nav-messages',
      title: 'Messages',
      description: 'View conversations and chat',
      icon: MessageCircle,
      action: () => router.push('/messages'),
      shortcut: ['g', 'm'],
      category: 'navigation',
      keywords: ['chat', 'conversations', 'communication']
    },
    {
      id: 'nav-shopping',
      title: 'Shopping',
      description: 'Manage shopping lists',
      icon: ShoppingCart,
      action: () => router.push('/shopping'),
      shortcut: ['g', 's'],
      category: 'navigation',
      keywords: ['lists', 'buy', 'groceries']
    },
    {
      id: 'nav-meals',
      title: 'Meals',
      description: 'Plan meals and recipes',
      icon: UtensilsCrossed,
      action: () => router.push('/meals'),
      category: 'navigation',
      keywords: ['food', 'recipes', 'cooking', 'diet']
    },
    {
      id: 'nav-reminders',
      title: 'Reminders',
      description: 'View notifications and alerts',
      icon: Bell,
      action: () => router.push('/reminders'),
      category: 'navigation',
      keywords: ['notifications', 'alerts', 'notify']
    },
    {
      id: 'nav-year-in-review',
      title: 'Year in Review',
      description: 'View annual insights and achievements',
      icon: Sparkles,
      action: () => router.push('/year-in-review'),
      shortcut: ['g', 'y'],
      category: 'navigation',
      keywords: ['annual', 'review', 'insights', 'achievements', 'summary'],
      featured: true
    },
    {
      id: 'nav-settings',
      title: 'Settings',
      description: 'Configure app preferences',
      icon: Settings,
      action: () => router.push('/settings'),
      category: 'settings',
      keywords: ['preferences', 'config', 'options']
    }
  ];

  // Create actions
  const createActions: CommandAction[] = [
    {
      id: 'create-task',
      title: 'Create Task',
      description: 'Add a new task to your list',
      icon: Plus,
      action: () => {
        router.push('/tasks');
        // This would trigger the new task modal
      },
      shortcut: ['c', 't'],
      category: 'create',
      keywords: ['new', 'add', 'task', 'todo'],
      featured: true
    },
    {
      id: 'create-goal',
      title: 'Create Goal',
      description: 'Set a new goal to achieve',
      icon: Target,
      action: () => {
        router.push('/goals');
        // This would trigger the new goal modal
      },
      shortcut: ['c', 'g'],
      category: 'create',
      keywords: ['new', 'add', 'goal', 'objective'],
      featured: true
    },
    {
      id: 'create-expense',
      title: 'Add Expense',
      description: 'Log a new expense',
      icon: CreditCard,
      action: () => {
        router.push('/budget');
        // This would trigger the new expense modal
      },
      shortcut: ['c', 'e'],
      category: 'create',
      keywords: ['new', 'add', 'expense', 'money', 'spend'],
      featured: true
    },
    {
      id: 'create-event',
      title: 'Create Event',
      description: 'Schedule a new calendar event',
      icon: Calendar,
      action: () => {
        router.push('/calendar');
        // This would trigger the new event modal
      },
      shortcut: ['c', 'c'],
      category: 'create',
      keywords: ['new', 'add', 'event', 'schedule']
    },
    {
      id: 'create-reminder',
      title: 'Create Reminder',
      description: 'Set a new reminder',
      icon: Bell,
      action: () => {
        router.push('/reminders');
        // This would trigger the new reminder modal
      },
      shortcut: ['c', 'r'],
      category: 'create',
      keywords: ['new', 'add', 'reminder', 'alert']
    },
    {
      id: 'create-shopping-item',
      title: 'Add to Shopping List',
      description: 'Add item to shopping list',
      icon: ShoppingCart,
      action: () => {
        router.push('/shopping');
        // This would trigger the add item modal
      },
      category: 'create',
      keywords: ['new', 'add', 'shopping', 'buy', 'item']
    }
  ];

  // Quick actions
  const quickActions: CommandAction[] = [
    {
      id: 'action-search',
      title: 'Search Everything',
      description: 'Search across all content',
      icon: Search,
      action: () => {
        // This would trigger global search
      },
      shortcut: ['/', '/'],
      category: 'actions',
      keywords: ['find', 'search', 'look'],
      featured: true
    },
    {
      id: 'action-analytics',
      title: 'View Analytics',
      description: 'See your progress and statistics',
      icon: BarChart3,
      action: () => router.push('/settings/analytics'),
      category: 'actions',
      keywords: ['stats', 'progress', 'data', 'insights']
    },
    {
      id: 'action-export',
      title: 'Export Data',
      description: 'Download your data',
      icon: Download,
      action: () => {
        // This would trigger export functionality
      },
      category: 'actions',
      keywords: ['download', 'backup', 'export']
    },
    {
      id: 'action-profile',
      title: 'Profile Settings',
      description: 'Manage your profile',
      icon: User,
      action: () => router.push('/settings/profile'),
      category: 'settings',
      keywords: ['account', 'profile', 'user']
    }
  ];

  // Combine all actions
  const allActions = [...navigationActions, ...createActions, ...quickActions];

  // Filter actions based on search
  const filteredActions = search
    ? allActions.filter(action => {
        const searchLower = search.toLowerCase();
        return (
          action.title.toLowerCase().includes(searchLower) ||
          action.description?.toLowerCase().includes(searchLower) ||
          action.keywords.some(keyword => keyword.toLowerCase().includes(searchLower))
        );
      })
    : allActions;

  // Group actions by category
  const groupedActions = filteredActions.reduce((groups, action) => {
    const category = action.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(action);
    return groups;
  }, {} as Record<string, CommandAction[]>);

  // Handle action execution
  const handleActionSelect = useCallback((action: CommandAction) => {
    onOpenChange(false);
    setSearch('');
    action.action();
  }, [onOpenChange]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open command palette with Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenChange(!open);
      }

      // Close with Escape
      if (e.key === 'Escape') {
        onOpenChange(false);
        setSearch('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  // Clear search when dialog closes
  useEffect(() => {
    if (!open) {
      setSearch('');
    }
  }, [open]);

  const categoryLabels = {
    navigation: 'Navigation',
    create: 'Create New',
    actions: 'Quick Actions',
    settings: 'Settings',
    recent: 'Recent'
  };

  const categoryIcons = {
    navigation: ArrowRight,
    create: Plus,
    actions: Lightbulb,
    settings: Settings,
    recent: Clock
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 shadow-lg max-w-2xl">
        <Command className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
          <div className="flex items-center border-b px-3" cmdk-input-wrapper="">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Type a command or search..."
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            />
            <Badge variant="outline" className="ml-2 text-xs">
              <CommandIcon className="h-3 w-3 mr-1" />
              K
            </Badge>
          </div>
          <Command.List className="max-h-[400px] overflow-y-auto overflow-x-hidden">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No results found for "{search}"
            </Command.Empty>

            {Object.entries(groupedActions).map(([category, actions]) => {
              if (actions.length === 0) return null;

              const CategoryIcon = categoryIcons[category as keyof typeof categoryIcons];

              return (
                <Command.Group key={category} heading={
                  <div className="flex items-center gap-2">
                    <CategoryIcon className="h-4 w-4" />
                    {categoryLabels[category as keyof typeof categoryLabels]}
                  </div>
                }>
                  {actions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <Command.Item
                        key={action.id}
                        value={action.id}
                        onSelect={() => handleActionSelect(action)}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg",
                          "hover:bg-accent hover:text-accent-foreground",
                          "data-[selected]:bg-accent data-[selected]:text-accent-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{action.title}</span>
                            {action.featured && (
                              <Star className="h-3 w-3 text-amber-500" />
                            )}
                          </div>
                          {action.description && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {action.description}
                            </p>
                          )}
                        </div>
                        {action.shortcut && (
                          <div className="flex items-center gap-1">
                            {action.shortcut.map((key, index) => (
                              <Badge key={index} variant="secondary" className="text-xs px-1.5 py-0.5">
                                {key.toUpperCase()}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              );
            })}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

// ==================== COMMAND PALETTE PROVIDER ====================

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  // Listen for trigger events
  useEffect(() => {
    const handleTrigger = (event: CustomEvent) => {
      setOpen(true);
    };

    document.addEventListener('command-palette-trigger', handleTrigger as EventListener);
    return () => document.removeEventListener('command-palette-trigger', handleTrigger as EventListener);
  }, []);

  return (
    <>
      {children}
      <CommandPalette open={open} onOpenChange={setOpen} />
    </>
  );
}