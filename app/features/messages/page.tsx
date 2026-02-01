'use client';

import { motion, Variants } from 'framer-motion';
import { MessageSquare, Check, Users, Shield, Zap, Sparkles, ArrowRight } from 'lucide-react';
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

export default function MessagingFeaturePage() {
  return (
    <div className="min-h-screen bg-gray-900 overflow-x-hidden">
      <PublicHeader />

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
                <span>Connected Conversations</span>
              </motion.div>

              <motion.h1
                variants={itemVariants}
                className="text-5xl sm:text-7xl font-bold tracking-tight text-white mb-6"
              >
                Family <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 bg-clip-text text-transparent">Messaging</span>
              </motion.h1>

              <motion.p
                variants={itemVariants}
                className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-light mb-10"
              >
                Keep your family talking. A secure, private space for daily chats,
                coordinating plans, and sharing moments that matter most.
              </motion.p>

              <motion.div
                variants={itemVariants}
                className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
              >
                <MagneticButton className="group" onClick={() => window.location.href = '/signup'}>
                  <div className="px-8 py-4 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white rounded-full font-semibold text-base transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2">
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
                  icon: Users,
                  title: "Group Chats",
                  description: "Create topic-specific threads for projects, vacations, or general family banter. Everyone stays in the loop.",
                  color: "blue"
                },
                {
                  icon: Shield,
                  title: "Private & Secure",
                  description: "Your conversations are protected with enterprise-grade security. Only your family has access to your data.",
                  color: "indigo"
                },
                {
                  icon: Zap,
                  title: "Rich Interaction",
                  description: "Share photos, locations, and interactive task cards directly within the chat for seamless coordination.",
                  color: "purple"
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
                  Communication, Redefined
                </h2>
                <div className="space-y-6">
                  {[
                    "Real-time messaging with instant notifications",
                    "Emoji reactions and message threading",
                    "Seamless integration with other family tools",
                    "Visual indicators for family member presence",
                    "Archive and search history for all family chats"
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
                className="relative aspect-video rounded-3xl overflow-hidden bg-gray-900 border border-gray-700 shadow-2xl"
              >
                <div className="h-full flex flex-col">
                  <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-semibold text-white">Family Chat</span>
                    </div>
                    <div className="flex -space-x-1.5">
                      {['bg-pink-400', 'bg-blue-400', 'bg-emerald-400', 'bg-purple-400'].map((c, i) => (
                        <div key={i} className={`w-5 h-5 rounded-full ${c} border-2 border-gray-900 flex items-center justify-center text-[8px] font-bold text-white`}>
                          {['S', 'M', 'J', 'E'][i]}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1 px-5 py-3 space-y-3 overflow-hidden">
                    {[
                      { sender: "Sarah", text: "Can someone pick up Jake from practice at 5?", color: "bg-pink-400", align: "left" as const, time: "3:42 PM" },
                      { sender: "Mike", text: "I can grab him! Need anything from the store on the way back?", color: "bg-blue-400", align: "right" as const, time: "3:44 PM" },
                      { sender: "Sarah", text: "Yes! We need milk and that cereal Emma likes", color: "bg-pink-400", align: "left" as const, time: "3:45 PM" },
                      { sender: "Emma", text: "Honey Bunches of Oats!", color: "bg-purple-400", align: "left" as const, time: "3:46 PM" },
                      { sender: "Mike", text: "Got it, see you all around 5:30", color: "bg-blue-400", align: "right" as const, time: "3:47 PM" },
                    ].map((m) => (
                      <div key={m.text} className={`flex ${m.align === 'right' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] flex items-end gap-1.5 ${m.align === 'right' ? 'flex-row-reverse' : ''}`}>
                          <div className={`w-5 h-5 rounded-full ${m.color} flex-shrink-0 flex items-center justify-center text-[8px] font-bold text-white`}>
                            {m.sender[0]}
                          </div>
                          <div>
                            <div className={`rounded-2xl px-3 py-1.5 text-[11px] ${m.align === 'right' ? 'bg-blue-600/20 text-blue-100 rounded-br-sm' : 'bg-gray-800 text-gray-200 rounded-bl-sm'}`}>
                              {m.text}
                            </div>
                            <div className={`text-[9px] text-gray-600 mt-0.5 ${m.align === 'right' ? 'text-right' : ''}`}>{m.time}</div>
                          </div>
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
              Ready to start the conversation?
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <MagneticButton className="group" onClick={() => window.location.href = '/signup'}>
                <div className="px-8 py-4 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white rounded-full font-semibold text-base transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-2">
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
