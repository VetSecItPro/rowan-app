'use client';

import { motion, Variants } from 'framer-motion';
import { Calendar, Check, Users, MapPin, Layout, Sparkles, ArrowRight } from 'lucide-react';
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

export default function CalendarFeaturePage() {
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
                <span>Always In Sync</span>
              </motion.div>

              <motion.h1
                variants={itemVariants}
                className="text-5xl sm:text-7xl font-bold tracking-tight text-white mb-6"
              >
                Family <span className="bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 bg-clip-text text-transparent">Calendar</span>
              </motion.h1>

              <motion.p
                variants={itemVariants}
                className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed font-light mb-10"
              >
                A shared space for everyone&apos;s schedule. From school events to doctor
                appointments, keep your family organized and your time protected.
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
                  icon: Layout,
                  title: "Intuitive Views",
                  description: "Switch seamlessly between day, week, and month views. See the big picture or focus on the details.",
                  color: "emerald"
                },
                {
                  icon: Users,
                  title: "Shared Access",
                  description: "One calendar for the whole family. Everyone stays informed about where they need to be and when.",
                  color: "teal"
                },
                {
                  icon: MapPin,
                  title: "Event Location",
                  description: "Add addresses to events and get one-tap directions. Never be late for another appointment.",
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
                  Your Family Life, Organized
                </h2>
                <div className="space-y-6">
                  {[
                    "Color-coded events for each family member",
                    "Smart conflict detection and resolution",
                    "External calendar sync (Google, iCloud, Outlook)",
                    "Automatic reminders for upcoming events",
                    "Unified view of tasks and calendar schedules"
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
                  {/* Calendar header */}
                  <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-emerald-400" />
                      <span className="text-sm font-semibold text-white">February 2026</span>
                    </div>
                    <span className="text-[11px] text-gray-500">Week view</span>
                  </div>
                  {/* Week grid */}
                  <div className="flex-1 px-4 py-3">
                    <div className="grid grid-cols-5 gap-2 h-full">
                      {[
                        { day: "Mon 3", events: [{ text: "Soccer practice", time: "3:30 PM", color: "bg-blue-500/20 border-blue-500/40 text-blue-300" }, { text: "Groceries", time: "5:00 PM", color: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" }] },
                        { day: "Tue 4", events: [{ text: "Parent-teacher", time: "10:00 AM", color: "bg-purple-500/20 border-purple-500/40 text-purple-300" }] },
                        { day: "Wed 5", events: [{ text: "Dentist — Emma", time: "2:00 PM", color: "bg-pink-500/20 border-pink-500/40 text-pink-300" }, { text: "Piano lesson", time: "4:30 PM", color: "bg-indigo-500/20 border-indigo-500/40 text-indigo-300" }] },
                        { day: "Thu 6", events: [{ text: "Date night", time: "7:00 PM", color: "bg-rose-500/20 border-rose-500/40 text-rose-300" }] },
                        { day: "Fri 7", events: [{ text: "Movie night", time: "6:30 PM", color: "bg-amber-500/20 border-amber-500/40 text-amber-300" }, { text: "Jake sleepover", time: "7:00 PM", color: "bg-cyan-500/20 border-cyan-500/40 text-cyan-300" }] },
                      ].map((d) => (
                        <div key={d.day} className="flex flex-col">
                          <div className="text-[10px] text-gray-500 mb-2 text-center">{d.day}</div>
                          <div className="space-y-1.5 flex-1">
                            {d.events.map((e) => (
                              <div key={e.text} className={`rounded-lg border px-2 py-1.5 ${e.color}`}>
                                <div className="text-[10px] font-medium truncate">{e.text}</div>
                                <div className="text-[9px] opacity-70">{e.time}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
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
              Ready to sync your family?
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
