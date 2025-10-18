// Default category configurations for different domains
export interface DefaultCategory {
  name: string;
  description: string;
  icon: string;
  color: string;
  domain: 'expense' | 'task' | 'goal' | 'universal';
  monthly_budget?: number;
}

// ==================== EXPENSE CATEGORIES ====================
export const DEFAULT_EXPENSE_CATEGORIES: DefaultCategory[] = [
  {
    name: 'Groceries',
    description: 'Food and household essentials',
    icon: '🛒',
    color: '#10b981',
    domain: 'expense',
    monthly_budget: 400
  },
  {
    name: 'Dining',
    description: 'Restaurants and takeout',
    icon: '🍽️',
    color: '#f59e0b',
    domain: 'expense',
    monthly_budget: 200
  },
  {
    name: 'Transportation',
    description: 'Gas, parking, public transport',
    icon: '🚗',
    color: '#3b82f6',
    domain: 'expense',
    monthly_budget: 300
  },
  {
    name: 'Healthcare',
    description: 'Medical, dental, pharmacy',
    icon: '🏥',
    color: '#ef4444',
    domain: 'expense',
    monthly_budget: 150
  },
  {
    name: 'Shopping',
    description: 'Clothing, electronics, misc purchases',
    icon: '🛍️',
    color: '#8b5cf6',
    domain: 'expense',
    monthly_budget: 250
  },
  {
    name: 'Entertainment',
    description: 'Movies, games, subscriptions',
    icon: '🎭',
    color: '#ec4899',
    domain: 'expense',
    monthly_budget: 100
  },
  {
    name: 'Utilities',
    description: 'Electric, water, gas, internet',
    icon: '⚡',
    color: '#06b6d4',
    domain: 'expense',
    monthly_budget: 200
  },
  {
    name: 'Housing',
    description: 'Rent, mortgage, home maintenance',
    icon: '🏠',
    color: '#84cc16',
    domain: 'expense',
    monthly_budget: 1200
  },
  {
    name: 'Insurance',
    description: 'Auto, health, life insurance',
    icon: '🛡️',
    color: '#64748b',
    domain: 'expense',
    monthly_budget: 300
  },
  {
    name: 'Travel',
    description: 'Flights, hotels, vacation expenses',
    icon: '✈️',
    color: '#0ea5e9',
    domain: 'expense',
    monthly_budget: 200
  }
];

// ==================== TASK CATEGORIES ====================
export const DEFAULT_TASK_CATEGORIES: DefaultCategory[] = [
  {
    name: 'Work',
    description: 'Professional tasks and projects',
    icon: '💼',
    color: '#3b82f6',
    domain: 'task'
  },
  {
    name: 'Personal',
    description: 'Personal errands and tasks',
    icon: '👤',
    color: '#10b981',
    domain: 'task'
  },
  {
    name: 'Health',
    description: 'Exercise, medical appointments',
    icon: '💪',
    color: '#ef4444',
    domain: 'task'
  },
  {
    name: 'Learning',
    description: 'Education and skill development',
    icon: '📚',
    color: '#8b5cf6',
    domain: 'task'
  },
  {
    name: 'Household',
    description: 'Cleaning, maintenance, chores',
    icon: '🏠',
    color: '#f59e0b',
    domain: 'task'
  },
  {
    name: 'Social',
    description: 'Events, meetings, social activities',
    icon: '👥',
    color: '#ec4899',
    domain: 'task'
  },
  {
    name: 'Shopping',
    description: 'Purchases and errands',
    icon: '🛒',
    color: '#06b6d4',
    domain: 'task'
  },
  {
    name: 'Finance',
    description: 'Bills, banking, budgeting',
    icon: '💰',
    color: '#84cc16',
    domain: 'task'
  }
];

// ==================== GOAL CATEGORIES ====================
export const DEFAULT_GOAL_CATEGORIES: DefaultCategory[] = [
  {
    name: 'Health & Fitness',
    description: 'Exercise, nutrition, wellness goals',
    icon: '🏃',
    color: '#ef4444',
    domain: 'goal'
  },
  {
    name: 'Career',
    description: 'Professional development and advancement',
    icon: '📈',
    color: '#3b82f6',
    domain: 'goal'
  },
  {
    name: 'Financial',
    description: 'Savings, investments, debt reduction',
    icon: '💰',
    color: '#10b981',
    domain: 'goal'
  },
  {
    name: 'Education',
    description: 'Learning new skills or knowledge',
    icon: '🎓',
    color: '#8b5cf6',
    domain: 'goal'
  },
  {
    name: 'Personal',
    description: 'Self-improvement and personal growth',
    icon: '🌱',
    color: '#84cc16',
    domain: 'goal'
  },
  {
    name: 'Relationships',
    description: 'Family, friends, social connections',
    icon: '❤️',
    color: '#ec4899',
    domain: 'goal'
  },
  {
    name: 'Hobbies',
    description: 'Creative pursuits and interests',
    icon: '🎨',
    color: '#f59e0b',
    domain: 'goal'
  },
  {
    name: 'Travel',
    description: 'Vacation plans and adventures',
    icon: '🗺️',
    color: '#06b6d4',
    domain: 'goal'
  },
  {
    name: 'Home',
    description: 'Home improvement and organization',
    icon: '🏡',
    color: '#64748b',
    domain: 'goal'
  }
];

// ==================== UNIVERSAL CATEGORIES ====================
export const DEFAULT_UNIVERSAL_CATEGORIES: DefaultCategory[] = [
  {
    name: 'Urgent',
    description: 'High priority items requiring immediate attention',
    icon: '🚨',
    color: '#dc2626',
    domain: 'universal'
  },
  {
    name: 'Important',
    description: 'Significant items with long-term impact',
    icon: '⭐',
    color: '#f59e0b',
    domain: 'universal'
  },
  {
    name: 'Routine',
    description: 'Regular, recurring activities',
    icon: '🔄',
    color: '#6b7280',
    domain: 'universal'
  },
  {
    name: 'Projects',
    description: 'Multi-step initiatives and complex tasks',
    icon: '📋',
    color: '#3b82f6',
    domain: 'universal'
  }
];

// ==================== HELPER FUNCTIONS ====================

/**
 * Get all default categories for a specific domain
 */
export function getDefaultCategoriesForDomain(domain: DefaultCategory['domain']): DefaultCategory[] {
  switch (domain) {
    case 'expense':
      return DEFAULT_EXPENSE_CATEGORIES;
    case 'task':
      return DEFAULT_TASK_CATEGORIES;
    case 'goal':
      return DEFAULT_GOAL_CATEGORIES;
    case 'universal':
      return DEFAULT_UNIVERSAL_CATEGORIES;
    default:
      return [];
  }
}

/**
 * Get all default categories
 */
export function getAllDefaultCategories(): DefaultCategory[] {
  return [
    ...DEFAULT_EXPENSE_CATEGORIES,
    ...DEFAULT_TASK_CATEGORIES,
    ...DEFAULT_GOAL_CATEGORIES,
    ...DEFAULT_UNIVERSAL_CATEGORIES
  ];
}

/**
 * Find a default category by name and domain
 */
export function findDefaultCategory(name: string, domain?: DefaultCategory['domain']): DefaultCategory | undefined {
  const categories = domain ? getDefaultCategoriesForDomain(domain) : getAllDefaultCategories();
  return categories.find(cat => cat.name.toLowerCase() === name.toLowerCase());
}

/**
 * Get suggested categories based on a search term
 */
export function getSuggestedCategories(searchTerm: string, domain?: DefaultCategory['domain']): DefaultCategory[] {
  const categories = domain ? getDefaultCategoriesForDomain(domain) : getAllDefaultCategories();
  const term = searchTerm.toLowerCase();

  return categories.filter(cat =>
    cat.name.toLowerCase().includes(term) ||
    cat.description.toLowerCase().includes(term)
  );
}

/**
 * Get category color by name
 */
export function getCategoryColor(categoryName: string, domain?: DefaultCategory['domain']): string {
  const category = findDefaultCategory(categoryName, domain);
  return category?.color || '#6b7280';
}

/**
 * Get category icon by name
 */
export function getCategoryIcon(categoryName: string, domain?: DefaultCategory['domain']): string {
  const category = findDefaultCategory(categoryName, domain);
  return category?.icon || '📁';
}

// ==================== EXPENSE CATEGORY MAPPING ====================

/**
 * Map receipt scanning categories to our expense categories
 */
export const RECEIPT_CATEGORY_MAPPING: Record<string, string> = {
  'grocery': 'Groceries',
  'food': 'Groceries',
  'supermarket': 'Groceries',
  'restaurant': 'Dining',
  'fast food': 'Dining',
  'coffee': 'Dining',
  'gas': 'Transportation',
  'fuel': 'Transportation',
  'parking': 'Transportation',
  'pharmacy': 'Healthcare',
  'medical': 'Healthcare',
  'retail': 'Shopping',
  'clothing': 'Shopping',
  'electronics': 'Shopping',
  'entertainment': 'Entertainment',
  'subscription': 'Entertainment',
  'hotel': 'Travel',
  'airline': 'Travel',
  'uber': 'Transportation',
  'lyft': 'Transportation'
};

/**
 * Map a receipt category to our expense categories
 */
export function mapReceiptCategory(receiptCategory: string): string {
  const normalized = receiptCategory.toLowerCase();
  return RECEIPT_CATEGORY_MAPPING[normalized] || 'Shopping';
}