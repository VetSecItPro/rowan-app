import type { Metadata } from 'next'
import ArticlesPageClient from './ArticlesPageClient'
import type { SerializedArticle } from './ArticlesPageClient'
import type { Article, ArticleCategory } from '@/lib/services/articles-service'
import { blogArticles } from '@/lib/data/blog-articles'

export const metadata: Metadata = {
  title: 'Articles & Guides - Rowan',
  description: 'Tips, insights, and best practices for family organization. Learn about task management, meal planning, shared calendars, budgeting, and more.',
  openGraph: {
    title: 'Articles & Guides - Rowan',
    description: 'Tips, insights, and best practices for family organization.',
    type: 'website',
  },
}

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

function sortByDateDesc(articles: SerializedArticle[]): SerializedArticle[] {
  return [...articles].sort((a, b) => {
    const dateA = a.publishedDate || '1970-01-01'
    const dateB = b.publishedDate || '1970-01-01'
    return dateB.localeCompare(dateA)
  })
}

async function fetchArticles(): Promise<SerializedArticle[]> {
  // Only attempt Payload fetch if database is configured
  if (!process.env.PAYLOAD_DATABASE_URI) {
    return sortByDateDesc(blogArticles)
  }

  try {
    const { getArticles } = await import('@/lib/services/articles-service')
    const articles = await getArticles('rowan')

    if (articles.length === 0) {
      return sortByDateDesc(blogArticles)
    }

    return articles.map(serializeArticle)
  } catch {
    // Payload not configured or DB not available — use fallback
    return sortByDateDesc(blogArticles)
  }
}

export default async function ArticlesPage() {
  const articles = await fetchArticles()
  return <ArticlesPageClient articles={articles} />
}
