import type { Metadata } from 'next'
import ArticlesPageClient from './ArticlesPageClient'
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

export default async function ArticlesPage() {
  const articles = [...blogArticles].sort((a, b) => {
    const dateA = a.publishedDate || '1970-01-01'
    const dateB = b.publishedDate || '1970-01-01'
    return dateB.localeCompare(dateA)
  })

  return <ArticlesPageClient articles={articles} />
}
