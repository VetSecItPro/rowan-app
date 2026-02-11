/**
 * TrustSecuritySection — Security & privacy trust signals
 *
 * Replaces the old SocialProofSection. No fake stats.
 * Focuses on encryption, privacy, no data selling, data portability.
 */

'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Shield, Lock, EyeOff, DatabaseZap, Server } from 'lucide-react';
import Link from 'next/link';

const trustPoints = [
  {
    Icon: Lock,
    title: 'Encrypted at rest & in transit',
    description: 'Your data is protected with industry-standard encryption, always.',
  },
  {
    Icon: EyeOff,
    title: 'We never sell your data',
    description: 'No ads, no tracking, no third-party data sharing. Period.',
  },
  {
    Icon: Server,
    title: 'Privacy-first architecture',
    description: 'Row-level security ensures your family only sees your data.',
  },
  {
    Icon: DatabaseZap,
    title: 'Your data is portable',
    description: 'Export everything anytime. No lock-in, no hostage data.',
  },
];

export function TrustSecuritySection() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="relative py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: prefersReducedMotion ? 0.01 : 0.6 }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-5">
            <Shield className="w-7 h-7 text-blue-400" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
            Your family&apos;s data stays{' '}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              yours
            </span>
          </h2>
          <p className="text-gray-400 text-base sm:text-lg max-w-lg mx-auto">
            Built with security and privacy as the foundation, not an afterthought.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {trustPoints.map((point, index) => (
            <motion.div
              key={point.title}
              initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: prefersReducedMotion ? 0.01 : 0.5,
                delay: prefersReducedMotion ? 0 : index * 0.1,
              }}
              className="flex gap-4 p-5 rounded-xl bg-gray-900/40 border border-gray-800/60"
            >
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <point.Icon className="w-5 h-5 text-blue-400" />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white mb-1">
                  {point.title}
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {point.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: prefersReducedMotion ? 0.01 : 0.6, delay: prefersReducedMotion ? 0 : 0.4 }}
          className="text-center mt-8"
        >
          <Link
            href="/security"
            className="text-sm text-blue-400 hover:text-blue-300 transition-colors font-medium"
          >
            Learn more about our security practices &rarr;
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
