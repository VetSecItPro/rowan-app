/**
 * AnimatedProductDemo — Device-framed CSS mockup cycling through demo scenes
 *
 * 4 scenes, 2s each = 8s seamless loop:
 * 1. Task list — items slide in, first checks off
 * 2. Calendar — week grid fades in, events slide into slots
 * 3. Shopping — items appear, first checks off, running total
 * 4. AI Chat — user message + typing dots + assistant response
 *
 * IntersectionObserver pauses when out of viewport.
 * Pauses on hover/touch with 5s resume timer.
 * Respects prefers-reduced-motion (shows static first scene).
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, MotionConfig, useReducedMotion } from 'framer-motion';
import {
  CheckSquare,
  Calendar,
  ShoppingCart,
  Bot,
  Check,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Scene data
// ---------------------------------------------------------------------------

const SCENES = [
  {
    id: 'tasks',
    icon: CheckSquare,
    color: 'text-blue-400',
    title: 'Tasks & Chores',
  },
  {
    id: 'calendar',
    icon: Calendar,
    color: 'text-purple-400',
    title: 'Family Calendar',
  },
  {
    id: 'shopping',
    icon: ShoppingCart,
    color: 'text-emerald-400',
    title: 'Shopping List',
  },
  {
    id: 'chat',
    icon: Bot,
    color: 'text-blue-400',
    title: 'AI Assistant',
  },
] as const;

const SCENE_DURATION = 2000;

// ---------------------------------------------------------------------------
// Individual Scenes
// ---------------------------------------------------------------------------

function TaskScene() {
  const tasks = [
    { label: 'Pack school lunches', done: true },
    { label: 'Schedule vet appointment', done: false },
    { label: 'Fix leaky faucet', done: false },
  ];

  return (
    <div className="space-y-2.5 px-4 py-3">
      <div className="text-xs font-medium text-blue-400 mb-3">Today&apos;s Tasks</div>
      {tasks.map((task, i) => (
        <motion.div
          key={task.label}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.15, duration: 0.3 }}
          className="flex items-center gap-2.5"
        >
          <div
            className={`w-4.5 h-4.5 rounded border flex items-center justify-center shrink-0 ${
              task.done
                ? 'bg-blue-500 border-blue-500'
                : 'border-gray-600 bg-transparent'
            }`}
          >
            {task.done && <Check className="w-3 h-3 text-white" />}
          </div>
          <span
            className={`text-xs ${
              task.done ? 'text-gray-500 line-through' : 'text-gray-200'
            }`}
          >
            {task.label}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

function CalendarScene() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const events = [
    { day: 1, label: 'Soccer', color: 'bg-purple-500/20 text-purple-300' },
    { day: 3, label: 'Dentist', color: 'bg-pink-500/20 text-pink-300' },
  ];

  return (
    <div className="px-4 py-3">
      <div className="text-xs font-medium text-purple-400 mb-3">This Week</div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="grid grid-cols-5 gap-1.5"
      >
        {days.map((d, i) => (
          <div key={d} className="text-center">
            <div className="text-[9px] text-gray-500 mb-1">{d}</div>
            <div className="h-12 rounded bg-gray-800/60 relative flex items-end p-0.5">
              {events
                .filter((e) => e.day === i)
                .map((e) => (
                  <motion.div
                    key={e.label}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.3 }}
                    className={`w-full text-[7px] px-0.5 py-0.5 rounded ${e.color} text-center truncate`}
                  >
                    {e.label}
                  </motion.div>
                ))}
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

function ShoppingScene() {
  const items = [
    { label: 'Milk', price: 4.29, done: true },
    { label: 'Bread', price: 3.49, done: false },
    { label: 'Eggs', price: 5.99, done: false },
  ];

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-medium text-emerald-400">Grocery Run</div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-[10px] text-emerald-300 font-medium"
        >
          $4.29
        </motion.div>
      </div>
      {items.map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.15, duration: 0.25 }}
          className="flex items-center justify-between py-1"
        >
          <div className="flex items-center gap-2">
            <div
              className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center ${
                item.done ? 'bg-emerald-500 border-emerald-500' : 'border-gray-600'
              }`}
            >
              {item.done && <Check className="w-2.5 h-2.5 text-white" />}
            </div>
            <span className={`text-xs ${item.done ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
              {item.label}
            </span>
          </div>
          <span className="text-[10px] text-gray-500">${item.price.toFixed(2)}</span>
        </motion.div>
      ))}
    </div>
  );
}

function ChatScene() {
  return (
    <div className="px-4 py-3 space-y-2.5">
      <div className="text-xs font-medium text-blue-400 mb-3">Rowan AI</div>

      {/* User message */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex justify-end"
      >
        <div className="bg-blue-600 text-white text-[10px] px-2.5 py-1.5 rounded-xl rounded-br-sm max-w-[75%]">
          What&apos;s for dinner tonight?
        </div>
      </motion.div>

      {/* Typing dots */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{ delay: 0.5, duration: 0.8, times: [0, 0.1, 0.8, 1] }}
        className="flex gap-0.5 pl-1"
      >
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            animate={{ y: [0, -3, 0] }}
            transition={{ delay: 0.5 + i * 0.1, duration: 0.4, repeat: 1 }}
            className="w-1 h-1 bg-gray-500 rounded-full"
          />
        ))}
      </motion.div>

      {/* Assistant response */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        className="flex justify-start"
      >
        <div className="bg-gray-800 text-gray-200 text-[10px] px-2.5 py-1.5 rounded-xl rounded-bl-sm max-w-[85%]">
          Based on your meal plan, tonight is Taco Tuesday! I can add toppings to your shopping list.
        </div>
      </motion.div>
    </div>
  );
}

const SCENE_COMPONENTS = [TaskScene, CalendarScene, ShoppingScene, ChatScene];

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function AnimatedProductDemo() {
  const prefersReducedMotion = useReducedMotion();
  const [activeScene, setActiveScene] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isVisibleRef = useRef(true);

  // IntersectionObserver — pause when out of viewport
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

  // Scene cycling interval
  useEffect(() => {
    if (prefersReducedMotion) return;

    const interval = setInterval(() => {
      if (!isPaused && isVisibleRef.current) {
        setActiveScene((prev) => (prev + 1) % SCENES.length);
      }
    }, SCENE_DURATION);

    return () => clearInterval(interval);
  }, [isPaused, prefersReducedMotion]);

  // Pause on hover / touch → resume after 5s
  const handlePause = useCallback(() => {
    setIsPaused(true);
    clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = setTimeout(() => setIsPaused(false), 5000);
  }, []);

  useEffect(() => {
    return () => clearTimeout(resumeTimerRef.current);
  }, []);

  const SceneComponent = SCENE_COMPONENTS[activeScene];

  return (
    <div
      ref={containerRef}
      onMouseEnter={handlePause}
      onTouchStart={handlePause}
      className="relative mx-auto w-[260px] sm:w-[300px] lg:w-[320px]"
      style={{
        perspective: '1000px',
      }}
    >
      {/* Device frame */}
      <div
        className="relative rounded-[2rem] border-[5px] border-gray-700 bg-black shadow-2xl shadow-blue-500/10 overflow-hidden"
        style={{
          transform: prefersReducedMotion ? 'none' : 'rotateY(-2deg)',
        }}
      >
        {/* Status bar */}
        <div className="flex items-center justify-between px-5 py-1.5 bg-black">
          <span className="text-[9px] text-gray-500">9:41</span>
          <div className="w-16 h-4 rounded-full bg-gray-900" />
          <div className="flex gap-0.5">
            <div className="w-3 h-2 rounded-sm bg-gray-600" />
          </div>
        </div>

        {/* Scene title bar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-800/50">
          {(() => {
            const SceneIcon = SCENES[activeScene].icon;
            return <SceneIcon className={`w-3.5 h-3.5 ${SCENES[activeScene].color}`} />;
          })()}
          <span className="text-[11px] font-medium text-white">
            {SCENES[activeScene].title}
          </span>
        </div>

        {/* Scene content */}
        <div className="h-[200px] sm:h-[220px] relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeScene}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: prefersReducedMotion ? 0.01 : 0.3 }}
              className="absolute inset-0"
            >
              <MotionConfig reducedMotion="user">
                <SceneComponent />
              </MotionConfig>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom nav mock */}
        <div className="flex items-center justify-around py-2 border-t border-gray-800/50 bg-gray-900/50">
          {SCENES.map((scene, i) => {
            const Icon = scene.icon;
            return (
              <button
                key={scene.id}
                onClick={() => setActiveScene(i)}
                aria-label={scene.title}
                className={`p-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg ${
                  i === activeScene ? scene.color : 'text-gray-600'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
              </button>
            );
          })}
        </div>

        {/* Home indicator */}
        <div className="flex justify-center py-1.5 bg-black">
          <div className="w-24 h-1 rounded-full bg-gray-700" />
        </div>
      </div>

      {/* Scene indicator dots */}
      <div className="flex justify-center gap-0 mt-4">
        {SCENES.map((scene, i) => (
          <button
            key={i}
            onClick={() => setActiveScene(i)}
            aria-label={`Go to ${scene.title}`}
            className="p-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-full"
          >
            <div
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === activeScene ? 'bg-blue-400 w-4' : 'bg-gray-600 w-1.5'
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
