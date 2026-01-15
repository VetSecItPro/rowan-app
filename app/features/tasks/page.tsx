'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, Variants } from 'framer-motion';
import { CheckSquare, Check, Users, Zap, List, Sparkles, ArrowRight } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import { BetaAccessModal } from '@/components/beta/BetaAccessModal';
import { LaunchNotificationModal } from '@/components/beta/LaunchNotificationModal';
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

export default function TasksFeaturePage() {
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
    <div className="min-h-screen bg-gray-900 overflow-x-hidden">
      <Header
        onBetaClick={() => setIsBetaModalOpen(true)}
        onLaunchClick={() => setIsLaunchModalOpen(true)}
        isPublicFeaturePage={true}
      />

      <main>
        {/* Hero Section */}
        <section className="relative pt-24 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_45%_at_50%_0%,rgba(59,130,246,0.1),transparent)] bg-[radial-gradient(45%_45%_at_50%_0%,rgba(37,99,235,0.05),transparent)]" />

          <div className="max-w-7xl mx-auto">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={containerVariants}
              className="text-center"
            >
              <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/30 text-blue-300 text-sm font-medium mb-8">
                <Sparkles className="w-4 h-4" />
                <span>Coordinated Care</span>
              </motion.div>

              <motion.h1
                variants={itemVariants}
                className="text-5xl sm:text-7xl font-bold tracking-tight text-white mb-6"
              >
                Tasks & <span className="bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600 bg-clip-text text-transparent">Chores</span>
              </motion.h1>

              <motion.p
                variants={itemVariants}
                className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-light mb-10"
              >
                Organise daily tasks and household chores together. With smart assignments
                and completion tracking, keeping home rhythm has never been easier.
              </motion.p>

              <motion.div
                variants={itemVariants}
                className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
              >
                <MagneticButton className="group" onClick={() => setIsBetaModalOpen(true)}>
                  <div className="px-8 py-4 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600 text-white rounded-full font-semibold text-base transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2">
                    Access Beta Test
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </MagneticButton>

                <MagneticButton strength={15} onClick={() => setIsLaunchModalOpen(true)}>
                  <div className="px-8 py-4 bg-gray-800 text-white border border-gray-700 hover:bg-gray-700 rounded-full font-semibold text-base transition-all shadow-lg text-center">
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
                  icon: List,
                  title: "Flexible Lists",
                  description: "Create project-specific lists or general household task pools. Organize exactly how your family works.",
                  color: "blue"
                },
                {
                  icon: Users,
                  title: "Fair Assignment",
                  description: "Assign tasks to specific family members or let others pick them up. Keep the workload balanced.",
                  color: "cyan"
                },
                {
                  icon: Zap,
                  title: "Quick Action",
                  description: "Mark tasks as complete, snooze for later, or add context with just a tap. Efficiency built-in.",
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
                  Home Management, Simplified
                </h2>
                <div className="space-y-6">
                  {[
                    "Real-time sync across all family devices",
                    "Detailed task history and activity feed",
                    "Attach notes, categories, and priority levels",
                    "Automatic recurring schedules for routine chores",
                    "Visual progress tracking for the whole household"
                  ].map((feature, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <Check className="w-4 h-4 text-blue-400" />
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
                className="relative aspect-video rounded-3xl overflow-hidden bg-gradient-to-br from-blue-500 via-cyan-500 to-blue-600 shadow-2xl"
              >
                <div className="absolute inset-0 flex items-center justify-center text-white/20">
                  <CheckSquare className="w-32 h-32 animate-pulse" />
                </div>
                <div className="absolute inset-0 bg-white/10 backdrop-blur-sm flex items-center justify-center">
                  <span className="text-white font-bold text-xl drop-shadow-md">Tasks Preview</span>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-24 text-center">
          <div className="max-w-4xl mx-auto px-4">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-8">
              Ready to get your home in order?
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <MagneticButton className="group" onClick={() => setIsBetaModalOpen(true)}>
                <div className="px-8 py-4 bg-gradient-to-r from-blue-500 via-cyan-500 to-blue-600 text-white rounded-full font-semibold text-base transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2">
                  Access Beta Test
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </MagneticButton>

              <MagneticButton strength={15} onClick={() => setIsLaunchModalOpen(true)}>
                <div className="px-8 py-4 bg-gray-800 text-white border border-gray-700 hover:bg-gray-700 rounded-full font-semibold text-base transition-all shadow-lg text-center">
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
