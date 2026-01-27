'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  FileText,
  ArrowRight,
  Clock,
  Search,
} from 'lucide-react'
import { PublicHeader } from '@/components/layout/PublicHeader'
import { Footer } from '@/components/layout/Footer'
import { getIconComponent, colorClasses } from '@/lib/utils/article-icons'

export interface SerializedArticle {
  slug: string
  title: string
  description: string
  categoryName: string
  categoryColor: string
  categoryIcon: string
  readTime: string
  featured: boolean
  featuredImageUrl?: string
}

interface ArticlesPageClientProps {
  articles: SerializedArticle[]
}

export default function ArticlesPageClient({ articles }: ArticlesPageClientProps) {
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

  // Build categories from articles
  const categorySet = new Set(articles.map(a => a.categoryName))
  const categories = [
    { name: 'All', count: articles.length },
    ...Array.from(categorySet).map(name => ({
      name,
      count: articles.filter(a => a.categoryName === name).length,
    })),
  ]

  const filteredArticles = articles.filter(article => {
    const matchesCategory = selectedCategory === 'All' || article.categoryName === selectedCategory
    const matchesSearch = searchQuery === '' ||
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  const featuredArticles = articles.filter(a => a.featured)

  return (
    <div className="min-h-screen bg-gray-900">
      <PublicHeader />

      <main>
        {/* Hero Section */}
        <section className="relative pt-24 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_45%_at_50%_0%,rgba(16,185,129,0.1),transparent)] bg-[radial-gradient(45%_45%_at_50%_0%,rgba(16,185,129,0.05),transparent)]" />

          <div className="max-w-7xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900/30 text-emerald-300 text-sm font-medium mb-6">
                <FileText className="w-4 h-4" />
                <span>Learn & Explore</span>
              </div>

              <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white mb-6">
                Articles & <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 bg-clip-text text-transparent">Guides</span>
              </h1>

              <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-light">
                Discover tips, tutorials, and best practices for getting the most out of Rowan
                for your family.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Search and Filter */}
        <section className="px-4 sm:px-6 lg:px-8 pb-8">
          <div className="max-w-7xl mx-auto">
            <div className="relative max-w-xl mx-auto mb-8">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 rounded-full border border-gray-700 bg-gray-800 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              {categories.filter(c => c.count > 0).map((category) => (
                <button
                  key={category.name}
                  onClick={() => setSelectedCategory(category.name)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    selectedCategory === category.name
                      ? 'bg-emerald-500 text-white shadow-md'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                  }`}
                >
                  {category.name}
                  {category.count > 0 && (
                    <span className={`ml-1.5 ${selectedCategory === category.name ? 'text-emerald-100' : 'text-gray-400'}`}>
                      ({category.count})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Articles */}
        {selectedCategory === 'All' && searchQuery === '' && featuredArticles.length > 0 && (
          <section className="px-4 sm:px-6 lg:px-8 pb-12">
            <div className="max-w-7xl mx-auto">
              <h2 className="text-2xl font-bold text-white mb-6">Featured</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {featuredArticles.map((article, index) => {
                  const colors = colorClasses[article.categoryColor] || colorClasses.emerald
                  const Icon = getIconComponent(article.categoryIcon)
                  return (
                    <motion.div
                      key={article.slug}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.5 }}
                    >
                      <Link href={`/articles/${article.slug}`}>
                        <div className={`group h-full rounded-2xl border ${colors.border} bg-gray-800 hover:shadow-lg transition-all cursor-pointer overflow-hidden`}>
                          {article.featuredImageUrl && (
                            <div className="relative w-full h-48 overflow-hidden">
                              <Image
                                src={article.featuredImageUrl}
                                alt={article.title}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                          )}
                          <div className="p-6">
                            {!article.featuredImageUrl && (
                              <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center mb-4`}>
                                <Icon className={`w-6 h-6 ${colors.text}`} />
                              </div>
                            )}
                            <div className="flex items-center gap-2 mb-2">
                              <span className={`text-xs font-medium ${colors.text}`}>{article.categoryName}</span>
                              <span className="text-xs text-gray-400">&middot;</span>
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {article.readTime}
                              </span>
                            </div>
                            <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-emerald-400 transition-colors">
                              {article.title}
                            </h3>
                            <p className="text-sm text-gray-400 line-clamp-2">
                              {article.description}
                            </p>
                            <div className="mt-4 flex items-center text-emerald-400 text-sm font-medium group-hover:gap-2 transition-all">
                              Read more <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </section>
        )}

        {/* All Articles */}
        <section className="px-4 sm:px-6 lg:px-8 pb-20">
          <div className="max-w-7xl mx-auto">
            {selectedCategory === 'All' && searchQuery === '' && (
              <h2 className="text-2xl font-bold text-white mb-6">All Articles</h2>
            )}

            {filteredArticles.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No articles found</h3>
                <p className="text-gray-400">
                  Try adjusting your search or filter to find what you&apos;re looking for.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredArticles.map((article, index) => {
                  const colors = colorClasses[article.categoryColor] || colorClasses.emerald
                  const Icon = getIconComponent(article.categoryIcon)
                  return (
                    <motion.div
                      key={article.slug}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.5 }}
                    >
                      <Link href={`/articles/${article.slug}`}>
                        <div className="group h-full rounded-2xl border border-gray-700 bg-gray-800 hover:shadow-lg hover:border-emerald-500/30 transition-all cursor-pointer overflow-hidden">
                          {article.featuredImageUrl && (
                            <div className="relative w-full h-40 overflow-hidden">
                              <Image
                                src={article.featuredImageUrl}
                                alt={article.title}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                          )}
                          <div className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              {!article.featuredImageUrl && (
                                <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center`}>
                                  <Icon className={`w-5 h-5 ${colors.text}`} />
                                </div>
                              )}
                              <span className="text-xs text-gray-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {article.readTime}
                              </span>
                            </div>
                            <span className={`text-xs font-medium ${colors.text} mb-2 block`}>{article.categoryName}</span>
                            <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-emerald-400 transition-colors line-clamp-2">
                              {article.title}
                            </h3>
                            <p className="text-sm text-gray-400 line-clamp-2 mb-4">
                              {article.description}
                            </p>
                            <div className="flex items-center text-emerald-400 text-sm font-medium">
                              Read article <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 bg-gradient-to-br from-emerald-500/5 via-teal-500/5 to-cyan-500/5">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to organize your family life?
            </h2>
            <p className="text-gray-400 mb-8 max-w-xl mx-auto">
              Join thousands of families already using Rowan to stay connected and organized.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => window.location.href = '/signup'}
                className="px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-full font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105 flex items-center gap-2"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => window.location.href = '/pricing'}
                className="px-8 py-3 bg-gray-800 text-white border border-gray-700 hover:bg-gray-700 rounded-full font-semibold transition-all shadow-md"
              >
                View Pricing
              </button>
            </div>
          </div>
        </section>
      </main>

      <Footer />

    </div>
  )
}
