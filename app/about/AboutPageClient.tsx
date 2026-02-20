'use client';

/**
 * About Page Client Component
 * Tells the story of Rowan — built by a veteran-owned company to solve
 * the "invisible labor" problem in households.
 */

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Heart,
  Users,
  Shield,
  Sparkles,
  Target,
  Scale,
  Brain,
  Mail,
  Award,
} from 'lucide-react';
import { PublicHeader } from '@/components/layout/PublicHeader';
import { Footer } from '@/components/layout/Footer';

export default function AboutPageClient() {
  return (
    <div className="min-h-screen bg-black">
      <PublicHeader />

      <main className="bg-black">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Back Link */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-12"
          >
            <div className="flex items-center gap-3 mb-4">
              <Heart className="w-10 h-10 text-blue-400" />
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">
                Built for Families, by a Family
              </h1>
            </div>
            <p className="text-lg text-gray-300 leading-relaxed">
              Rowan gives families a shared brain — so one person doesn&apos;t have to remember everything.
            </p>
          </motion.div>

          {/* Our Story */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-12"
          >
            <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-400" />
              Our Story
            </h2>
            <div className="space-y-4 text-gray-300">
              <p>
                Rowan was built by{' '}
                <span className="text-white font-medium">Steel Motion LLC</span>, a veteran-owned
                company under the <span className="text-white font-medium">VetSecItPro</span>{' '}
                organization.
              </p>
              <p>
                We created Rowan to solve a problem we experienced firsthand: the &quot;invisible labor&quot;
                problem in households. In almost every home, one person becomes the family secretary —
                remembering appointments, tracking chores, planning meals, managing shopping lists,
                coordinating everyone&apos;s schedules. It&apos;s exhausting, thankless work that creates
                resentment and burnout.
              </p>
              <p>
                We asked ourselves: <span className="italic">Why should one person carry the mental load
                for the entire household?</span>
              </p>
              <p>
                The answer: they shouldn&apos;t. Rowan gives families a shared brain — a single place
                where everyone can see what needs to be done, who&apos;s doing it, and when it&apos;s due.
                No more asking &quot;What&apos;s for dinner?&quot; No more forgotten appointments. No more
                invisible labor.
              </p>
            </div>
          </motion.section>

          {/* Mission */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-12"
          >
            <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
              <Target className="w-6 h-6 text-blue-400" />
              Our Mission
            </h2>
            <div className="p-6 bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border border-blue-800/50 rounded-lg">
              <p className="text-lg text-white font-medium">
                Help every household share the mental load fairly.
              </p>
              <p className="text-gray-300 mt-2">
                Stop one person from being the family&apos;s memory. Make household collaboration
                visible, fair, and stress-free.
              </p>
            </div>
          </motion.section>

          {/* What We Believe */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mb-12"
          >
            <h2 className="text-2xl font-semibold text-white mb-6 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-blue-400" />
              What We Believe
            </h2>
            <div className="space-y-6">
              {/* Privacy First */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-lg bg-purple-900/30 border border-purple-800/50 flex items-center justify-center">
                    <Shield className="w-6 h-6 text-purple-400" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Privacy First</h3>
                  <p className="text-gray-300">
                    Your family data stays yours. We don&apos;t sell your data, we don&apos;t share it
                    with advertisers, and we don&apos;t snoop. Enterprise-grade security protects
                    everything you store in Rowan.
                  </p>
                </div>
              </div>

              {/* Fairness Matters */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-lg bg-emerald-900/30 border border-emerald-800/50 flex items-center justify-center">
                    <Scale className="w-6 h-6 text-emerald-400" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Fairness Matters</h3>
                  <p className="text-gray-300">
                    See who does what with Household Balance. When everyone can see the workload
                    distribution, it&apos;s easier to have honest conversations about sharing
                    responsibilities fairly.
                  </p>
                </div>
              </div>

              {/* AI Should Help, Not Replace */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-lg bg-blue-900/30 border border-blue-800/50 flex items-center justify-center">
                    <Brain className="w-6 h-6 text-blue-400" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">AI Should Help, Not Replace</h3>
                  <p className="text-gray-300">
                    Rowan AI assists with natural conversation — ask it to add tasks, find recipes,
                    or check who&apos;s free tomorrow. But AI doesn&apos;t replace your family&apos;s
                    communication; it enhances it.
                  </p>
                </div>
              </div>

              {/* Built for Real Families */}
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-lg bg-pink-900/30 border border-pink-800/50 flex items-center justify-center">
                    <Users className="w-6 h-6 text-pink-400" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">Built for Real Families</h3>
                  <p className="text-gray-300">
                    Couples, parents, kids, roommates — if you share a household, Rowan works for you.
                    We design for real life, not idealized versions of it.
                  </p>
                </div>
              </div>
            </div>
          </motion.section>

          {/* Veteran-Owned Badge */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mb-12"
          >
            <div className="p-6 bg-gradient-to-br from-amber-900/20 to-orange-900/20 border border-amber-800/50 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <Award className="w-8 h-8 text-amber-400" />
                <h2 className="text-xl font-semibold text-white">Proud Veteran-Owned Business</h2>
              </div>
              <p className="text-gray-300">
                Rowan is built by <span className="text-white font-medium">Steel Motion LLC</span>, a
                veteran-owned company committed to excellence, security, and service. We bring military
                discipline to software development — rigorous testing, zero-compromise security, and a
                mission-first mindset.
              </p>
            </div>
          </motion.section>

          {/* Contact */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="mb-12"
          >
            <h2 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
              <Mail className="w-6 h-6 text-blue-400" />
              Get in Touch
            </h2>
            <div className="space-y-4 text-gray-300">
              <p>
                We&apos;d love to hear from you. Whether you have questions, feedback, or just want
                to say hi, reach out anytime.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href="mailto:contact@steelmotionllc.com"
                  className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg active:scale-95"
                >
                  <Mail className="w-5 h-5" />
                  contact@steelmotionllc.com
                </a>
              </div>
            </div>
          </motion.section>

          {/* Final CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
            className="text-center pt-8 border-t border-gray-800"
          >
            <p className="text-gray-400 mb-4">Ready to share the mental load?</p>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-full transition-all shadow-lg hover:shadow-xl active:scale-95"
            >
              Start Your 14-Day Free Trial
            </Link>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
