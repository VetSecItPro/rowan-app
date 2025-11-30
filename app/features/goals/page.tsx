'use client';

import { useRef } from 'react';
import { Target, TrendingUp, Award, Users, Check } from 'lucide-react';
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

export default function GoalsFeaturePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-indigo-50/30 to-white dark:from-black dark:via-indigo-950/20 dark:to-black">
      <Header />

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
        <AnimatedSection>
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-goals rounded-3xl mb-6 shadow-xl shadow-indigo-500/30 animate-bounce-subtle">
              <Target className="w-10 h-10 text-white" />
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
              Goal Tracking
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
              Set and track goals for your space. Create milestones, monitor progress, and organize your family's objectives.
            </p>
          </div>
        </AnimatedSection>

        {/* Key Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
          {[
            {
              icon: Target,
              color: 'bg-indigo-500',
              title: 'Goal Setting',
              description: 'Create individual and family goals with clear targets, deadlines, and measurable outcomes.'
            },
            {
              icon: TrendingUp,
              color: 'bg-blue-500',
              title: 'Progress Tracking',
              description: 'Visual progress bars and charts show how far you\'ve come and what\'s left to achieve.'
            },
            {
              icon: Award,
              color: 'bg-violet-500',
              title: 'Celebrate Wins',
              description: 'Mark milestones, celebrate achievements, and keep everyone motivated on the journey.'
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
      <section className="bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30 py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                Everything You Need
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                Powerful goal tracking for personal and family success
              </p>
            </div>
          </AnimatedSection>

          <div className="space-y-4 max-w-3xl mx-auto">
            {[
              'Create goals with custom titles and detailed descriptions',
              'Organize goals by category (fitness, financial, education, etc.)',
              'Track progress with visual progress bars',
              'Set goal status (active, paused, completed)',
              'Break down goals into trackable milestones',
              'Track different milestone types (money, count, percentage, custom)',
              'View statistics for active, in progress, and completed goals'
            ].map((feature, index) => (
              <AnimatedSection key={index} delay={index * 0.05}>
                <div className="flex items-start gap-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50 dark:border-gray-700/50">
                  <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-full flex items-center justify-center mt-1">
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
                Common types of goals people track
              </p>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            <AnimatedSection delay={0.2}>
              <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-2xl p-8 border border-indigo-200/50 dark:border-indigo-700/50">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Personal Goals</h3>
                <ul className="space-y-3 text-gray-700 dark:text-gray-300">
                  {['Fitness and health objectives', 'Learning new skills or hobbies', 'Career and professional development', 'Reading, writing, or creative projects'].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <Target className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={0.4}>
              <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-2xl p-8 border border-violet-200/50 dark:border-violet-700/50">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Family Goals</h3>
                <ul className="space-y-3 text-gray-700 dark:text-gray-300">
                  {['Save for a dream vacation together', 'Plan and achieve home renovation projects', 'Build emergency fund or college savings', 'Establish family traditions and habits'].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <Users className="w-5 h-5 text-violet-600 dark:text-violet-400 mt-0.5 flex-shrink-0" />
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
