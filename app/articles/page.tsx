import ArticlesPageClient from './ArticlesPageClient'
import type { SerializedArticle } from './ArticlesPageClient'
import type { Article, ArticleCategory } from '@/lib/services/articles-service'

// Hardcoded fallback articles (used when Payload CMS is not configured)
const fallbackArticles: SerializedArticle[] = [
  {
    slug: 'getting-started-with-rowan',
    title: 'Getting Started with Rowan: Your Complete Guide',
    description: 'Learn how to set up Rowan for your family and start organizing your life together. From creating your first space to inviting family members.',
    categoryName: 'Getting Started',
    categoryColor: 'emerald',
    categoryIcon: 'FileText',
    readTime: '5 min read',
    featured: true,
  },
  {
    slug: 'master-family-calendar',
    title: 'Mastering the Family Calendar',
    description: 'Discover how to sync calendars, create shared events, and never miss an important family moment again.',
    categoryName: 'Calendar',
    categoryColor: 'purple',
    categoryIcon: 'Calendar',
    readTime: '4 min read',
    featured: true,
  },
  {
    slug: 'task-management-tips',
    title: 'Task Management Tips for Busy Families',
    description: 'Practical strategies for dividing household chores fairly and keeping everyone accountable.',
    categoryName: 'Tasks',
    categoryColor: 'blue',
    categoryIcon: 'CheckSquare',
    readTime: '6 min read',
    featured: false,
  },
  {
    slug: 'shopping-list-collaboration',
    title: 'Collaborative Shopping Lists That Actually Work',
    description: 'How to create, share, and manage shopping lists that update in real-time across all devices.',
    categoryName: 'Shopping',
    categoryColor: 'emerald',
    categoryIcon: 'ShoppingCart',
    readTime: '3 min read',
    featured: false,
  },
  {
    slug: 'family-communication-hub',
    title: 'Creating a Family Communication Hub',
    description: 'Use Rowan messaging to keep everyone in the loop without the chaos of group chats.',
    categoryName: 'Messages',
    categoryColor: 'green',
    categoryIcon: 'MessageSquare',
    readTime: '4 min read',
    featured: false,
  },
  {
    slug: 'setting-family-goals',
    title: 'Setting and Achieving Family Goals Together',
    description: 'Learn how to set meaningful goals as a family and track progress with visual milestones.',
    categoryName: 'Goals',
    categoryColor: 'indigo',
    categoryIcon: 'Target',
    readTime: '5 min read',
    featured: true,
  },
  {
    slug: 'never-miss-reminder',
    title: 'Never Miss a Reminder Again',
    description: 'Set up smart reminders for appointments, medications, and important dates.',
    categoryName: 'Reminders',
    categoryColor: 'pink',
    categoryIcon: 'Bell',
    readTime: '3 min read',
    featured: false,
  },
  {
    slug: 'meal-planning-made-easy',
    title: 'Meal Planning Made Easy',
    description: 'Plan your weekly meals, discover new recipes, and automatically generate shopping lists.',
    categoryName: 'Meals',
    categoryColor: 'orange',
    categoryIcon: 'Utensils',
    readTime: '5 min read',
    featured: false,
  },
  {
    slug: 'family-budget-basics',
    title: 'Family Budget Basics with Rowan',
    description: 'Track expenses, set budgets, and achieve financial goals as a family unit.',
    categoryName: 'Budget',
    categoryColor: 'amber',
    categoryIcon: 'DollarSign',
    readTime: '6 min read',
    featured: false,
  },
]

function serializeArticle(article: Article): SerializedArticle {
  const category = typeof article.category === 'object' && article.category
    ? article.category as ArticleCategory
    : null

  const featuredImage = typeof article.featuredImage === 'object' && article.featuredImage
    ? article.featuredImage
    : null

  return {
    slug: article.slug,
    title: article.title,
    description: article.description,
    categoryName: category?.name || 'Uncategorized',
    categoryColor: category?.color || 'emerald',
    categoryIcon: category?.icon || 'FileText',
    readTime: article.readTime || '5 min read',
    featured: article.featured || false,
    featuredImageUrl: featuredImage?.url || undefined,
  }
}

async function fetchArticles(): Promise<SerializedArticle[]> {
  // Only attempt Payload fetch if database is configured
  if (!process.env.PAYLOAD_DATABASE_URI) {
    return fallbackArticles
  }

  try {
    const { getArticles } = await import('@/lib/services/articles-service')
    const articles = await getArticles('rowan')

    if (articles.length === 0) {
      return fallbackArticles
    }

    return articles.map(serializeArticle)
  } catch {
    // Payload not configured or DB not available — use fallback
    return fallbackArticles
  }
}

export default async function ArticlesPage() {
  const articles = await fetchArticles()
  return <ArticlesPageClient articles={articles} />
}
