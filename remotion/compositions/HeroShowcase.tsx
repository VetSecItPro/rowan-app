/**
 * HeroShowcase — Full-screen feature showcase for the hero section
 *
 * Each scene fills the entire 1280x720 area with a realistic, full-bleed app view.
 * Cycles: Tasks → Calendar → Shopping → AI Chat.
 * NO device frames — clean dark UI fills the composition.
 *
 * Duration: 300 frames @ 30fps = 10 seconds, loops seamlessly.
 */

import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import {
  CheckSquare,
  Calendar,
  ShoppingCart,
  Bot,
  Check,
  Clock,
  ArrowRight,
  Users,
} from 'lucide-react';

// ─── Timing ─────────────────────────────────────────────────────
const SCENE_FRAMES = 75;
const FADE_FRAMES = 12;

function getSceneProgress(frame: number, sceneIndex: number) {
  const sceneStart = sceneIndex * SCENE_FRAMES;
  const localFrame = frame - sceneStart;
  const enterOpacity = interpolate(localFrame, [0, FADE_FRAMES], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const exitOpacity = interpolate(
    localFrame,
    [SCENE_FRAMES - FADE_FRAMES, SCENE_FRAMES],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  return {
    opacity: Math.min(enterOpacity, exitOpacity),
    localFrame,
    isActive: frame >= sceneStart && frame < sceneStart + SCENE_FRAMES,
  };
}

/** Staggered spring entrance for list items */
function staggerIn(frame: number, fps: number, index: number, delay = 3) {
  const p = spring({
    frame: Math.max(0, frame - index * delay),
    fps,
    config: { damping: 14, stiffness: 80 },
  });
  return {
    opacity: interpolate(p, [0, 1], [0, 1]),
    transform: `translateY(${interpolate(p, [0, 1], [28, 0])}px)`,
  };
}

// ─── Scene 1: Tasks ──────────────────────────────────────────────

function TasksScene({ frame, fps }: { frame: number; fps: number }) {
  const tasks = [
    { name: 'Pack school lunches', tag: 'High', tagStyle: 'bg-orange-500/15 text-orange-400', assignee: 'S', done: false },
    { name: 'Grocery shopping', tag: 'Medium', tagStyle: 'bg-yellow-500/15 text-yellow-400', assignee: 'D', done: false },
    { name: 'Clean the kitchen', tag: 'High', tagStyle: 'bg-orange-500/15 text-orange-400', assignee: 'E', done: false },
    { name: 'Walk the dog', tag: 'Done', tagStyle: 'bg-green-500/15 text-green-400', assignee: 'J', done: true },
    { name: 'Schedule dentist', tag: 'Low', tagStyle: 'bg-blue-500/15 text-blue-400', assignee: null, done: false },
  ];

  const CHECK_AT = 45;

  return (
    <div className="w-full h-full flex flex-col px-16 pt-12 pb-20">
      <div className="flex items-center gap-5 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <CheckSquare className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-[28px] font-bold text-white tracking-tight">Today&apos;s Tasks</h2>
          <p className="text-base text-gray-500 mt-0.5">4 remaining · 1 completed</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
          <Users className="w-5 h-5 text-cyan-400" />
          <span className="text-sm text-cyan-300 font-semibold">Family</span>
        </div>
      </div>

      <div className="flex-1 space-y-3">
        {tasks.map((task, i) => {
          const style = staggerIn(frame, fps, i);
          const isChecked = (i === 0 && frame > CHECK_AT) || task.done;
          const checkScale =
            i === 0
              ? spring({ frame: Math.max(0, frame - CHECK_AT), fps, config: { damping: 8, stiffness: 200 } })
              : 1;

          return (
            <div
              key={task.name}
              className={`flex items-center gap-4 px-5 py-4 rounded-2xl border ${
                isChecked ? 'bg-gray-800/30 border-gray-700/25' : 'bg-gray-800/50 border-gray-700/40'
              }`}
              style={style}
            >
              <div
                className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center flex-shrink-0 ${
                  isChecked ? 'bg-green-500 border-green-500' : 'border-gray-600'
                }`}
                style={i === 0 && frame > CHECK_AT ? { transform: `scale(${checkScale})` } : undefined}
              >
                {isChecked && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
              </div>
              <span
                className={`flex-1 text-[17px] font-medium ${isChecked ? 'text-gray-500 line-through' : 'text-white'}`}
              >
                {task.name}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${task.tagStyle}`}>{task.tag}</span>
              {task.assignee && (
                <div className="w-9 h-9 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                  <span className="text-sm font-bold text-blue-300">{task.assignee}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Scene 2: Calendar ───────────────────────────────────────────

function CalendarScene({ frame, fps }: { frame: number; fps: number }) {
  const events = [
    { time: '9:00 AM', name: 'Team standup', color: 'text-blue-300', bg: 'bg-blue-500/10', border: 'border-blue-500/20', bar: 'bg-blue-400' },
    { time: '12:30 PM', name: 'Lunch with Mom', color: 'text-green-300', bg: 'bg-green-500/10', border: 'border-green-500/20', bar: 'bg-green-400' },
    { time: '3:00 PM', name: 'Piano lesson (Emma)', color: 'text-purple-300', bg: 'bg-purple-500/10', border: 'border-purple-500/20', bar: 'bg-purple-400' },
    { time: '7:00 PM', name: 'Date night', color: 'text-orange-300', bg: 'bg-orange-500/10', border: 'border-orange-500/20', bar: 'bg-orange-400' },
  ];

  return (
    <div className="w-full h-full flex flex-col px-16 pt-12 pb-20">
      <div className="flex items-center gap-5 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
          <Calendar className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-[28px] font-bold text-white tracking-tight">Today&apos;s Schedule</h2>
          <p className="text-base text-gray-500 mt-0.5">Thursday, February 13</p>
        </div>
        <div className="flex -space-x-2">
          {['S', 'J', 'E'].map((init, i) => (
            <div
              key={init}
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white border-2 border-gray-900 ${
                i === 0 ? 'bg-blue-500' : i === 1 ? 'bg-green-500' : 'bg-pink-500'
              }`}
            >
              {init}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-4">
        {events.map((evt, i) => {
          const style = staggerIn(frame, fps, i, 4);
          return (
            <div
              key={evt.name}
              className={`${evt.bg} border ${evt.border} rounded-2xl p-5 relative`}
              style={style}
            >
              <div className={`absolute left-5 top-5 bottom-5 w-1 rounded-full ${evt.bar}`} />
              <div className="pl-5 flex items-center gap-4">
                <div className="flex-1">
                  <span className={`text-[17px] ${evt.color} font-semibold`}>{evt.name}</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-500">{evt.time}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Scene 3: Shopping ───────────────────────────────────────────

function ShoppingScene({ frame, fps }: { frame: number; fps: number }) {
  const items = [
    { emoji: '🥑', name: 'Avocados (3)', price: '$6.49', checked: false },
    { emoji: '🥛', name: 'Whole milk', price: '$4.99', checked: true },
    { emoji: '🍖', name: 'Chicken breast', price: '$12.98', checked: false },
    { emoji: '🥦', name: 'Broccoli (2)', price: '$3.49', checked: false },
    { emoji: '🍝', name: 'Pasta sauce', price: '$5.49', checked: false },
  ];

  const CHECK_AT = 48;

  return (
    <div className="w-full h-full flex flex-col px-16 pt-12 pb-20">
      <div className="flex items-center gap-5 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <ShoppingCart className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-[28px] font-bold text-white tracking-tight">Weekly Groceries</h2>
          <p className="text-base text-gray-500 mt-0.5">5 items · $33.44</p>
        </div>
        <div className="flex -space-x-2">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-[11px] font-bold text-white border-2 border-gray-900">
            D
          </div>
          <div className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center text-[11px] font-bold text-white border-2 border-gray-900">
            M
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-3">
        {items.map((item, i) => {
          const style = staggerIn(frame, fps, i);
          const isChecked = (i === 2 && frame > CHECK_AT) || item.checked;
          const checkScale =
            i === 2
              ? spring({ frame: Math.max(0, frame - CHECK_AT), fps, config: { damping: 8, stiffness: 200 } })
              : 1;

          return (
            <div
              key={item.name}
              className={`flex items-center gap-4 px-5 py-4 rounded-2xl border ${
                isChecked ? 'bg-gray-800/30 border-gray-700/25' : 'bg-gray-800/50 border-gray-700/40'
              }`}
              style={style}
            >
              <div
                className={`w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center ${
                  isChecked ? 'bg-green-500' : 'border-2 border-gray-600'
                }`}
                style={i === 2 && frame > CHECK_AT ? { transform: `scale(${checkScale})` } : undefined}
              >
                {isChecked && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
              </div>
              <span className="text-xl">{item.emoji}</span>
              <span
                className={`flex-1 text-[17px] font-medium ${isChecked ? 'text-gray-500 line-through' : 'text-white'}`}
              >
                {item.name}
              </span>
              <span className="text-base text-gray-500 font-medium">{item.price}</span>
            </div>
          );
        })}
      </div>

      {/* Running total */}
      <div className="mt-auto pt-4 flex items-center justify-between px-5 py-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
        <span className="text-base text-gray-400 font-medium">Estimated total</span>
        <span className="text-2xl font-bold text-emerald-400">$33.44</span>
      </div>
    </div>
  );
}

// ─── Scene 4: AI Chat ────────────────────────────────────────────

function AIChatScene({ frame, fps }: { frame: number; fps: number }) {
  const userMsgOpacity = interpolate(frame, [6, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const userMsgY = interpolate(frame, [6, 12], [12, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const dotsOpacity = interpolate(frame, [16, 20, 35, 38], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const replyOpacity = interpolate(frame, [38, 44], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const replyY = interpolate(frame, [38, 44], [12, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div className="w-full h-full flex flex-col px-16 pt-12 pb-20">
      {/* Header */}
      <div className="flex items-center gap-5 mb-6 pb-5 border-b border-gray-700/40">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Bot className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-[28px] font-bold text-white tracking-tight">Rowan AI</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
            <span className="text-base text-green-400">Online</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-5">
        {/* User message */}
        <div className="flex justify-end" style={{ opacity: userMsgOpacity, transform: `translateY(${userMsgY}px)` }}>
          <div className="bg-blue-600 text-white text-[17px] px-5 py-3.5 rounded-3xl rounded-br-lg max-w-[75%]">
            What&apos;s for dinner tonight?
          </div>
        </div>

        {/* Typing dots */}
        <div className="flex gap-1.5 pl-3" style={{ opacity: dotsOpacity }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2.5 h-2.5 bg-gray-500 rounded-full"
              style={{ transform: `translateY(${Math.sin(frame * 0.3 + i * 1.2) * 4}px)` }}
            />
          ))}
        </div>

        {/* AI reply */}
        <div className="flex justify-start" style={{ opacity: replyOpacity, transform: `translateY(${replyY}px)` }}>
          <div className="bg-gray-700/60 text-gray-200 text-[17px] px-5 py-3.5 rounded-3xl rounded-bl-lg max-w-[85%] leading-relaxed">
            Based on your meal plan, tonight is Taco Tuesday! Need me to add toppings to your shopping list?
          </div>
        </div>
      </div>

      {/* Input bar */}
      <div className="mt-auto flex items-center gap-3 bg-gray-800/60 rounded-full px-5 py-3.5 border border-gray-700/30">
        <span className="text-base text-gray-500 flex-1">Ask Rowan anything...</span>
        <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
          <ArrowRight className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}

// ─── Main Composition ────────────────────────────────────────────

const scenes = [
  { Component: TasksScene, label: 'Tasks & Chores', color: 'text-cyan-400', dotColor: 'bg-cyan-400' },
  { Component: CalendarScene, label: 'Family Calendar', color: 'text-purple-400', dotColor: 'bg-purple-400' },
  { Component: ShoppingScene, label: 'Shopping Lists', color: 'text-emerald-400', dotColor: 'bg-emerald-400' },
  { Component: AIChatScene, label: 'AI Assistant', color: 'text-blue-400', dotColor: 'bg-blue-400' },
];

export const HeroShowcase: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const currentSceneIndex = Math.min(Math.floor(frame / SCENE_FRAMES), scenes.length - 1);

  return (
    <AbsoluteFill style={{ backgroundColor: '#08080c' }}>
      {/* Subtle ambient glow */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-[600px] h-[600px] bg-blue-500/[0.04] rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/3 w-[500px] h-[500px] bg-purple-500/[0.04] rounded-full blur-[120px]" />
      </div>

      {/* Scenes */}
      {scenes.map((scene, i) => {
        const { opacity, localFrame, isActive } = getSceneProgress(frame, i);
        if (!isActive) return null;
        const SceneComp = scene.Component;
        return (
          <AbsoluteFill key={i} style={{ opacity }}>
            <SceneComp frame={localFrame} fps={fps} />
          </AbsoluteFill>
        );
      })}

      {/* Scene label + indicator dots */}
      <div className="absolute bottom-5 left-0 right-0 flex flex-col items-center gap-2.5">
        <span className={`text-sm font-medium tracking-wider ${scenes[currentSceneIndex].color} opacity-60`}>
          {scenes[currentSceneIndex].label}
        </span>
        <div className="flex gap-2">
          {scenes.map((scene, i) => {
            const isActive = i === currentSceneIndex;
            return (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${isActive ? scene.dotColor : 'bg-gray-600'}`}
                style={{ width: isActive ? 24 : 6, opacity: isActive ? 1 : 0.3 }}
              />
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
