export const revalidate = 3600 // ISR: regenerate every 1 hour

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ArticlePageClient from './ArticlePageClient'
import { blogArticles } from '@/lib/data/blog-articles'
import type { BlogArticle } from '@/lib/data/blog-articles'
import { sanitizeHtml } from '@/lib/sanitize'

// Build lookup from blog articles data
const fallbackArticles: Record<string, BlogArticle> = Object.fromEntries(
  blogArticles.map(a => [a.slug, a])
)

export async function generateStaticParams() {
  return blogArticles.map(article => ({ slug: article.slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const article = fallbackArticles[slug]

  if (!article) {
    return { title: 'Article Not Found - Rowan' }
  }

  return {
    title: `${article.title} - Rowan`,
    description: article.description,
    openGraph: {
      title: article.title,
      description: article.description,
      type: 'article',
      publishedTime: article.publishedDate,
      ...(article.featuredImageUrl && { images: [article.featuredImageUrl] }),
    },
  }
}

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params

  const article = fallbackArticles[slug]
  if (!article) notFound()

  const relatedArticles = Object.values(fallbackArticles)
    .filter(a => a.slug !== slug)
    .slice(0, 4)

  const sanitizedHtml = article.htmlContent
    ? await sanitizeHtml(article.htmlContent)
    : null

  // SECURITY: Content sanitized via DOMPurify. Never bypass sanitizeHtml().
  const renderedContent = sanitizedHtml
    ? <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
    : null

  return (
    <ArticlePageClient
      article={article}
      relatedArticles={relatedArticles}
      renderedContent={renderedContent}
    />
  )
}
