'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Share2,
  BookOpen,
} from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { BetaAccessModal } from '@/components/beta/BetaAccessModal'
import { LaunchNotificationModal } from '@/components/beta/LaunchNotificationModal'
import { getIconComponent, colorClasses } from '@/lib/utils/article-icons'
import type { SerializedArticle } from '../ArticlesPageClient'

interface SerializedArticleDetail extends SerializedArticle {
  content?: string // Pre-rendered HTML from server
}

interface ArticlePageClientProps {
  article: SerializedArticleDetail | null
  relatedArticles: SerializedArticle[]
  renderedContent: React.ReactNode | null
}

export default function ArticlePageClient({ article, relatedArticles, renderedContent }: ArticlePageClientProps) {
  const router = useRouter()
  const [isBetaModalOpen, setIsBetaModalOpen] = useState(false)
  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false)

  const handleBetaSuccess = (inviteCode?: string, email?: string, firstName?: string, lastName?: string) => {
    if (inviteCode) {
      const urlParams = new URLSearchParams()
      urlParams.set('beta_code', inviteCode)
      if (email) urlParams.set('email', email)
      if (firstName) urlParams.set('first_name', firstName)
      if (lastName) urlParams.set('last_name', lastName)
      router.push(`/signup?${urlParams.toString()}`)
    } else {
      router.push('/signup')
    }
  }

  // 404 for unknown articles
  if (!article) {
    return (
      <div className="min-h-screen bg-gray-900">
        <Header
          onBetaClick={() => setIsBetaModalOpen(true)}
          onLaunchClick={() => setIsLaunchModalOpen(true)}
          isPublicFeaturePage={true}
        />
        <main className="pt-32 pb-20 px-4">
          <div className="max-w-2xl mx-auto text-center">
            <BookOpen className="w-16 h-16 text-gray-600 mx-auto mb-6" />
            <h1 className="text-3xl font-bold text-white mb-4">Article Not Found</h1>
            <p className="text-gray-400 mb-8">
              The article you&apos;re looking for doesn&apos;t exist or has been moved.
            </p>
            <Link
              href="/articles"
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-full font-medium hover:bg-emerald-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Articles
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  const colors = colorClasses[article.categoryColor] || colorClasses.emerald
  const Icon = getIconComponent(article.categoryIcon)
  const hasContent = !!renderedContent

  return (
    <div className="min-h-screen bg-gray-900">
      <Header
        onBetaClick={() => setIsBetaModalOpen(true)}
        onLaunchClick={() => setIsLaunchModalOpen(true)}
        isPublicFeaturePage={true}
      />

      <main>
        {/* Article Header */}
        <section className="relative pt-24 pb-12 px-4 sm:px-6 lg:px-8">
          <div className={`absolute inset-0 -z-10 bg-gradient-to-b ${colors.gradient} opacity-5`} />

          <div className="max-w-4xl mx-auto">
            <Link
              href="/articles"
              className="inline-flex items-center gap-2 text-gray-400 hover:text-emerald-400 transition-colors mb-8"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Articles
            </Link>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${colors.text}`} />
                </div>
                <span className={`text-sm font-medium ${colors.text}`}>{article.categoryName}</span>
                <span className="text-gray-400">&middot;</span>
                <span className="text-sm text-gray-400 flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {article.readTime}
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-bold text-white mb-6">
                {article.title}
              </h1>

              <p className="text-xl text-gray-400 leading-relaxed">
                {article.description}
              </p>

              <div className="mt-8 flex items-center gap-4">
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: article.title,
                        text: article.description,
                        url: window.location.href,
                      })
                    }
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-700 text-gray-400 hover:bg-gray-800 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                  Share
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Featured Image */}
        {article.featuredImageUrl && (
          <section className="px-4 sm:px-6 lg:px-8 pb-8">
            <div className="max-w-4xl mx-auto">
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden">
                <Image
                  src={article.featuredImageUrl}
                  alt={article.title}
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </div>
          </section>
        )}

        {/* Article Content or Coming Soon */}
        <section className="px-4 sm:px-6 lg:px-8 pb-20">
          <div className="max-w-4xl mx-auto">
            {hasContent ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="bg-gray-800 rounded-3xl border border-gray-700 p-8 sm:p-12"
              >
                {renderedContent}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="bg-gray-800 rounded-3xl border border-gray-700 p-8 sm:p-12 text-center"
              >
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${colors.gradient} mx-auto mb-6 flex items-center justify-center`}>
                  <BookOpen className="w-10 h-10 text-white" />
                </div>

                <h2 className="text-2xl font-bold text-white mb-4">
                  Full Article Coming Soon
                </h2>

                <p className="text-gray-400 mb-8 max-w-md mx-auto">
                  We&apos;re working on creating comprehensive guides and tutorials to help you get the most out of Rowan.
                  Check back soon for the full article!
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <button
                    onClick={() => setIsBetaModalOpen(true)}
                    className={`px-6 py-3 bg-gradient-to-r ${colors.gradient} text-white rounded-full font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2`}
                  >
                    Try Rowan Now
                    <ArrowRight className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setIsLaunchModalOpen(true)}
                    className="px-6 py-3 bg-gray-700 text-white rounded-full font-semibold hover:bg-gray-600 transition-colors"
                  >
                    Get Notified
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </section>

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <section className="px-4 sm:px-6 lg:px-8 pb-20">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold text-white mb-6">More Articles</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {relatedArticles.map((art) => {
                  const artColors = colorClasses[art.categoryColor] || colorClasses.emerald
                  const ArtIcon = getIconComponent(art.categoryIcon)
                  return (
                    <Link key={art.slug} href={`/articles/${art.slug}`}>
                      <div className="group p-4 rounded-xl border border-gray-700 bg-gray-800 hover:shadow-md hover:border-emerald-500/30 transition-all">
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-lg ${artColors.bg} flex items-center justify-center flex-shrink-0`}>
                            <ArtIcon className={`w-4 h-4 ${artColors.text}`} />
                          </div>
                          <div>
                            <h3 className="font-medium text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                              {art.title}
                            </h3>
                            <p className="text-sm text-gray-400 mt-1 line-clamp-1">
                              {art.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />

      <BetaAccessModal
        isOpen={isBetaModalOpen}
        onClose={() => setIsBetaModalOpen(false)}
        onSuccess={handleBetaSuccess}
        onSwitchToLaunch={() => {
          setIsBetaModalOpen(false)
          setIsLaunchModalOpen(true)
        }}
      />
      <LaunchNotificationModal
        isOpen={isLaunchModalOpen}
        onClose={() => setIsLaunchModalOpen(false)}
      />
    </div>
  )
}
