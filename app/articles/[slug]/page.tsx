import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ArticlePageClient from './ArticlePageClient'
import { RichText } from '@/components/payload/RichText'
import type { SerializedArticle } from '../ArticlesPageClient'
import type { Article, ArticleCategory, ArticleMedia } from '@/lib/services/articles-service'
import { blogArticles } from '@/lib/data/blog-articles'
import type { BlogArticle } from '@/lib/data/blog-articles'

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

      const fallbackContent = fallback.htmlContent
        ? <div dangerouslySetInnerHTML={{ __html: fallback.htmlContent }} />
        : null

      return (
        <ArticlePageClient
          article={fallback}
          relatedArticles={relatedFallback}
          renderedContent={fallbackContent}
        />
      )
    } catch {
      // Payload failed — fall through to hardcoded
    }
  }

  // Fallback: blog articles data
  const fallback = fallbackArticles[slug]
  if (!fallback) notFound()

  const relatedFallback = Object.values(fallbackArticles)
    .filter(a => a.slug !== slug)
    .slice(0, 4)

  const fallbackContent = fallback.htmlContent
    ? <div dangerouslySetInnerHTML={{ __html: fallback.htmlContent }} />
    : null

  return (
    <ArticlePageClient
      article={fallback}
      relatedArticles={relatedFallback}
      renderedContent={fallbackContent}
    />
  )
}
