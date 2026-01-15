'use client';

// Universal emojis for family-friendly interface
export const EMOJIS = ['😊', '😂', '❤️', '👍', '🎉', '🙏', '👏', '🤝', '💪', '🌟', '✨', '🎈', '🌸', '🌈', '☀️', '🍕', '☕', '📅', '✅', '🏠'];

// Enhanced Task Categories for Family Collaboration
export const TASK_CATEGORIES = {
  // Work & Professional
  work: {
    emoji: '💼',
    label: 'Work & Career',
    color: 'bg-blue-500',
    textColor: 'text-blue-600',
    lightBg: 'bg-blue-900/30',
    description: 'Professional tasks, meetings, deadlines'
  },

  // Personal Development
  personal: {
    emoji: '🌱',
    label: 'Personal Growth',
    color: 'bg-purple-500',
    textColor: 'text-purple-600',
    lightBg: 'bg-purple-900/30',
    description: 'Self-improvement, learning, hobbies'
  },

  // Home & Family
  home: {
    emoji: '🏠',
    label: 'Home & Family',
    color: 'bg-amber-500',
    textColor: 'text-amber-600',
    lightBg: 'bg-amber-900/30',
    description: 'Household tasks, family activities'
  },

  // Shopping & Errands
  shopping: {
    emoji: '🛒',
    label: 'Shopping & Errands',
    color: 'bg-emerald-500',
    textColor: 'text-emerald-600',
    lightBg: 'bg-emerald-900/30',
    description: 'Grocery runs, appointments, errands'
  },

  // Health & Wellness
  health: {
    emoji: '💪',
    label: 'Health & Wellness',
    color: 'bg-green-500',
    textColor: 'text-green-600',
    lightBg: 'bg-green-900/30',
    description: 'Exercise, medical appointments, wellness'
  },

  // Financial & Budget
  finance: {
    emoji: '💰',
    label: 'Finance & Budget',
    color: 'bg-yellow-500',
    textColor: 'text-yellow-600',
    lightBg: 'bg-yellow-900/30',
    description: 'Bills, budgeting, financial planning'
  },

  // Education & Learning
  education: {
    emoji: '📚',
    label: 'Education & Learning',
    color: 'bg-indigo-500',
    textColor: 'text-indigo-600',
    lightBg: 'bg-indigo-900/30',
    description: 'Courses, reading, skill development'
  },

  // Family & Relationships
  family: {
    emoji: '👨‍👩‍👧‍👦',
    label: 'Family & Friends',
    color: 'bg-pink-500',
    textColor: 'text-pink-600',
    lightBg: 'bg-pink-900/30',
    description: 'Family time, social events, relationships'
  },

  // Events & Social
  social: {
    emoji: '🎉',
    label: 'Events & Social',
    color: 'bg-orange-500',
    textColor: 'text-orange-600',
    lightBg: 'bg-orange-900/30',
    description: 'Parties, gatherings, celebrations'
  },

  // Kids & School
  kids: {
    emoji: '🎒',
    label: 'Kids & School',
    color: 'bg-cyan-500',
    textColor: 'text-cyan-600',
    lightBg: 'bg-cyan-900/30',
    description: 'School activities, kids events, childcare'
  },

  // Travel & Vacation
  travel: {
    emoji: '✈️',
    label: 'Travel & Vacation',
    color: 'bg-sky-500',
    textColor: 'text-sky-600',
    lightBg: 'bg-sky-900/30',
    description: 'Trip planning, vacations, adventures'
  },

  // Other
  other: {
    emoji: '📌',
    label: 'Other',
    color: 'bg-gray-500',
    textColor: 'text-gray-600',
    lightBg: 'bg-gray-900/30',
    description: 'Miscellaneous tasks and activities'
  },
};

// Enhanced Chore Categories for Family Households
export const CHORE_CATEGORIES = {
  // Kitchen & Cooking
  kitchen: {
    emoji: '🍳',
    label: 'Kitchen & Cooking',
    color: 'bg-orange-500',
    textColor: 'text-orange-600',
    lightBg: 'bg-orange-900/30',
    description: 'Meal prep, cooking, kitchen cleanup'
  },

  // Cleaning & Tidying
  cleaning: {
    emoji: '🧹',
    label: 'Cleaning & Tidying',
    color: 'bg-cyan-500',
    textColor: 'text-cyan-600',
    lightBg: 'bg-cyan-900/30',
    description: 'Deep cleaning, organizing, decluttering'
  },

  // Laundry & Clothing
  laundry: {
    emoji: '👕',
    label: 'Laundry & Clothing',
    color: 'bg-blue-500',
    textColor: 'text-blue-600',
    lightBg: 'bg-blue-900/30',
    description: 'Washing, drying, folding, ironing'
  },

  // Dishes & Dishware
  dishes: {
    emoji: '🍽️',
    label: 'Dishes & Cleanup',
    color: 'bg-teal-500',
    textColor: 'text-teal-600',
    lightBg: 'bg-teal-900/30',
    description: 'Washing dishes, loading dishwasher'
  },

  // Yard & Garden
  yard_work: {
    emoji: '🌿',
    label: 'Yard & Garden',
    color: 'bg-green-500',
    textColor: 'text-green-600',
    lightBg: 'bg-green-900/30',
    description: 'Gardening, lawn care, outdoor maintenance'
  },

  // Home Maintenance
  maintenance: {
    emoji: '🔧',
    label: 'Home Maintenance',
    color: 'bg-gray-500',
    textColor: 'text-gray-600',
    lightBg: 'bg-gray-900/30',
    description: 'Repairs, upkeep, home improvements'
  },

  // Pet Care
  pet_care: {
    emoji: '🐾',
    label: 'Pet Care',
    color: 'bg-amber-500',
    textColor: 'text-amber-600',
    lightBg: 'bg-amber-900/30',
    description: 'Feeding, grooming, vet visits, walks'
  },

  // Organization & Storage
  organizing: {
    emoji: '📦',
    label: 'Organization',
    color: 'bg-purple-500',
    textColor: 'text-purple-600',
    lightBg: 'bg-purple-900/30',
    description: 'Organizing spaces, decluttering, storage'
  },

  // Trash & Recycling
  trash: {
    emoji: '🗑️',
    label: 'Trash & Recycling',
    color: 'bg-emerald-500',
    textColor: 'text-emerald-600',
    lightBg: 'bg-emerald-900/30',
    description: 'Taking out trash, recycling, composting'
  },

  // Childcare & Kids
  childcare: {
    emoji: '👶',
    label: 'Childcare',
    color: 'bg-pink-500',
    textColor: 'text-pink-600',
    lightBg: 'bg-pink-900/30',
    description: 'Kids activities, bedtime, school prep'
  },

  // Grocery & Shopping
  grocery: {
    emoji: '🛍️',
    label: 'Grocery & Shopping',
    color: 'bg-indigo-500',
    textColor: 'text-indigo-600',
    lightBg: 'bg-indigo-900/30',
    description: 'Grocery shopping, household supplies'
  },

  // Other Household
  other: {
    emoji: '🏠',
    label: 'Other Household',
    color: 'bg-slate-500',
    textColor: 'text-slate-600',
    lightBg: 'bg-slate-900/30',
    description: 'Other household tasks and chores'
  },
};

// Priority Levels for Family Context
export const PRIORITY_LEVELS = {
  urgent: {
    label: 'Urgent',
    emoji: '🔥',
    color: 'bg-red-500',
    textColor: 'text-red-600',
    lightBg: 'bg-red-900/30',
    description: 'Needs immediate attention'
  },
  high: {
    label: 'High',
    emoji: '⚡',
    color: 'bg-orange-500',
    textColor: 'text-orange-600',
    lightBg: 'bg-orange-900/30',
    description: 'Important, do soon'
  },
  medium: {
    label: 'Medium',
    emoji: '📌',
    color: 'bg-yellow-500',
    textColor: 'text-yellow-600',
    lightBg: 'bg-yellow-900/30',
    description: 'Normal priority'
  },
  low: {
    label: 'Low',
    emoji: '💤',
    color: 'bg-green-500',
    textColor: 'text-green-600',
    lightBg: 'bg-green-900/30',
    description: 'When you have time'
  },
};

// Family Assignment Roles
export const FAMILY_ROLES = {
  parent1: {
    label: 'Parent 1',
    emoji: '👨',
    color: 'bg-blue-500',
    description: 'Primary guardian/parent'
  },
  parent2: {
    label: 'Parent 2',
    emoji: '👩',
    color: 'bg-purple-500',
    description: 'Secondary guardian/parent'
  },
  teen: {
    label: 'Teen',
    emoji: '🧑‍🎓',
    color: 'bg-green-500',
    description: 'Teenage family member'
  },
  child: {
    label: 'Child',
    emoji: '👶',
    color: 'bg-pink-500',
    description: 'Younger family member'
  },
  everyone: {
    label: 'Everyone',
    emoji: '👨‍👩‍👧‍👦',
    color: 'bg-amber-500',
    description: 'Whole family responsibility'
  },
  unassigned: {
    label: 'Unassigned',
    emoji: '❓',
    color: 'bg-gray-500',
    description: 'Not yet assigned to anyone'
  },
};

// Recurring Patterns for Family Scheduling
export const RECURRING_PATTERNS = {
  daily: {
    label: 'Daily',
    emoji: '📅',
    description: 'Every day'
  },
  weekly: {
    label: 'Weekly',
    emoji: '📆',
    description: 'Once per week'
  },
  biweekly: {
    label: 'Bi-weekly',
    emoji: '🗓️',
    description: 'Every two weeks'
  },
  monthly: {
    label: 'Monthly',
    emoji: '📊',
    description: 'Once per month'
  },
  custom: {
    label: 'Custom',
    emoji: '⚙️',
    description: 'Custom schedule'
  },
};

// Status Types with Family Context
export const STATUS_TYPES = {
  pending: {
    label: 'To Do',
    emoji: '⏳',
    color: 'bg-gray-500',
    textColor: 'text-gray-600',
    lightBg: 'bg-gray-900/30',
    description: 'Not started yet'
  },
  in_progress: {
    label: 'In Progress',
    emoji: '⚡',
    color: 'bg-blue-500',
    textColor: 'text-blue-600',
    lightBg: 'bg-blue-900/30',
    description: 'Currently working on'
  },
  completed: {
    label: 'Completed',
    emoji: '✅',
    color: 'bg-green-500',
    textColor: 'text-green-600',
    lightBg: 'bg-green-900/30',
    description: 'Finished successfully'
  },
  blocked: {
    label: 'Blocked',
    emoji: '🚫',
    color: 'bg-red-500',
    textColor: 'text-red-600',
    lightBg: 'bg-red-900/30',
    description: 'Cannot proceed'
  },
  on_hold: {
    label: 'On Hold',
    emoji: '⏸️',
    color: 'bg-amber-500',
    textColor: 'text-amber-600',
    lightBg: 'bg-amber-900/30',
    description: 'Temporarily paused'
  },
};