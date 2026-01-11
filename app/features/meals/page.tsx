'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Utensils, Check, ShoppingCart, Calendar, Heart, Sparkles, ArrowRight } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import { BetaAccessModal } from '@/components/beta/BetaAccessModal';
import { LaunchNotificationModal } from '@/components/beta/LaunchNotificationModal';
import { MagneticButton } from '@/components/ui/magnetic-button';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
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

export default function MealsFeaturePage() {
  const router = useRouter();
  const [isBetaModalOpen, setIsBetaModalOpen] = useState(false);
  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);

  const handleBetaSuccess = (inviteCode?: string, email?: string, firstName?: string, lastName?: string) => {
    if (inviteCode) {
      const params = new URLSearchParams();
      params.set('beta_code', inviteCode);
      if (email) params.set('email', email);
      if (firstName) params.set('first_name', firstName);
      if (lastName) params.set('last_name', lastName);
      router.push(`/signup?${params.toString()}`);
    } else {
      router.push('/signup');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 overflow-x-hidden">
      <Header
        onBetaClick={() => setIsBetaModalOpen(true)}
        onLaunchClick={() => setIsLaunchModalOpen(true)}
        isPublicFeaturePage={true}
      />

      <main>
        {/* Hero Section */}
        <section className="relative pt-24 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_45%_at_50%_0%,rgba(249,115,22,0.1),transparent)] dark:bg-[radial-gradient(45%_45%_at_50%_0%,rgba(234,88,12,0.05),transparent)]" />

          <div className="max-w-7xl mx-auto">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={containerVariants}
              className="text-center"
            >
              <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-sm font-medium mb-8">
                <Sparkles className="w-4 h-4" />
                <span>Kitchen Bliss</span>
              </motion.div>

              <motion.h1
                variants={itemVariants}
                className="text-5xl sm:text-7xl font-bold tracking-tight text-gray-900 dark:text-white mb-6"
              >
                Meal <span className="bg-gradient-to-r from-orange-400 via-red-400 to-pink-500 bg-clip-text text-transparent">Planning</span>
              </motion.h1>

              <motion.p
                variants={itemVariants}
                className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed font-light mb-10"
              >
                Take the stress out of dinner. Plan your weekly meals, organize recipes,
                and generate shopping lists automatically with your family.
              </motion.p>

              <motion.div
                variants={itemVariants}
                className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
              >
                <MagneticButton className="group" onClick={() => setIsBetaModalOpen(true)}>
                  <div className="px-8 py-4 bg-gradient-to-r from-orange-400 via-red-400 to-pink-500 text-white rounded-full font-semibold text-base transition-all shadow-xl shadow-orange-500/20 flex items-center justify-center gap-2">
                    Access Beta Test
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </MagneticButton>

                <MagneticButton strength={15} onClick={() => setIsLaunchModalOpen(true)}>
                  <div className="px-8 py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-full font-semibold text-base transition-all shadow-lg text-center">
                    Get Notified on Launch
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
                  icon: Calendar,
                  title: "Weekly Planning",
                  description: "Design your family's meal schedule with a simple drag-and-drop interface. Plan for the whole week in minutes.",
                  color: "orange"
                },
                {
                  icon: Heart,
                  title: "Recipe Box",
                  description: "Store all your family favorites in one place. Add notes, ratings, and tag by dietary preferences.",
                  color: "red"
                },
                {
                  icon: ShoppingCart,
                  title: "Auto Shopping",
                  description: "Instantly turn your meal plan into a sorted shopping list. No more forgotten ingredients or double-buying.",
                  color: "pink"
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
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{item.title}</h3>
                    <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                      {item.description}
                    </p>
                  </SpotlightCard>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Details Section */}
        <section className="py-20 bg-gray-100/50 dark:bg-gray-800/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              >
                <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-8">
                  Mealtime, Reimagined
                </h2>
                <div className="space-y-6">
                  {[
                    "Collaborative meal planning for the whole household",
                    "Import recipes from your favorite websites",
                    "Smart leftovers management and dinner logging",
                    "Integrated with family calendar for visibility",
                    "Personalized dinner ideas and suggestions"
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center">
                        <Check className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                      </div>
                      <span className="text-lg text-gray-700 dark:text-gray-300 font-medium">{feature}</span>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
                className="relative aspect-video rounded-3xl overflow-hidden bg-gradient-to-br from-orange-400 via-red-400 to-pink-500 shadow-2xl"
              >
                <div className="absolute inset-0 flex items-center justify-center text-white/20">
                  <Utensils className="w-32 h-32 animate-pulse" />
                </div>
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm flex items-center justify-center">
                  <span className="text-white font-bold text-xl drop-shadow-md">Meals Preview</span>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-24 text-center">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-8">
              Ready to simplify your dinner?
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <MagneticButton className="group" onClick={() => setIsBetaModalOpen(true)}>
                <div className="px-8 py-4 bg-gradient-to-r from-orange-400 via-red-400 to-pink-500 text-white rounded-full font-semibold text-base transition-all shadow-xl shadow-orange-500/20 flex items-center justify-center gap-2">
                  Access Beta Test
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </MagneticButton>

              <MagneticButton strength={15} onClick={() => setIsLaunchModalOpen(true)}>
                <div className="px-8 py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-full font-semibold text-base transition-all shadow-lg text-center">
                  Get Notified on Launch
                </div>
              </MagneticButton>
            </div>
          </div>
        </section>
      </main>

      <Footer />

      <BetaAccessModal
        isOpen={isBetaModalOpen}
        onClose={() => setIsBetaModalOpen(false)}
        onSuccess={handleBetaSuccess}
        onSwitchToLaunch={() => {
          setIsBetaModalOpen(false);
          setIsLaunchModalOpen(true);
        }}
      />
      <LaunchNotificationModal
        isOpen={isLaunchModalOpen}
        onClose={() => setIsLaunchModalOpen(false)}
      />
    </div>
  );
}
