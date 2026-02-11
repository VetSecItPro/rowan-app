/**
 * GrowShowcase — "Grow" feature group composition
 *
 * Full-screen scenes showcasing: Budget → Goals → Check-In
 * Each scene fills the entire 1280x720 area with realistic dark-theme UI.
 *
 * Duration: 390 frames @ 30fps = 13 seconds, loops seamlessly.
 */

import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import {
  DollarSign,
  Target,
  Heart,
  Check,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  Zap,
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

// ─── Scene 1: Budget ────────────────────────────────────────────

function BudgetScene({ frame, fps }: { frame: number; fps: number }) {
  const categories = [
    { name: 'Groceries', spent: 420, budget: 500, color: 'from-emerald-500 to-emerald-400', textColor: 'text-emerald-400' },
    { name: 'Dining Out', spent: 180, budget: 150, color: 'from-red-500 to-red-400', textColor: 'text-red-400', over: true },
    { name: 'Entertainment', spent: 85, budget: 200, color: 'from-blue-500 to-blue-400', textColor: 'text-blue-400' },
    { name: 'Transport', spent: 120, budget: 150, color: 'from-purple-500 to-purple-400', textColor: 'text-purple-400' },
  ];

  const barProgress = interpolate(frame, [15, 45], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Alert slides in
  const alertOpacity = interpolate(frame, [70, 80], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const alertY = interpolate(
    spring({ frame: Math.max(0, frame - 70), fps, config: { damping: 12, stiffness: 80 } }),
    [0, 1], [-30, 0],
  );

  return (
    <div className="w-full h-full flex flex-col px-16 pt-12 pb-20">
      <div className="flex items-center gap-5 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
          <DollarSign className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-[28px] font-bold text-white tracking-tight">February Budget</h2>
          <p className="text-base text-gray-500 mt-0.5">18 days remaining</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Budget', value: '$3,200', color: 'text-white' },
          { label: 'Spent', value: '$2,180', color: 'text-amber-400' },
          { label: 'Remaining', value: '$1,020', color: 'text-green-400' },
        ].map((stat, i) => {
          const style = staggerIn(frame, fps, i, 3);
          return (
            <div key={stat.label} className="p-4 rounded-2xl bg-gray-800/50 border border-gray-700/40 text-center" style={style}>
              <span className="text-sm text-gray-500 block">{stat.label}</span>
              <span className={`text-xl font-bold ${stat.color}`}>{stat.value}</span>
            </div>
          );
        })}
      </div>

      {/* Overall progress */}
      <div className="h-3 bg-gray-700/50 rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
          style={{ width: `${68 * barProgress}%` }}
        />
      </div>

      {/* Categories */}
      <div className="flex-1 space-y-4">
        {categories.map((cat, i) => {
          const style = staggerIn(frame, fps, i + 3, 4);
          const pct = Math.min((cat.spent / cat.budget) * barProgress, cat.spent / cat.budget);
          return (
            <div key={cat.name} style={style}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-base text-gray-300 font-medium">{cat.name}</span>
                <span className={`text-sm font-medium ${cat.over ? 'text-red-400' : 'text-gray-500'}`}>
                  ${cat.spent} / ${cat.budget}
                </span>
              </div>
              <div className="h-2.5 bg-gray-700/50 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${cat.color} rounded-full`}
                  style={{ width: `${Math.min(pct * 100, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Over-budget alert */}
      <div
        className="absolute top-12 right-16 px-5 py-3.5 rounded-2xl bg-gray-800/90 border border-red-500/25 flex items-center gap-3 shadow-xl shadow-black/30"
        style={{ opacity: alertOpacity, transform: `translateY(${alertY}px)` }}
      >
        <AlertTriangle className="w-5 h-5 text-red-400" />
        <span className="text-sm text-red-300 font-medium">Dining Out is $30 over budget</span>
      </div>
    </div>
  );
}

// ─── Scene 2: Goals ─────────────────────────────────────────────

function GoalsScene({ frame, fps }: { frame: number; fps: number }) {
  const goals = [
    { name: 'Emergency Fund', target: '$10,000', current: '$7,500', progress: 75, color: 'from-green-400 to-green-500' },
    { name: 'Family Vacation', target: '$3,000', current: '$1,200', progress: 40, color: 'from-blue-400 to-blue-500' },
    { name: 'New Kitchen', target: '$15,000', current: '$2,250', progress: 15, color: 'from-indigo-400 to-indigo-500' },
  ];

  const barProgress = interpolate(frame, [12, 40], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // Contribution card
  const contribOpacity = interpolate(frame, [65, 75], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const contribY = interpolate(
    spring({ frame: Math.max(0, frame - 65), fps, config: { damping: 12, stiffness: 80 } }),
    [0, 1], [30, 0],
  );

  // Milestone badge
  const milestoneOpacity = interpolate(frame, [90, 100], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const milestoneScale = spring({ frame: Math.max(0, frame - 90), fps, config: { damping: 8, stiffness: 200 } });

  return (
    <div className="w-full h-full flex flex-col px-16 pt-12 pb-20">
      <div className="flex items-center gap-5 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Target className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-[28px] font-bold text-white tracking-tight">Family Goals</h2>
          <p className="text-base text-gray-500 mt-0.5">3 active goals</p>
        </div>
      </div>

      <div className="flex-1 space-y-5">
        {goals.map((goal, i) => {
          const style = staggerIn(frame, fps, i, 6);
          const animatedProgress = goal.progress * barProgress;
          return (
            <div key={goal.name} className="px-5 py-5 rounded-2xl bg-gray-800/50 border border-gray-700/40" style={style}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[17px] text-white font-semibold">{goal.name}</span>
                <span className="text-sm text-gray-400">{goal.current} / {goal.target}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-3 bg-gray-700/50 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${goal.color} rounded-full`}
                    style={{ width: `${animatedProgress}%` }}
                  />
                </div>
                <span className="text-sm text-gray-500 w-10 text-right">{Math.round(animatedProgress)}%</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Contribution card */}
      <div
        className="mt-4 flex items-center justify-between px-5 py-4 rounded-2xl bg-green-500/5 border border-green-500/15"
        style={{ opacity: contribOpacity, transform: `translateY(${contribY}px)` }}
      >
        <span className="text-base text-gray-400">Latest contribution</span>
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-green-400">+$250</span>
          <span className="text-sm text-gray-500">to Emergency Fund</span>
        </div>
      </div>

      {/* Milestone badge */}
      <div
        className="absolute top-12 right-16 px-5 py-3.5 rounded-2xl bg-gray-800/90 border border-indigo-500/25 flex items-center gap-3 shadow-xl shadow-black/30"
        style={{ opacity: milestoneOpacity, transform: `scale(${milestoneScale})` }}
      >
        <TrendingUp className="w-5 h-5 text-indigo-400" />
        <div>
          <span className="text-sm text-indigo-300 font-semibold">75% Milestone!</span>
          <span className="text-xs text-gray-500 block">Emergency Fund</span>
        </div>
      </div>
    </div>
  );
}

// ─── Scene 3: Check-In ──────────────────────────────────────────

function CheckInScene({ frame, fps }: { frame: number; fps: number }) {
  const moods = [
    { emoji: '😢', label: 'Low' },
    { emoji: '😕', label: 'Meh' },
    { emoji: '😊', label: 'Good' },
    { emoji: '😄', label: 'Great' },
    { emoji: '🤩', label: 'Amazing' },
  ];
  const selectedMood = 3;
  const MOOD_SELECT_AT = 35;

  const familyMembers = [
    { name: 'Sarah', initial: 'S', color: 'bg-blue-500/30 border-blue-500/40 text-blue-300', mood: '😊', energy: 4 },
    { name: 'James', initial: 'J', color: 'bg-green-500/30 border-green-500/40 text-green-300', mood: '😄', energy: 3 },
    { name: 'Emma', initial: 'E', color: 'bg-pink-500/30 border-pink-500/40 text-pink-300', mood: '🤩', energy: 5 },
  ];

  const moodScale = spring({ frame: Math.max(0, frame - MOOD_SELECT_AT), fps, config: { damping: 8, stiffness: 200 } });

  // Family wellness panel
  const familyOpacity = interpolate(frame, [65, 75], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const familyX = interpolate(
    spring({ frame: Math.max(0, frame - 65), fps, config: { damping: 14, stiffness: 70 } }),
    [0, 1], [40, 0],
  );

  // Streak badge
  const streakOpacity = interpolate(frame, [95, 105], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const streakScale = spring({ frame: Math.max(0, frame - 95), fps, config: { damping: 8, stiffness: 200 } });

  return (
    <div className="w-full h-full flex flex-col px-16 pt-12 pb-20">
      <div className="flex items-center gap-5 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-500 to-rose-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
          <Heart className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-[28px] font-bold text-white tracking-tight">Daily Check-In</h2>
          <p className="text-base text-gray-500 mt-0.5">How are you feeling today?</p>
        </div>
      </div>

      <div className="flex-1 flex gap-6">
        {/* Check-in form */}
        <div className="flex-1">
          {/* Mood selector */}
          <div className="flex justify-center gap-5 mb-8">
            {moods.map((mood, i) => {
              const moodItemStyle = staggerIn(frame, fps, i, 3);
              const isSelected = i === selectedMood && frame > MOOD_SELECT_AT;
              return (
                <div key={mood.label} className="text-center" style={moodItemStyle}>
                  <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl ${
                      isSelected
                        ? 'bg-yellow-500/20 border-2 border-yellow-400/50'
                        : 'bg-gray-800 border-2 border-gray-700'
                    }`}
                    style={isSelected ? { transform: `scale(${moodScale})` } : undefined}
                  >
                    {mood.emoji}
                  </div>
                  <span className={`text-sm mt-2 block ${isSelected ? 'text-yellow-400 font-semibold' : 'text-gray-500'}`}>
                    {mood.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Energy level */}
          <div className="p-5 rounded-2xl bg-gray-800/50 border border-gray-700/40 mb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-base text-gray-400">Energy Level</span>
              <div className="flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-orange-400" />
                <span className="text-sm text-orange-400 font-semibold">High</span>
              </div>
            </div>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((level) => {
                const barOpacity = interpolate(frame, [22 + level * 3, 28 + level * 3], [0, 1], {
                  extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
                });
                return (
                  <div
                    key={level}
                    className={`h-5 flex-1 rounded ${level <= 4 ? 'bg-orange-500/60' : 'bg-gray-700'}`}
                    style={{ opacity: barOpacity }}
                  />
                );
              })}
            </div>
          </div>

          {/* Check-in recorded */}
          {frame > MOOD_SELECT_AT + 10 && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-green-900/10 border border-green-500/20">
              <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center">
                <Check className="w-4 h-4 text-white" strokeWidth={3} />
              </div>
              <span className="text-base text-green-300 font-medium">Check-in recorded</span>
            </div>
          )}
        </div>

        {/* Family wellness panel */}
        <div
          className="w-[280px] p-5 rounded-2xl bg-gray-800/40 border border-gray-700/30 flex-shrink-0"
          style={{ opacity: familyOpacity, transform: `translateX(${familyX}px)` }}
        >
          <span className="text-sm text-gray-500 font-medium mb-4 block">Family Wellness</span>
          <div className="space-y-4">
            {familyMembers.map((member) => (
              <div key={member.name} className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full ${member.color} border flex items-center justify-center flex-shrink-0`}>
                  <span className="text-sm font-semibold">{member.initial}</span>
                </div>
                <span className="text-sm text-gray-300 flex-1">{member.name}</span>
                <span className="text-lg">{member.mood}</span>
                <div className="flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-orange-400" />
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`w-2 h-4 rounded-sm ${level <= member.energy ? 'bg-orange-400/70' : 'bg-gray-700'}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Streak badge */}
      <div
        className="absolute top-12 right-16 px-5 py-3.5 rounded-2xl bg-gray-800/90 border border-orange-500/25 shadow-xl shadow-black/30"
        style={{ opacity: streakOpacity, transform: `scale(${streakScale})` }}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-orange-400" />
          <span className="text-sm text-orange-300 font-bold">12-day streak!</span>
          <Sparkles className="w-5 h-5 text-orange-400" />
        </div>
      </div>
    </div>
  );
}

// ─── Main Composition ────────────────────────────────────────────

const scenes = [
  { Component: BudgetScene, label: 'Budget Tracking', color: 'text-amber-400', dotColor: 'bg-amber-400' },
  { Component: GoalsScene, label: 'Family Goals', color: 'text-indigo-400', dotColor: 'bg-indigo-400' },
  { Component: CheckInScene, label: 'Check-Ins', color: 'text-rose-400', dotColor: 'bg-rose-400' },
];

export const GrowShowcase: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const currentSceneIndex = Math.min(Math.floor(frame / SCENE_FRAMES), scenes.length - 1);

  return (
    <AbsoluteFill style={{ backgroundColor: '#08080c' }}>
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-[600px] h-[600px] bg-amber-500/[0.03] rounded-full blur-[150px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] bg-indigo-500/[0.03] rounded-full blur-[120px]" />
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
