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
  // Strip htmlContent before passing to client — prevents ~2K lines of HTML
  // from being serialized into the client JS bundle for the listing page
  const articles = [...blogArticles]
    .sort((a, b) => {
      const dateA = a.publishedDate || '1970-01-01'
      const dateB = b.publishedDate || '1970-01-01'
      return dateB.localeCompare(dateA)
    })
    .map(({ htmlContent: _, ...article }) => article)

  return <ArticlesPageClient articles={articles} />
}
