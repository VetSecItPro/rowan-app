/**
 * FAQSection — Frequently asked questions with expandable answers
 *
 * Accordion pattern with smooth expand/collapse.
 * Keyboard accessible (Enter/Space), aria-expanded.
 */

'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    question: 'Is my family\'s data safe?',
    answer: 'Absolutely. We use industry-standard encryption for all data at rest and in transit. Row-level security ensures your family\'s data is completely isolated. We never sell your data, and we never will.',
  },
  {
    question: 'How many family members can I add?',
    answer: 'The Free plan supports up to 4 members. The Plus plan supports up to 8 members, and the Premium plan supports up to 12 members. Plenty for even the largest households.',
  },
  {
    question: 'What\'s included in the free plan?',
    answer: 'The Free plan includes tasks, a shared calendar, shopping lists, and messaging for up to 4 family members. It\'s a fully functional household manager, not a limited trial.',
  },
  {
    question: 'Can I switch plans later?',
    answer: 'Yes, you can upgrade or downgrade anytime. If you upgrade, you\'ll get immediate access to new features. If you downgrade, your data stays safe and you keep access until the end of your billing period.',
  },
  {
    question: 'Does it work offline?',
    answer: 'Rowan works as a progressive web app (PWA) with offline support for core features. Changes sync automatically when you\'re back online.',
  },
  {
    question: 'What devices are supported?',
    answer: 'Rowan works on any device with a modern browser: phones, tablets, laptops, and desktops. Install it as a PWA for a native app experience on iOS and Android.',
  },
  {
    question: 'Can I export my data?',
    answer: 'Yes. You can export all your data at any time. We believe your data belongs to you, and we\'ll never hold it hostage.',
  },
];

function FAQItem({ question, answer, isOpen, onToggle, index }: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
  index: number;
}) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="border-b border-gray-800/60 last:border-b-0">
      <button
        id={`faq-trigger-${index}`}
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`faq-panel-${index}`}
        className="w-full flex items-center justify-between gap-4 py-5 text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-lg"
      >
        <span className="text-sm sm:text-base font-medium text-white group-hover:text-blue-300 transition-colors">
          {question}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-blue-400' : ''
          }`}
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={`faq-panel-${index}`}
            role="region"
            aria-labelledby={`faq-trigger-${index}`}
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height: 'auto',
              opacity: 1,
              transition: {
                height: { duration: prefersReducedMotion ? 0.01 : 0.25 },
                opacity: { duration: prefersReducedMotion ? 0.01 : 0.2, delay: prefersReducedMotion ? 0 : 0.05 },
              },
            }}
            exit={{
              height: 0,
              opacity: 0,
              transition: {
                height: { duration: prefersReducedMotion ? 0.01 : 0.2 },
                opacity: { duration: prefersReducedMotion ? 0.01 : 0.1 },
              },
            }}
            className="overflow-hidden"
          >
            <p className="text-sm text-gray-400 leading-relaxed pb-5">
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Renders an expandable FAQ section for the landing page. */
export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const prefersReducedMotion = useReducedMotion();

  const handleToggle = useCallback((index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  }, []);

  return (
    <section className="relative py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: prefersReducedMotion ? 0.01 : 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
            Common questions
          </h2>
          <p className="text-gray-400 text-base sm:text-lg">
            Everything you need to know before getting started.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: prefersReducedMotion ? 0.01 : 0.4 }}
          className="bg-gray-900/30 border border-gray-800/40 rounded-2xl px-6"
        >
          {faqs.map((faq, index) => (
            <FAQItem
              key={index}
              index={index}
              question={faq.question}
              answer={faq.answer}
              isOpen={openIndex === index}
              onToggle={() => handleToggle(index)}
            />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
