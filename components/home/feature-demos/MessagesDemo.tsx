'use client';

import { AnimatedFeatureDemo, DemoStep } from '../AnimatedFeatureDemo';
import { motion } from 'framer-motion';
import { Heart, Pin, MessageCircle } from 'lucide-react';

function FamilyChatStep() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <MessageCircle className="w-4 h-4 text-green-400" />
        <span className="text-sm font-medium text-white">Family Chat</span>
      </div>

      {/* Dad's message */}
      <div className="flex items-start gap-2.5">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, duration: 0.3 }}
          className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
        >
          D
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.3 }}
        >
          <p className="text-xs text-gray-500 mb-1">Dad</p>
          <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-sm bg-gray-800 border border-gray-700/50">
            <p className="text-sm text-gray-200">Running 10 min late from work</p>
          </div>
          <p className="text-[10px] text-gray-600 mt-1 ml-1">5:22 PM</p>
        </motion.div>
      </div>

      {/* Empty input area */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.3 }}
        className="mt-4 flex items-center gap-2 p-2.5 rounded-xl bg-gray-800/60 border border-gray-700/50"
      >
        <div className="flex-1 text-sm text-gray-600">Type a message...</div>
        <div className="w-7 h-7 rounded-full bg-green-500/20 flex items-center justify-center">
          <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
      </motion.div>
    </div>
  );
}

function QuickRepliesStep() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <MessageCircle className="w-4 h-4 text-green-400" />
        <span className="text-sm font-medium text-white">Family Chat</span>
      </div>

      {/* Dad's message */}
      <div className="flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
          D
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">Dad</p>
          <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-sm bg-gray-800 border border-gray-700/50">
            <p className="text-sm text-gray-200">Running 10 min late from work</p>
          </div>
          <p className="text-[10px] text-gray-600 mt-1 ml-1">5:22 PM</p>
        </div>
      </div>

      {/* Mom's reply - right aligned */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="flex items-start gap-2.5 justify-end"
      >
        <div className="text-right">
          <p className="text-xs text-gray-500 mb-1">Mom</p>
          <div className="px-3.5 py-2.5 rounded-2xl rounded-tr-sm bg-green-600/30 border border-green-500/30">
            <p className="text-sm text-gray-200">No worries, dinner at 6:30 then</p>
          </div>
          <p className="text-[10px] text-gray-600 mt-1 mr-1">5:23 PM</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
          M
        </div>
      </motion.div>

      {/* Typing indicator */}
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ delay: 1.5, duration: 0.8 }}
        className="flex items-center gap-2 ml-10"
      >
        <div className="flex gap-1 px-3 py-2 rounded-xl bg-gray-800/60">
          <motion.div
            animate={{ y: [0, -3, 0] }}
            transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
            className="w-1.5 h-1.5 rounded-full bg-gray-500"
          />
          <motion.div
            animate={{ y: [0, -3, 0] }}
            transition={{ repeat: Infinity, duration: 0.6, delay: 0.15 }}
            className="w-1.5 h-1.5 rounded-full bg-gray-500"
          />
          <motion.div
            animate={{ y: [0, -3, 0] }}
            transition={{ repeat: Infinity, duration: 0.6, delay: 0.3 }}
            className="w-1.5 h-1.5 rounded-full bg-gray-500"
          />
        </div>
      </motion.div>
    </div>
  );
}

function ReactToMessagesStep() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <MessageCircle className="w-4 h-4 text-green-400" />
        <span className="text-sm font-medium text-white">Family Chat</span>
      </div>

      {/* Dad's message with reaction */}
      <div className="flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
          D
        </div>
        <div className="relative">
          <p className="text-xs text-gray-500 mb-1">Dad</p>
          <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-sm bg-gray-800 border border-gray-700/50">
            <p className="text-sm text-gray-200">Running 10 min late from work</p>
          </div>
          {/* Heart reaction */}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.6, type: 'spring', stiffness: 400, damping: 15 }}
            className="absolute -bottom-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-gray-700 border border-gray-600"
          >
            <Heart className="w-3 h-3 text-red-400 fill-red-400" />
            <span className="text-[10px] text-gray-400">2</span>
          </motion.div>
        </div>
      </div>

      {/* Mom's reply */}
      <div className="flex items-start gap-2.5 justify-end mt-4">
        <div className="text-right">
          <p className="text-xs text-gray-500 mb-1">Mom</p>
          <div className="px-3.5 py-2.5 rounded-2xl rounded-tr-sm bg-green-600/30 border border-green-500/30">
            <p className="text-sm text-gray-200">No worries, dinner at 6:30 then</p>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
          M
        </div>
      </div>

      {/* Reaction picker hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0, duration: 0.3 }}
        className="flex justify-center"
      >
        <div className="flex gap-1.5 px-3 py-1.5 rounded-full bg-gray-800/80 border border-gray-700/50">
          <span className="text-xs">👍</span>
          <span className="text-xs">❤️</span>
          <span className="text-xs">😂</span>
          <span className="text-xs">👏</span>
          <span className="text-xs">🎉</span>
        </div>
      </motion.div>
    </div>
  );
}

function PinImportantStep() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <MessageCircle className="w-4 h-4 text-green-400" />
        <span className="text-sm font-medium text-white">Family Chat</span>
      </div>

      {/* Pinned message banner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.4, ease: 'easeOut' }}
      >
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/20">
          <Pin className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-green-400/70 font-medium uppercase tracking-wide">Pinned</p>
            <p className="text-sm text-gray-300 truncate">WiFi password: GreenHouse2024</p>
          </div>
        </div>
      </motion.div>

      {/* Chat messages below pinned */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7, duration: 0.3 }}
        className="space-y-3"
      >
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            D
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Dad</p>
            <div className="px-3.5 py-2.5 rounded-2xl rounded-tl-sm bg-gray-800 border border-gray-700/50">
              <p className="text-sm text-gray-200">Running 10 min late from work</p>
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2.5 justify-end">
          <div className="text-right">
            <p className="text-xs text-gray-500 mb-1">Mom</p>
            <div className="px-3.5 py-2.5 rounded-2xl rounded-tr-sm bg-green-600/30 border border-green-500/30">
              <p className="text-sm text-gray-200">No worries, dinner at 6:30 then</p>
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            M
          </div>
        </div>
      </motion.div>
    </div>
  );
}

const steps: DemoStep[] = [
  { label: 'Family chat', content: <FamilyChatStep /> },
  { label: 'Quick replies', content: <QuickRepliesStep /> },
  { label: 'React to messages', content: <ReactToMessagesStep /> },
  { label: 'Pin important info', content: <PinImportantStep /> },
];

export function MessagesDemo({ className = '' }: { className?: string }) {
  return (
    <AnimatedFeatureDemo
      featureName="Messages"
      colorScheme={{
        primary: 'green-500',
        secondary: 'emerald-500',
        gradient: 'from-green-500 to-emerald-500',
      }}
      steps={steps}
      className={className}
    />
  );
}
