'use client';

import { useRef } from 'react';
import { UtensilsCrossed, Calendar, ShoppingCart, BookOpen, Check } from 'lucide-react';
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

export default function MealsFeaturePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-orange-50/30 to-white dark:from-black dark:via-orange-950/20 dark:to-black">
      <Header />

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
        <AnimatedSection>
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-meals rounded-3xl mb-6 shadow-xl shadow-orange-500/30 animate-bounce-subtle">
              <UtensilsCrossed className="w-10 h-10 text-white" />
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
              Meal Planning
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
              Plan meals for your space with a visual calendar. Create recipes, schedule meals for specific days, and organize your family's meal planning.
            </p>
          </div>
        </AnimatedSection>

        {/* Key Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
          {[
            {
              icon: Calendar,
              color: 'bg-orange-500',
              title: 'Weekly Planning',
              description: 'Plan meals for the entire week. Drag and drop recipes to different days effortlessly.'
            },
            {
              icon: BookOpen,
              color: 'bg-red-500',
              title: 'Recipe Library',
              description: 'Save your favorite recipes with ingredients, steps, and photos. Build your family cookbook.'
            },
            {
              icon: ShoppingCart,
              color: 'bg-emerald-500',
              title: 'Auto Shopping Lists',
              description: 'Generate shopping lists automatically from your meal plan. Never forget ingredients.'
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
      <section className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                Everything You Need
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                Complete meal planning tools for busy families
              </p>
            </div>
          </AnimatedSection>

          <div className="space-y-4 max-w-3xl mx-auto">
            {[
              'Plan meals on a visual calendar view',
              'Create and save unlimited recipes with ingredients',
              'Add detailed instructions and notes to recipes',
              'Assign meal types (breakfast, lunch, dinner, snack)',
              'View planned meals in calendar, list, or recipe format',
              'Search through meals and recipes',
              'Track statistics for meals this week and saved recipes'
            ].map((feature, index) => (
              <AnimatedSection key={index} delay={index * 0.05}>
                <div className="flex items-start gap-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50 dark:border-gray-700/50">
                  <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center mt-1">
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
                Common ways to organize family meals
              </p>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            <AnimatedSection delay={0.2}>
              <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-2xl p-8 border border-orange-200/50 dark:border-orange-700/50">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Daily Meals</h3>
                <ul className="space-y-3 text-gray-700 dark:text-gray-300">
                  {['Plan weekly breakfast, lunch, and dinner', 'Create recipe collections for easy planning', 'Schedule leftovers and meal prep days', 'Track dietary preferences and restrictions'].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <UtensilsCrossed className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={0.4}>
              <div className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 rounded-2xl p-8 border border-red-200/50 dark:border-red-700/50">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Special Occasions</h3>
                <ul className="space-y-3 text-gray-700 dark:text-gray-300">
                  {['Holiday meal planning and preparation', 'Birthday parties and celebrations', 'Family gatherings and potluck coordination', 'Vacation and travel meal planning'].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
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
