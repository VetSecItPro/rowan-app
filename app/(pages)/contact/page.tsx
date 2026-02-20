'use client';

/**
 * Contact Page
 * Public-facing contact page for prospects, partners, press, and security reports
 * Follows dark mode design system with Framer Motion animations
 */

import { PublicHeader } from '@/components/layout/PublicHeader';
import { Footer } from '@/components/layout/Footer';
import { Mail, Handshake, Newspaper, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

const contactCategories = [
  {
    icon: Mail,
    title: 'General Support',
    description: 'Questions about your account, features, or how to use Rowan',
    details: 'For existing users needing help with the app',
    color: 'from-blue-500/10 to-cyan-500/10',
    borderColor: 'border-blue-500/20',
    iconColor: 'text-blue-400',
  },
  {
    icon: Handshake,
    title: 'Sales & Partnerships',
    description: 'Interested in Rowan for your business, school, or organization',
    details: 'Team licenses, enterprise plans, and partnership opportunities',
    color: 'from-emerald-500/10 to-teal-500/10',
    borderColor: 'border-emerald-500/20',
    iconColor: 'text-emerald-400',
  },
  {
    icon: Newspaper,
    title: 'Press & Media',
    description: 'Journalists, bloggers, and reviewers seeking information',
    details: 'Media kits, interviews, and press releases',
    color: 'from-purple-500/10 to-pink-500/10',
    borderColor: 'border-purple-500/20',
    iconColor: 'text-purple-400',
  },
  {
    icon: Shield,
    title: 'Security',
    description: 'Report security vulnerabilities responsibly',
    details: 'We take security seriously and appreciate responsible disclosure',
    color: 'from-red-500/10 to-orange-500/10',
    borderColor: 'border-red-500/20',
    iconColor: 'text-red-400',
  },
];

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
    },
  },
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-black">
      <PublicHeader />

      <main>
        {/* Hero Section */}
        <div className="px-6 py-16 sm:py-24">
          <div className="mx-auto max-w-7xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                Get in Touch
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-400">
                Whether you&apos;re a user needing help, a business exploring partnerships, or a
                journalist covering family tech, we&apos;re here to help.
              </p>
            </motion.div>

            {/* Contact Categories */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              className="mt-16 grid gap-8 sm:grid-cols-2"
            >
              {contactCategories.map((category) => {
                const Icon = category.icon;
                return (
                  <motion.div
                    key={category.title}
                    variants={itemVariants}
                    whileHover={{ scale: 1.02 }}
                    className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${category.color} border ${category.borderColor} p-8 transition-all`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`rounded-xl bg-gray-900/50 p-3 ${category.iconColor}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-white">
                          {category.title}
                        </h3>
                        <p className="mt-2 text-sm text-gray-300">
                          {category.description}
                        </p>
                        <p className="mt-3 text-xs text-gray-400">
                          {category.details}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>

            {/* Contact Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-16 text-center"
            >
              <div className="inline-flex items-center gap-3 rounded-2xl bg-gray-900/50 border border-gray-800 px-8 py-6">
                <Mail className="h-5 w-5 text-gray-400" />
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-400">Email us at</p>
                  <a
                    href="mailto:contact@steelmotionllc.com"
                    className="text-lg font-semibold text-white hover:text-blue-400 transition-colors"
                  >
                    contact@steelmotionllc.com
                  </a>
                </div>
              </div>

              <div className="mt-8 space-y-3">
                <p className="text-sm text-gray-400">
                  We typically respond within 24-48 hours
                </p>
                <p className="text-sm text-gray-500">
                  For faster answers, check our{' '}
                  <a
                    href="/pricing"
                    className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
                  >
                    FAQ
                  </a>
                  {' '}on the pricing page first
                </p>
              </div>
            </motion.div>

            {/* Security Note */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-16 mx-auto max-w-2xl rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 p-6"
            >
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-white">Security Vulnerabilities</h3>
                  <p className="mt-2 text-sm text-gray-300">
                    If you&apos;ve discovered a security issue, please report it responsibly to our
                    security team. We appreciate your help in keeping Rowan safe for all users.
                    Visit our{' '}
                    <a
                      href="/security"
                      className="text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors"
                    >
                      Security page
                    </a>
                    {' '}for detailed reporting guidelines.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
