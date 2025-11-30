'use client';

import { useRef } from 'react';
import { CheckSquare, Check, Users, Flag, BarChart3, Calendar } from 'lucide-react';
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

export default function TasksFeaturePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-blue-50/30 to-white dark:from-black dark:via-blue-950/20 dark:to-black">
      <Header />

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-32">
        <AnimatedSection>
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-tasks rounded-3xl mb-6 shadow-xl shadow-blue-500/30 animate-bounce-subtle">
              <CheckSquare className="w-10 h-10 text-white" />
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
              Tasks & Chores
            </h1>

            <p className="text-lg sm:text-xl md:text-2xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
              Organize household responsibilities with smart task management. Assign, track, and complete tasks together as a family.
            </p>
          </div>
        </AnimatedSection>

        {/* Key Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
          {[
            {
              icon: Users,
              color: 'bg-blue-500',
              title: 'Shared Responsibility',
              description: 'Assign tasks to family members and share the workload fairly across your household.'
            },
            {
              icon: Flag,
              color: 'bg-cyan-500',
              title: 'Set Priorities',
              description: 'Mark tasks as low, medium, or high priority to focus on what matters most.'
            },
            {
              icon: BarChart3,
              color: 'bg-emerald-500',
              title: 'Track Progress',
              description: 'See completion rates and productivity trends at a glance with visual dashboards.'
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
      <section className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
                Everything You Need
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                Simple yet powerful task management for busy families
              </p>
            </div>
          </AnimatedSection>

          <div className="space-y-4 max-w-3xl mx-auto">
            {[
              'Create tasks with detailed descriptions and due dates',
              'Assign tasks to specific family members',
              'Set priority levels to focus on urgent items',
              'Track status (pending, in progress, completed)',
              'Filter and search through all your tasks',
              'View completion statistics and trends',
              'Get real-time updates when tasks are completed'
            ].map((feature, index) => (
              <AnimatedSection key={index} delay={index * 0.05}>
                <div className="flex items-start gap-4 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl p-6 border border-gray-200/50 dark:border-gray-700/50">
                  <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mt-1">
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
                Common ways families use task management
              </p>
            </div>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            <AnimatedSection delay={0.2}>
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-2xl p-8 border border-blue-200/50 dark:border-blue-700/50">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Daily Chores</h3>
                <ul className="space-y-3 text-gray-700 dark:text-gray-300">
                  {['Kitchen cleaning', 'Laundry rotation', 'Pet feeding schedule', 'Trash and recycling'].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={0.4}>
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-2xl p-8 border border-emerald-200/50 dark:border-emerald-700/50">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Family Projects</h3>
                <ul className="space-y-3 text-gray-700 dark:text-gray-300">
                  {['Home improvement tasks', 'Vacation planning', 'Birthday party prep', 'Yard work projects'].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
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
