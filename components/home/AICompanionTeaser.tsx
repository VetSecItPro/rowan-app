/**
 * AICompanionTeaser — Marketing section for the AI companion feature
 *
 * "Just Ask Rowan" — animated chat mockup showing conversational commands,
 * voice wave visualizer, and "Try Rowan AI" CTA.
 * Not gated behind the AI feature flag (this is marketing content).
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Bot, ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';

// ---------------------------------------------------------------------------
// Chat mockup data
// ---------------------------------------------------------------------------

interface MockMessage {
  role: 'user' | 'assistant';
  text: string;
}

const CONVERSATIONS: MockMessage[][] = [
  [
    { role: 'user', text: "What's for dinner tonight?" },
    { role: 'assistant', text: 'Based on your meal plan, tonight is Taco Tuesday! Need me to check your pantry for what to grab?' },
  ],
  [
    { role: 'user', text: 'Can you remind Jake to walk the dog?' },
    { role: 'assistant', text: "Done! Jake will get a reminder at 3:45 PM. I also noticed his chore streak is at 5 days!" },
  ],
];

const CONVO_DURATION = 5000; // 5s per conversation

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/** Renders a teaser section showcasing the AI companion feature on the landing page. */
export function AICompanionTeaser() {
  const prefersReducedMotion = useReducedMotion();
  const [convoIndex, setConvoIndex] = useState(0);
  const [showReply, setShowReply] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isVisibleRef = useRef(true);

  // IntersectionObserver — only animate when visible
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
      },
      { threshold: 0.3 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Conversation cycling
  useEffect(() => {
    if (prefersReducedMotion) return;

    const interval = setInterval(() => {
      if (!isVisibleRef.current) return;
      setShowReply(false);
      setConvoIndex((prev) => (prev + 1) % CONVERSATIONS.length);
    }, CONVO_DURATION);

    return () => clearInterval(interval);
  }, [prefersReducedMotion]);

  // Show reply after a delay (typing simulation)
  useEffect(() => {
    const timer = setTimeout(() => setShowReply(true), 1200);
    return () => clearTimeout(timer);
  }, [convoIndex]);

  const currentConvo = CONVERSATIONS[convoIndex];

  return (
    <section ref={containerRef} className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left — Text */}
          <motion.div
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: prefersReducedMotion ? 0.01 : 0.6 }}
          >
            {/* Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium mb-6">
              <Sparkles className="w-3 h-3" />
              Now Available
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-4">
              Just Ask{' '}
              <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Rowan
              </span>
            </h2>

            <p className="text-gray-400 text-base sm:text-lg max-w-md mb-6">
              Create tasks, check your calendar, plan meals, and manage your household
              , all through natural conversation. Available on every plan.
            </p>

            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold rounded-full transition-all shadow-lg shadow-blue-500/25 active:scale-95 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            >
              Try Rowan AI
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>

          {/* Right — Chat Mockup */}
          <motion.div
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: prefersReducedMotion ? 0.01 : 0.6, delay: 0.15 }}
            className="relative"
          >
            <div className="rounded-2xl border border-gray-700/50 bg-gray-900/80 backdrop-blur-sm p-4 sm:p-5 shadow-xl max-w-sm mx-auto lg:mx-0">
              {/* Chat header */}
              <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-gray-800/50">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="text-sm font-medium text-white">Rowan</div>
                  <div className="text-[10px] text-green-400">Online</div>
                </div>
              </div>

              {/* Messages */}
              <div className="space-y-3 min-h-[120px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={convoIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-3"
                  >
                    {/* User message */}
                    <div className="flex justify-end">
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="bg-blue-600 text-white text-sm px-3.5 py-2 rounded-2xl rounded-br-sm max-w-[80%]"
                      >
                        {currentConvo[0].text}
                      </motion.div>
                    </div>

                    {/* Typing indicator → reply */}
                    {!showReply ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex gap-1 pl-2"
                      >
                        {[0, 1, 2].map((i) => (
                          <motion.span
                            key={i}
                            animate={{ y: [0, -4, 0] }}
                            transition={{
                              duration: 0.5,
                              delay: i * 0.12,
                              repeat: Infinity,
                            }}
                            className="w-1.5 h-1.5 bg-gray-500 rounded-full"
                          />
                        ))}
                      </motion.div>
                    ) : (
                      <div className="flex justify-start">
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                          className="bg-gray-800 text-gray-200 text-sm px-3.5 py-2 rounded-2xl rounded-bl-sm max-w-[85%]"
                        >
                          {currentConvo[1].text}
                        </motion.div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Input mock */}
              <div className="mt-4 flex items-center gap-2 bg-gray-800/50 rounded-full px-3.5 py-2 border border-gray-700/30">
                <span className="text-xs text-gray-400 flex-1">Ask Rowan anything...</span>
                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center">
                  <ArrowRight className="w-3 h-3 text-white" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
