'use client';

import { useRef } from 'react';
import { ShoppingCart, CheckCircle, Smartphone, Users, RefreshCw, Check } from 'lucide-react';
import { motion, useInView } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

function AnimatedSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.4, 0.25, 1] }}
    >
      {children}
    </motion.div>
  );
}

export default function ShoppingFeaturePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-emerald-50/30 to-white dark:from-black dark:via-emerald-950/20 dark:to-black">
      <Header />

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
        <AnimatedSection>
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-shopping rounded-3xl mb-6 shadow-xl shadow-emerald-500/30 animate-bounce-subtle">
              <ShoppingCart className="w-10 h-10 text-white" />
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
              Shopping Lists
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
              Create and share shopping lists with your space members. Add items, check them off in real-time, and coordinate your shopping with shared lists.
            </p>
          </div>
        </AnimatedSection>

        {/* Key Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
          {[
            {
              icon: RefreshCw,
              color: 'bg-emerald-500',
              title: 'Real-Time Sync',
              description: 'Changes appear instantly for everyone. See what\'s been checked off as you shop.'
            },
            {
              icon: Users,
              color: 'bg-green-500',
              title: 'Collaborative',
              description: 'Everyone can add items, check them off, or add notes. Shop together or separately.'
            },
            {
              icon: Smartphone,
              color: 'bg-teal-500',
              title: 'Mobile Friendly',
              description: 'Access your lists from any device. Perfect for shopping on the go at any store.'
            }
          ].map((feature, index) => (
            <AnimatedSection key={feature.title} delay={index * 0.1}>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 hover:shadow-2xl hover:-translate-y-2 transition-all duration-300">
                <div className={`w-14 h-14 ${feature.color} rounded-2xl flex items-center justify-center mb-6`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{feature.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </AnimatedSection>
          ))}
        </div>
      </section>

      {/* What You Can Do Section */}
      <section className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                Everything You Need
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                Smart shopping list features that save time and money
              </p>
            </div>
          </AnimatedSection>

          <div className="space-y-4 max-w-3xl mx-auto">
            {[
              'Create unlimited shopping lists with custom titles',
              'Add items with quantities to each list',
              'Check off items in real-time as you shop',
              'Auto-complete lists when all items are checked',
              'Filter lists by status (active, completed, all)',
              'Search across all your shopping lists',
              'View stats for total lists, active lists, and items this week'
            ].map((feature, index) => (
              <AnimatedSection key={index} delay={index * 0.05}>
                <div className="flex items-start gap-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50 dark:border-gray-700/50">
                  <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-emerald-500 to-green-500 rounded-full flex items-center justify-center mt-1">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-lg text-gray-900 dark:text-white font-medium">{feature}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                Perfect For
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                Common ways to organize household shopping
              </p>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            <AnimatedSection delay={0.2}>
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-2xl p-8 border border-emerald-200/50 dark:border-emerald-700/50">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Grocery & Food</h3>
                <ul className="space-y-3 text-gray-700 dark:text-gray-300">
                  {['Weekly grocery shopping lists', 'Special occasion meal planning', 'Bulk buying for large families', 'Party and entertaining supplies'].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <ShoppingCart className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={0.4}>
              <div className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 rounded-2xl p-8 border border-teal-200/50 dark:border-teal-700/50">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Household & Other</h3>
                <ul className="space-y-3 text-gray-700 dark:text-gray-300">
                  {['Household supplies and cleaning products', 'Home improvement project materials', 'Back-to-school and office supplies', 'Gift and holiday shopping'].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-teal-600 dark:text-teal-400 mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
