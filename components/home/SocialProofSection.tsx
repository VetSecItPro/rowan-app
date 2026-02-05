'use client';

import { motion } from 'framer-motion';
import {
  Shield,
  Award,
  EyeOff,
  WifiOff,
  LayoutGrid,
  Monitor,
  RefreshCw,
  Lock,
  MessageSquare,
} from 'lucide-react';

const trustBadges = [
  {
    icon: Shield,
    label: 'Encrypted & Secure',
    detail: 'TLS in transit, AES-256 at rest',
  },
  {
    icon: Award,
    label: 'Veteran Owned',
    detail: 'Built with discipline and integrity',
  },
  {
    icon: EyeOff,
    label: 'No Ads, Ever',
    detail: 'Your family is not a product',
  },
  {
    icon: WifiOff,
    label: 'Works Offline',
    detail: 'PWA with service worker caching',
  },
];

const productStats = [
  {
    icon: LayoutGrid,
    value: '10 Features',
    description: 'Everything your household needs in one place',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Monitor,
    value: 'All Devices',
    description: 'Phone, tablet, and desktop',
    gradient: 'from-purple-500 to-indigo-500',
  },
  {
    icon: RefreshCw,
    value: 'Real-Time Sync',
    description: 'Changes appear instantly for everyone',
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    icon: Lock,
    value: 'Your Data, Your Control',
    description: 'Export anytime, delete anytime',
    gradient: 'from-amber-500 to-orange-500',
  },
];

const containerVariants = {
  hidden: {},
  visible: {
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
    transition: { duration: 0.5 },
  },
};

export function SocialProofSection() {
  return (
    <section className="relative py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-display font-extrabold tracking-tight text-white mb-4">
            Built by a veteran.{' '}
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Designed for families.
            </span>
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Security, privacy, and reliability are not afterthoughts — they are the foundation.
          </p>
        </motion.div>

        {/* Trust Badges Row */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 mb-16"
        >
          {trustBadges.map((badge) => {
            const Icon = badge.icon;
            return (
              <motion.div
                key={badge.label}
                variants={itemVariants}
                className="group relative rounded-xl bg-gray-800/50 border border-gray-700/50 p-5 text-center hover:border-gray-600/50 transition-colors"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gray-700/50 mb-3 group-hover:bg-gray-700 transition-colors">
                  <Icon className="w-6 h-6 text-blue-400" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">
                  {badge.label}
                </h3>
                <p className="text-xs text-gray-500">{badge.detail}</p>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Product Stats Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-16"
        >
          {productStats.map((stat) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.value}
                variants={itemVariants}
                className="relative rounded-xl bg-gray-800/30 border border-gray-700/30 p-6 text-center"
              >
                {/* Gradient icon */}
                <div
                  className={`inline-flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br ${stat.gradient} p-0.5 mb-4`}
                >
                  <div className="w-full h-full rounded-lg bg-gray-900 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white mb-1">
                  {stat.value}
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {stat.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Future Testimonials Placeholder */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="flex items-center justify-center gap-3 py-6 border-t border-gray-800/50"
        >
          <MessageSquare className="w-4 h-4 text-gray-600" />
          <p className="text-sm text-gray-600 italic">
            Real family stories coming soon
          </p>
        </motion.div>
      </div>
    </section>
  );
}
