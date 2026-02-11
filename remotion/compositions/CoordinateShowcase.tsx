/**
 * CoordinateShowcase — "Coordinate" feature group composition
 *
 * Full-screen scenes showcasing: Messages → Shopping → Meals + AI
 * Each scene fills the entire 1280x720 area with realistic dark-theme UI.
 *
 * Duration: 390 frames @ 30fps = 13 seconds, loops seamlessly.
 */

import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import {
  MessageCircle,
  ShoppingCart,
  UtensilsCrossed,
  Bot,
  Check,
  CheckCheck,
  Heart,
  Sunrise,
  Moon,
  ArrowRight,
} from 'lucide-react';

const SCENE_FRAMES = 130;
const FADE_FRAMES = 14;

function getSceneProgress(frame: number, sceneIndex: number) {
  const sceneStart = sceneIndex * SCENE_FRAMES;
  const localFrame = frame - sceneStart;
  const enterOpacity = interpolate(localFrame, [0, FADE_FRAMES], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const exitOpacity = interpolate(localFrame, [SCENE_FRAMES - FADE_FRAMES, SCENE_FRAMES], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return { opacity: Math.min(enterOpacity, exitOpacity), localFrame, isActive: frame >= sceneStart && frame < sceneStart + SCENE_FRAMES };
}

function staggerIn(frame: number, fps: number, index: number, delay = 4) {
  const p = spring({ frame: Math.max(0, frame - index * delay), fps, config: { damping: 14, stiffness: 80 } });
  return {
    opacity: interpolate(p, [0, 1], [0, 1]),
    transform: `translateY(${interpolate(p, [0, 1], [28, 0])}px)`,
  };
}

// ─── Scene 1: Messages ──────────────────────────────────────────

function MessagesScene({ frame, fps }: { frame: number; fps: number }) {
  const msg1Style = staggerIn(frame, fps, 0, 8);
  const msg2Opacity = interpolate(frame, [24, 32], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const msg2Y = interpolate(frame, [24, 32], [12, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const msg3Opacity = interpolate(frame, [45, 53], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const msg3Y = interpolate(frame, [45, 53], [12, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const readOpacity = interpolate(frame, [58, 64], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const reactionScale = spring({ frame: Math.max(0, frame - 70), fps, config: { damping: 8, stiffness: 200 } });
  const reactionOpacity = interpolate(frame, [68, 75], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <div className="w-full h-full flex flex-col px-16 pt-12 pb-20">
      <div className="flex items-center gap-5 mb-6 pb-5 border-b border-gray-700/40">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/20">
          <MessageCircle className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-[28px] font-bold text-white tracking-tight">Family Chat</h2>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
            <span className="text-base text-green-400">4 members online</span>
          </div>
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

      <div className="flex-1 space-y-5">
        {/* Sarah's message */}
        <div className="flex gap-3" style={msg1Style}>
          <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-white">S</span>
          </div>
          <div>
            <span className="text-sm text-gray-500 mb-1 block">Sarah</span>
            <div className="bg-gray-700/60 text-gray-200 text-[17px] px-5 py-3.5 rounded-3xl rounded-tl-lg">
              Can someone pick up the kids today?
            </div>
          </div>
        </div>

        {/* James's reply */}
        <div className="flex justify-end" style={{ opacity: msg2Opacity, transform: `translateY(${msg2Y}px)` }}>
          <div>
            <div className="bg-emerald-600 text-white text-[17px] px-5 py-3.5 rounded-3xl rounded-br-lg">
              I&apos;ll handle it! Leaving at 2:45
            </div>
            <div className="flex items-center gap-1 justify-end mt-1" style={{ opacity: readOpacity }}>
              <CheckCheck className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-gray-500">Read</span>
            </div>
          </div>
        </div>

        {/* Emma's reply with reaction */}
        <div className="flex gap-3" style={{ opacity: msg3Opacity, transform: `translateY(${msg3Y}px)` }}>
          <div className="w-10 h-10 rounded-full bg-pink-500 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-bold text-white">E</span>
          </div>
          <div className="relative">
            <span className="text-sm text-gray-500 mb-1 block">Emma</span>
            <div className="bg-gray-700/60 text-gray-200 text-[17px] px-5 py-3.5 rounded-3xl rounded-tl-lg">
              Thanks Dad! 💕
            </div>
            <div
              className="absolute -bottom-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-700 border border-gray-600"
              style={{ opacity: reactionOpacity, transform: `scale(${reactionScale})` }}
            >
              <Heart className="w-3 h-3 text-red-400 fill-red-400" />
              <span className="text-xs text-gray-400">2</span>
            </div>
          </div>
        </div>
      </div>

      {/* Input bar */}
      <div className="mt-auto flex items-center gap-3 bg-gray-800/60 rounded-full px-5 py-3.5 border border-gray-700/30">
        <span className="text-base text-gray-500 flex-1">Message family...</span>
        <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center">
          <ArrowRight className="w-5 h-5 text-white" />
        </div>
      </div>
    </div>
  );
}

// ─── Scene 2: Shopping ──────────────────────────────────────────

function ShoppingScene({ frame, fps }: { frame: number; fps: number }) {
  const lists = [
    { name: 'Weekly Groceries', items: 12, done: 5, color: 'bg-emerald-500', active: true },
    { name: 'Costco Run', items: 8, done: 0, color: 'bg-blue-500', active: false },
    { name: 'Party Supplies', items: 6, done: 6, color: 'bg-purple-500', active: false },
  ];

  const groceryItems = [
    { emoji: '🥛', name: 'Whole milk', price: '$4.99', checked: true },
    { emoji: '🍖', name: 'Chicken thighs', price: '$8.99', checked: true },
    { emoji: '🥦', name: 'Broccoli (2)', price: '$3.49', checked: false },
    { emoji: '🍝', name: 'Pasta sauce', price: '$5.49', checked: false },
  ];

  // Item detail slides up
  const detailOpacity = interpolate(frame, [55, 65], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const detailY = interpolate(
    spring({ frame: Math.max(0, frame - 55), fps, config: { damping: 12, stiffness: 80 } }),
    [0, 1], [30, 0],
  );

  return (
    <div className="w-full h-full flex flex-col px-16 pt-12 pb-20">
      <div className="flex items-center gap-5 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <ShoppingCart className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-[28px] font-bold text-white tracking-tight">Shopping Lists</h2>
          <p className="text-base text-gray-500 mt-0.5">3 lists · 26 items total</p>
        </div>
      </div>

      <div className="flex-1 flex gap-6">
        {/* List overview */}
        <div className="flex-1 space-y-3.5">
          {lists.map((list, i) => {
            const style = staggerIn(frame, fps, i, 5);
            const progress = list.done / list.items;
            return (
              <div
                key={list.name}
                className={`px-5 py-4 rounded-2xl border ${
                  list.active ? 'bg-emerald-500/5 border-emerald-500/25' : 'bg-gray-800/50 border-gray-700/40'
                }`}
                style={style}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full ${list.color} flex-shrink-0`} />
                  <span className="flex-1 text-[17px] text-white font-medium">{list.name}</span>
                  {list.done === list.items && (
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                    </div>
                  )}
                  {list.active && (
                    <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-500/15 text-emerald-400">
                      Active
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-2.5">
                  <div className="flex-1 h-2 bg-gray-700/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                      style={{ width: `${progress * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-500">{list.done}/{list.items}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Active list detail */}
        <div
          className="w-[300px] p-5 rounded-2xl bg-gray-800/40 border border-gray-700/30 flex-shrink-0"
          style={{ opacity: detailOpacity, transform: `translateY(${detailY}px)` }}
        >
          <span className="text-sm text-gray-500 font-medium mb-4 block">Weekly Groceries</span>
          <div className="space-y-3">
            {groceryItems.map((item) => (
              <div key={item.name} className="flex items-center gap-3">
                <div
                  className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center ${
                    item.checked ? 'bg-green-500' : 'border-2 border-gray-600'
                  }`}
                >
                  {item.checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </div>
                <span className="text-base">{item.emoji}</span>
                <span className={`flex-1 text-sm ${item.checked ? 'text-gray-500 line-through' : 'text-gray-300'}`}>
                  {item.name}
                </span>
                <span className="text-sm text-gray-500">{item.price}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-gray-700/30 flex items-center justify-between">
            <span className="text-sm text-gray-500">Budget</span>
            <span className="text-base font-bold text-emerald-400">$48.96 / $75</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Scene 3: Meals + AI ────────────────────────────────────────

function MealsAIScene({ frame, fps }: { frame: number; fps: number }) {
  const meals = [
    { type: 'Breakfast', meal: 'Avocado Toast', icon: Sunrise, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', bar: 'bg-orange-400' },
    { type: 'Lunch', meal: 'Chicken Salad', icon: UtensilsCrossed, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', bar: 'bg-yellow-400' },
    { type: 'Dinner', meal: 'Pasta Carbonara', icon: Moon, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', bar: 'bg-indigo-400' },
  ];

  // AI suggestion slides in
  const aiOpacity = interpolate(frame, [65, 75], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const aiX = interpolate(
    spring({ frame: Math.max(0, frame - 65), fps, config: { damping: 14, stiffness: 70 } }),
    [0, 1], [40, 0],
  );

  // Auto shopping list badge
  const shopListOpacity = interpolate(frame, [95, 105], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const shopListScale = spring({ frame: Math.max(0, frame - 95), fps, config: { damping: 10, stiffness: 150 } });

  return (
    <div className="w-full h-full flex flex-col px-16 pt-12 pb-20">
      <div className="flex items-center gap-5 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
          <UtensilsCrossed className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-[28px] font-bold text-white tracking-tight">Today&apos;s Meals</h2>
          <p className="text-base text-gray-500 mt-0.5">Wednesday, Feb 12</p>
        </div>
      </div>

      <div className="flex-1 flex gap-6">
        {/* Meal plan */}
        <div className="flex-1 space-y-4">
          {meals.map((meal, i) => {
            const style = staggerIn(frame, fps, i, 6);
            const Icon = meal.icon;
            return (
              <div key={meal.type} className={`${meal.bg} border ${meal.border} rounded-2xl p-5 relative`} style={style}>
                <div className={`absolute left-5 top-5 bottom-5 w-1 rounded-full ${meal.bar}`} />
                <div className="pl-5 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl ${meal.bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-5 h-5 ${meal.color}`} />
                  </div>
                  <div className="flex-1">
                    <span className={`text-sm ${meal.color} font-semibold`}>{meal.type}</span>
                    <span className="text-[17px] text-white block font-medium">{meal.meal}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Auto shopping list badge */}
          <div
            className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/15"
            style={{ opacity: shopListOpacity, transform: `scale(${shopListScale})` }}
          >
            <ShoppingCart className="w-5 h-5 text-emerald-400" />
            <span className="text-base text-emerald-300 font-medium">Shopping list auto-generated</span>
          </div>
        </div>

        {/* AI suggestion panel */}
        <div
          className="w-[300px] p-5 rounded-2xl bg-gray-800/40 border border-blue-500/20 flex-shrink-0"
          style={{ opacity: aiOpacity, transform: `translateX(${aiX}px)` }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <span className="text-base text-blue-300 font-semibold">Rowan AI</span>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed">
            Based on what&apos;s in your fridge, how about tacos for dinner instead? You already have most of the ingredients.
          </p>
          <div className="mt-4 flex gap-2">
            <div className="px-4 py-2 rounded-full bg-blue-600 text-sm text-white font-medium">Switch to tacos</div>
            <div className="px-4 py-2 rounded-full bg-gray-700 text-sm text-gray-300 font-medium">Keep plan</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Composition ────────────────────────────────────────────

const scenes = [
  { Component: MessagesScene, label: 'Messages', color: 'text-green-400', dotColor: 'bg-green-400' },
  { Component: ShoppingScene, label: 'Shopping Lists', color: 'text-emerald-400', dotColor: 'bg-emerald-400' },
  { Component: MealsAIScene, label: 'Meal Planning', color: 'text-orange-400', dotColor: 'bg-orange-400' },
];

export const CoordinateShowcase: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const currentSceneIndex = Math.min(Math.floor(frame / SCENE_FRAMES), scenes.length - 1);

  return (
    <AbsoluteFill style={{ backgroundColor: '#08080c' }}>
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-[600px] h-[600px] bg-green-500/[0.03] rounded-full blur-[150px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] bg-emerald-500/[0.03] rounded-full blur-[120px]" />
      </div>

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
                className={`h-1.5 rounded-full ${isActive ? scene.dotColor : 'bg-gray-600'}`}
                style={{ width: isActive ? 24 : 6, opacity: isActive ? 1 : 0.3 }}
              />
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
