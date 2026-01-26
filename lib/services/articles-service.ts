import { getPayload } from '@/lib/payload/client'

export type Site = 'rowan' | 'kaulby'

export interface ArticleCategory {
  id: string
  name: string
  slug: string
  color: string
  icon: string
}

export interface ArticleMedia {
  id: string
  alt: string
  caption?: string
  url: string
  sizes?: {
    thumbnail?: { url: string; width: number; height: number }
    card?: { url: string; width: number; height: number }
    hero?: { url: string; width: number; height: number }
  }
}

export interface Article {
  id: string
  site: Site
  title: string
  slug: string
  description: string
  featuredImage?: ArticleMedia | string
  category?: ArticleCategory | string
  content?: unknown
  readTime?: string
  featured?: boolean
  publishedDate?: string
  seo?: {
    metaTitle?: string
    metaDescription?: string
    ogImage?: ArticleMedia | string
  }
  createdAt: string
  updatedAt: string
}

/**
 * Fetch published articles for a given site.
 * Used by Rowan's /articles page (server component).
 */
export async function getArticles(site: Site = 'rowan'): Promise<Article[]> {
  const payload = await getPayload()
  const { docs } = await payload.find({
    collection: 'articles',
    where: {
      site: { equals: site },
      _status: { equals: 'published' },
    },
    sort: '-publishedDate',
    depth: 2,
    limit: 100,
  })
  return docs as unknown as Article[]
}

/**
 * Fetch featured articles for a given site.
 */
export async function getFeaturedArticles(site: Site = 'rowan'): Promise<Article[]> {
  const payload = await getPayload()
  const { docs } = await payload.find({
    collection: 'articles',
    where: {
      site: { equals: site },
      _status: { equals: 'published' },
      featured: { equals: true },
    },
    sort: '-publishedDate',
    depth: 2,
    limit: 10,
  })
  return docs as unknown as Article[]
}

/**
 * Fetch a single article by slug for a given site.
 */
export async function getArticleBySlug(slug: string, site: Site = 'rowan'): Promise<Article | null> {
  const payload = await getPayload()
  const { docs } = await payload.find({
    collection: 'articles',
    where: {
      slug: { equals: slug },
      site: { equals: site },
      _status: { equals: 'published' },
    },
    depth: 2,
    limit: 1,
  })
  return (docs[0] as unknown as Article) || null
}

/**
 * Fetch all categories.
 */
export async function getCategories(): Promise<ArticleCategory[]> {
  const payload = await getPayload()
  const { docs } = await payload.find({
    collection: 'categories',
    sort: 'name',
    limit: 100,
  })
  return docs as unknown as ArticleCategory[]
}

/**
 * Fetch related articles (same category, different slug).
 */
export async function getRelatedArticles(
  slug: string,
  categoryId: string,
  site: Site = 'rowan',
  limit = 4
): Promise<Article[]> {
  const payload = await getPayload()
  const { docs } = await payload.find({
    collection: 'articles',
    where: {
      slug: { not_equals: slug },
      site: { equals: site },
      _status: { equals: 'published' },
      category: { equals: categoryId },
    },
    sort: '-publishedDate',
    depth: 2,
    limit,
  })
  return docs as unknown as Article[]
}
