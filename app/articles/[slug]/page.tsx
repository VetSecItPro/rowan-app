import { notFound } from 'next/navigation'
import ArticlePageClient from './ArticlePageClient'
import { RichText } from '@/components/payload/RichText'
import type { SerializedArticle } from '../ArticlesPageClient'
import type { Article, ArticleCategory, ArticleMedia } from '@/lib/services/articles-service'

// Hardcoded fallback articles (used when Payload CMS is not configured)
const fallbackArticles: Record<string, SerializedArticle> = {
  'getting-started-with-rowan': {
    slug: 'getting-started-with-rowan',
    title: 'Getting Started with Rowan: Your Complete Guide',
    description: 'Learn how to set up Rowan for your family and start organizing your life together. From creating your first space to inviting family members.',
    categoryName: 'Getting Started',
    categoryColor: 'emerald',
    categoryIcon: 'FileText',
    readTime: '5 min read',
    featured: true,
  },
  'master-family-calendar': {
    slug: 'master-family-calendar',
    title: 'Mastering the Family Calendar',
    description: 'Discover how to sync calendars, create shared events, and never miss an important family moment again.',
    categoryName: 'Calendar',
    categoryColor: 'purple',
    categoryIcon: 'Calendar',
    readTime: '4 min read',
    featured: true,
  },
  'task-management-tips': {
    slug: 'task-management-tips',
    title: 'Task Management Tips for Busy Families',
    description: 'Practical strategies for dividing household chores fairly and keeping everyone accountable.',
    categoryName: 'Tasks',
    categoryColor: 'blue',
    categoryIcon: 'CheckSquare',
    readTime: '6 min read',
    featured: false,
  },
  'shopping-list-collaboration': {
    slug: 'shopping-list-collaboration',
    title: 'Collaborative Shopping Lists That Actually Work',
    description: 'How to create, share, and manage shopping lists that update in real-time across all devices.',
    categoryName: 'Shopping',
    categoryColor: 'emerald',
    categoryIcon: 'ShoppingCart',
    readTime: '3 min read',
    featured: false,
  },
  'family-communication-hub': {
    slug: 'family-communication-hub',
    title: 'Creating a Family Communication Hub',
    description: 'Use Rowan messaging to keep everyone in the loop without the chaos of group chats.',
    categoryName: 'Messages',
    categoryColor: 'green',
    categoryIcon: 'MessageSquare',
    readTime: '4 min read',
    featured: false,
  },
  'setting-family-goals': {
    slug: 'setting-family-goals',
    title: 'Setting and Achieving Family Goals Together',
    description: 'Learn how to set meaningful goals as a family and track progress with visual milestones.',
    categoryName: 'Goals',
    categoryColor: 'indigo',
    categoryIcon: 'Target',
    readTime: '5 min read',
    featured: true,
  },
  'never-miss-reminder': {
    slug: 'never-miss-reminder',
    title: 'Never Miss a Reminder Again',
    description: 'Set up smart reminders for appointments, medications, and important dates.',
    categoryName: 'Reminders',
    categoryColor: 'pink',
    categoryIcon: 'Bell',
    readTime: '3 min read',
    featured: false,
  },
  'meal-planning-made-easy': {
    slug: 'meal-planning-made-easy',
    title: 'Meal Planning Made Easy',
    description: 'Plan your weekly meals, discover new recipes, and automatically generate shopping lists.',
    categoryName: 'Meals',
    categoryColor: 'orange',
    categoryIcon: 'Utensils',
    readTime: '5 min read',
    featured: false,
  },
  'family-budget-basics': {
    slug: 'family-budget-basics',
    title: 'Family Budget Basics with Rowan',
    description: 'Track expenses, set budgets, and achieve financial goals as a family unit.',
    categoryName: 'Budget',
    categoryColor: 'amber',
    categoryIcon: 'DollarSign',
    readTime: '6 min read',
    featured: false,
  },
}

function serializeArticle(article: Article): SerializedArticle {
  const category = typeof article.category === 'object' && article.category
    ? article.category as ArticleCategory
    : null

  const featuredImage = typeof article.featuredImage === 'object' && article.featuredImage
    ? article.featuredImage as ArticleMedia
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

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params

  // Try Payload CMS first
  if (process.env.PAYLOAD_DATABASE_URI) {
    try {
      const { getArticleBySlug, getRelatedArticles, getArticles } = await import('@/lib/services/articles-service')
      const article = await getArticleBySlug(slug, 'rowan')

      if (article) {
        const category = typeof article.category === 'object' && article.category
          ? article.category as ArticleCategory
          : null

        const related = category?.id
          ? await getRelatedArticles(slug, category.id, 'rowan', 4)
          : []

        const serialized = serializeArticle(article)

        // Render rich text content server-side
        const renderedContent = article.content
          ? <RichText data={article.content as Parameters<typeof RichText>[0]['data']} />
          : null

        return (
          <ArticlePageClient
            article={serialized}
            relatedArticles={related.map(serializeArticle)}
            renderedContent={renderedContent}
          />
        )
      }

      // Article not in CMS — check fallbacks
      const fallback = fallbackArticles[slug]
      if (!fallback) notFound()

      // Get other articles for "related" section
      let relatedFromCms: SerializedArticle[] = []
      try {
        const allArticles = await getArticles('rowan')
        relatedFromCms = allArticles
          .filter(a => a.slug !== slug)
          .slice(0, 4)
          .map(serializeArticle)
      } catch {
        // ignore
      }

      const relatedFallback = relatedFromCms.length > 0
        ? relatedFromCms
        : Object.values(fallbackArticles).filter(a => a.slug !== slug).slice(0, 4)

      return (
        <ArticlePageClient
          article={fallback}
          relatedArticles={relatedFallback}
          renderedContent={null}
        />
      )
    } catch {
      // Payload failed — fall through to hardcoded
    }
  }

  // Fallback: hardcoded data
  const fallback = fallbackArticles[slug]
  if (!fallback) notFound()

  const relatedFallback = Object.values(fallbackArticles)
    .filter(a => a.slug !== slug)
    .slice(0, 4)

  return (
    <ArticlePageClient
      article={fallback}
      relatedArticles={relatedFallback}
      renderedContent={null}
    />
  )
}
