'use client';

import { motion, Variants } from 'framer-motion';
import { Trophy, Check, Target, Flame, Star, Sparkles, ArrowRight } from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { Footer } from '@/components/layout/Footer';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import { MagneticButton } from '@/components/ui/magnetic-button';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.4, 0.25, 1],
    },
  },
};

export default function GoalsFeaturePage() {
  return (
    <div className="min-h-screen bg-gray-900 overflow-x-hidden">
      <PublicHeader />

      <main>
        {/* Hero Section */}
        <section className="relative pt-24 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_45%_at_50%_0%,rgba(139,92,246,0.1),transparent)] bg-[radial-gradient(45%_45%_at_50%_0%,rgba(124,58,237,0.05),transparent)]" />

          <div className="max-w-7xl mx-auto">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={containerVariants}
              className="text-center"
            >
              <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-900/30 text-violet-300 text-sm font-medium mb-8">
                <Sparkles className="w-4 h-4" />
                <span>Reach Higher</span>
              </motion.div>

              <motion.h1
                variants={itemVariants}
                className="text-5xl sm:text-7xl font-bold tracking-tight text-white mb-6"
              >
                Shared <span className="bg-gradient-to-r from-violet-500 to-purple-600 bg-clip-text text-transparent">Goals</span>
              </motion.h1>

              <motion.p
                variants={itemVariants}
                className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-light mb-10"
              >
                Achieve more together. Set ambitious family goals, track your collective
                progress, and celebrate every milestone along the way.
              </motion.p>

              <motion.div
                variants={itemVariants}
                className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
              >
                <MagneticButton className="group" onClick={() => window.location.href = '/signup'}>
                  <div className="px-8 py-4 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-full font-semibold text-base transition-all shadow-xl shadow-purple-500/20 flex items-center justify-center gap-2">
                    Sign Up Free
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </MagneticButton>

                <MagneticButton strength={15} onClick={() => window.location.href = '/pricing'}>
                  <div className="px-8 py-4 bg-gray-800 text-white border border-gray-700 hover:bg-gray-700 rounded-full font-semibold text-base transition-all shadow-lg text-center">
                    View Pricing
                  </div>
                </MagneticButton>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  icon: Target,
                  title: "Goal Setting",
                  description: "Define clear, actionable family goals. Break down big ambitions into manageable steps and milestones.",
                  color: "violet"
                },
                {
                  icon: Flame,
                  title: "Streak Tracking",
                  description: "Build momentum with daily streaks. Stay motivated as you watch your family's consistency grow.",
                  color: "purple"
                },
                {
                  icon: Star,
                  title: "Achievements",
                  description: "Unlock badges and rewards as you reach your targets. Turn family progress into a rewarding experience.",
                  color: "indigo"
                }
              ].map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1, duration: 0.6 }}
                >
                  <SpotlightCard className="p-8 h-full">
                    <div className={`w-12 h-12 rounded-2xl bg-${item.color}-500/10 flex items-center justify-center mb-6`}>
                      <item.icon className={`w-6 h-6 text-${item.color}-500`} />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">{item.title}</h3>
                    <p className="text-gray-400 leading-relaxed">
                      {item.description}
                    </p>
                  </SpotlightCard>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Details Section */}
        <section className="py-20 bg-gray-800/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              >
                <h2 className="text-4xl font-bold text-white mb-8">
                  Success is a Team Effort
                </h2>
                <div className="space-y-6">
                  {[
                    "Visual progress bars for every shared goal",
                    "Collaborative contribution tracking",
                    "Automated check-ins and progress updates",
                    "Milestone celebration notifications",
                    "Historical archive of achieved family goals"
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center">
                        <Check className="w-4 h-4 text-violet-400" />
                      </div>
                      <span className="text-lg text-gray-300 font-medium">{feature}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="relative aspect-video rounded-3xl overflow-hidden bg-gray-900 border border-gray-700 shadow-2xl"
              >
                <div className="h-full flex flex-col">
                  <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-violet-400" />
                      <span className="text-sm font-semibold text-white">Family Goals</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-orange-400" />
                      <span className="text-[11px] text-orange-400 font-medium">12 day streak</span>
                    </div>
                  </div>
                  <div className="flex-1 px-5 py-3 space-y-3 overflow-hidden">
                    {[
                      { name: "Hawaii vacation fund", current: 2400, target: 5000, color: "bg-violet-500", emoji: "🏝️", label: "$2,400 / $5,000" },
                      { name: "Read 24 books this year", current: 7, target: 24, color: "bg-purple-500", emoji: "📚", label: "7 of 24 books" },
                      { name: "Family 5K run", current: 6, target: 8, color: "bg-indigo-500", emoji: "🏃", label: "Week 6 of 8" },
                      { name: "Learn to cook 12 new recipes", current: 4, target: 12, color: "bg-fuchsia-500", emoji: "👨‍🍳", label: "4 of 12 recipes" },
                    ].map((g) => (
                      <div key={g.name} className="rounded-lg bg-gray-800/50 p-2.5">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-sm">{g.emoji}</span>
                          <span className="text-[11px] text-gray-200 font-medium flex-1">{g.name}</span>
                          <span className="text-[10px] text-gray-500">{g.label}</span>
                        </div>
                        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div className={`h-full ${g.color} rounded-full`} style={{ width: `${(g.current / g.target) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-24 text-center">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-8">
              Ready to achieve your family dreams?
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <MagneticButton className="group" onClick={() => window.location.href = '/signup'}>
                <div className="px-8 py-4 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-full font-semibold text-base transition-all shadow-xl shadow-purple-500/20 flex items-center justify-center gap-2">
                  Sign Up Free
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </MagneticButton>

              <MagneticButton strength={15} onClick={() => window.location.href = '/pricing'}>
                <div className="px-8 py-4 bg-gray-800 text-white border border-gray-700 hover:bg-gray-700 rounded-full font-semibold text-base transition-all shadow-lg text-center">
                  View Pricing
                </div>
              </MagneticButton>
            </div>
          </div>
        </section>
      </main>

      <Footer />

    </div>
  );
}
