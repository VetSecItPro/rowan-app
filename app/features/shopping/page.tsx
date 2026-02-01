'use client';

import { motion, Variants } from 'framer-motion';
import { ShoppingCart, Check, List, Tag, Share2, Sparkles, ArrowRight } from 'lucide-react';
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

export default function ShoppingFeaturePage() {
  return (
    <div className="min-h-screen bg-gray-900 overflow-x-hidden">
      <PublicHeader />

      <main>
        {/* Hero Section */}
        <section className="relative pt-24 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_45%_at_50%_0%,rgba(16,185,129,0.1),transparent)] bg-[radial-gradient(45%_45%_at_50%_0%,rgba(5,150,105,0.05),transparent)]" />

          <div className="max-w-7xl mx-auto">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={containerVariants}
              className="text-center"
            >
              <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-900/30 text-emerald-300 text-sm font-medium mb-8">
                <Sparkles className="w-4 h-4" />
                <span>Always Prepared</span>
              </motion.div>

              <motion.h1
                variants={itemVariants}
                className="text-5xl sm:text-7xl font-bold tracking-tight text-white mb-6"
              >
                Shared <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 bg-clip-text text-transparent">Shopping</span>
              </motion.h1>

              <motion.p
                variants={itemVariants}
                className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-light mb-10"
              >
                Never forget an item again. Create collaborative shopping lists that update
                in real-time, helping your family stay organized and efficient.
              </motion.p>

              <motion.div
                variants={itemVariants}
                className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
              >
                <MagneticButton className="group" onClick={() => window.location.href = '/signup'}>
                  <div className="px-8 py-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white rounded-full font-semibold text-base transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2">
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
                  icon: List,
                  title: "Smart Lists",
                  description: "Create multiple lists for different stores or occasions. Organize items by category for faster shopping.",
                  color: "emerald"
                },
                {
                  icon: Share2,
                  title: "Real-time Sync",
                  description: "Updates instantly on all family devices. See items being checked off as someone else shops.",
                  color: "teal"
                },
                {
                  icon: Tag,
                  title: "Quick Entry",
                  description: "Add items fast with intelligent suggestions. Store quantities, notes, and photos for clarity.",
                  color: "green"
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
                  Shopping, Made Simple
                </h2>
                <div className="space-y-6">
                  {[
                    "Collaborative lists for the whole family",
                    "Smart categorization for easy store navigation",
                    "Historical list of frequently bought items",
                    "Photo attachments for specific products",
                    "Integrated with meal planning for auto-lists"
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <Check className="w-4 h-4 text-emerald-400" />
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
                      <ShoppingCart className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm font-semibold text-white">Weekly Grocery</span>
                    </div>
                    <span className="text-[11px] text-gray-500">8 items · 3 done</span>
                  </div>
                  <div className="flex-1 px-5 py-3 overflow-hidden">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-[10px] font-semibold text-emerald-400 mb-2">Produce</div>
                        <div className="space-y-1.5">
                          {[
                            { text: "Avocados (3)", done: true },
                            { text: "Baby spinach", done: true },
                            { text: "Bananas", done: false },
                            { text: "Bell peppers (2)", done: false },
                          ].map((item) => (
                            <div key={item.text} className="flex items-center gap-2 py-1 px-2 rounded-md bg-gray-800/40">
                              <div className={`w-3.5 h-3.5 rounded flex-shrink-0 flex items-center justify-center ${item.done ? 'bg-emerald-500/30' : 'border border-gray-600'}`}>
                                {item.done && <Check className="w-2 h-2 text-emerald-400" />}
                              </div>
                              <span className={`text-[11px] ${item.done ? 'text-gray-500 line-through' : 'text-gray-200'}`}>{item.text}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-semibold text-teal-400 mb-2">Dairy &amp; Meat</div>
                        <div className="space-y-1.5">
                          {[
                            { text: "Whole milk", done: true },
                            { text: "Greek yogurt", done: false },
                            { text: "Chicken breast (2 lb)", done: false },
                            { text: "Cheddar cheese", done: false },
                          ].map((item) => (
                            <div key={item.text} className="flex items-center gap-2 py-1 px-2 rounded-md bg-gray-800/40">
                              <div className={`w-3.5 h-3.5 rounded flex-shrink-0 flex items-center justify-center ${item.done ? 'bg-emerald-500/30' : 'border border-gray-600'}`}>
                                {item.done && <Check className="w-2 h-2 text-emerald-400" />}
                              </div>
                              <span className={`text-[11px] ${item.done ? 'text-gray-500 line-through' : 'text-gray-200'}`}>{item.text}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
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
              Ready to simplify your shopping?
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <MagneticButton className="group" onClick={() => window.location.href = '/signup'}>
                <div className="px-8 py-4 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white rounded-full font-semibold text-base transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2">
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
