/**
 * OrganizeShowcase — "Organize" feature group composition
 *
 * Full-screen scenes showcasing: Tasks & Chores → Calendar → Reminders
 * Each scene fills the entire 1280x720 area with realistic dark-theme UI.
 *
 * Duration: 390 frames @ 30fps = 13 seconds, loops seamlessly.
 */

import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import {
  CheckSquare,
  Calendar,
  Bell,
  Check,
  Clock,
  RotateCw,
  Users,
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

// ─── Scene 1: Tasks & Chores ─────────────────────────────────────

function TasksChoresScene({ frame, fps }: { frame: number; fps: number }) {
  const tasks = [
    { name: 'Pack school lunches', type: 'Task', typeStyle: 'bg-blue-500/15 text-blue-400', assignee: 'S', done: false },
    { name: 'Vacuum living room', type: 'Chore', typeStyle: 'bg-amber-500/15 text-amber-400', assignee: 'E', done: false },
    { name: 'Fix leaky faucet', type: 'Task', typeStyle: 'bg-blue-500/15 text-blue-400', assignee: 'J', done: false },
    { name: 'Walk the dog', type: 'Chore', typeStyle: 'bg-amber-500/15 text-amber-400', assignee: 'E', done: true },
    { name: 'Do laundry', type: 'Chore', typeStyle: 'bg-amber-500/15 text-amber-400', assignee: 'S', done: false },
  ];

  const CHECK_AT = 60;

  // Chore rotation panel slides in
  const rotationOpacity = interpolate(frame, [75, 85], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const rotationY = interpolate(
    spring({ frame: Math.max(0, frame - 75), fps, config: { damping: 14, stiffness: 70 } }),
    [0, 1], [30, 0],
  );

  return (
    <div className="w-full h-full flex flex-col px-16 pt-12 pb-20">
      <div className="flex items-center gap-5 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <CheckSquare className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-[28px] font-bold text-white tracking-tight">Family Tasks</h2>
          <p className="text-base text-gray-500 mt-0.5">4 remaining · 1 completed</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
          <Users className="w-5 h-5 text-cyan-400" />
          <span className="text-sm text-cyan-300 font-semibold">Family</span>
        </div>
      </div>

      <div className="flex-1 flex gap-6">
        {/* Task list */}
        <div className="flex-1 space-y-3">
          {tasks.map((task, i) => {
            const style = staggerIn(frame, fps, i);
            const isChecked = (i === 0 && frame > CHECK_AT) || task.done;
            const checkScale = i === 0
              ? spring({ frame: Math.max(0, frame - CHECK_AT), fps, config: { damping: 8, stiffness: 200 } })
              : 1;

            return (
              <div
                key={task.name}
                className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl border ${
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
                <span className={`flex-1 text-[17px] font-medium ${isChecked ? 'text-gray-500 line-through' : 'text-white'}`}>
                  {task.name}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${task.typeStyle}`}>{task.type}</span>
                <div className="w-9 h-9 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                  <span className="text-sm font-bold text-blue-300">{task.assignee}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Chore rotation panel */}
        <div
          className="w-[260px] p-5 rounded-2xl bg-gray-800/40 border border-gray-700/30 flex-shrink-0"
          style={{ opacity: rotationOpacity, transform: `translateY(${rotationY}px)` }}
        >
          <div className="flex items-center gap-2.5 mb-4">
            <RotateCw className="w-5 h-5 text-amber-400" />
            <span className="text-base text-white font-semibold">Chore Rotation</span>
          </div>
          <div className="space-y-3">
            {['Emma → Vacuum', 'James → Dishes', 'Sarah → Laundry'].map((r) => (
              <div key={r} className="flex items-center gap-2.5 text-sm text-gray-400">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                {r}
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-gray-700/30 flex items-center gap-2">
            <span className="text-lg">⭐</span>
            <div>
              <span className="text-sm text-amber-300 font-medium">Emma: 15 pts</span>
              <span className="text-xs text-gray-500 block">5-day streak!</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Scene 2: Calendar ───────────────────────────────────────────

function CalendarViewScene({ frame, fps }: { frame: number; fps: number }) {
  const events = [
    { time: '9:00 AM', name: 'Team standup', color: 'text-blue-300', bg: 'bg-blue-500/10', border: 'border-blue-500/20', bar: 'bg-blue-400' },
    { time: '3:00 PM', name: 'Piano lesson (Emma)', color: 'text-purple-300', bg: 'bg-purple-500/10', border: 'border-purple-500/20', bar: 'bg-purple-400' },
    { time: '5:30 PM', name: 'Soccer practice', color: 'text-pink-300', bg: 'bg-pink-500/10', border: 'border-pink-500/20', bar: 'bg-pink-400' },
    { time: '7:00 PM', name: 'Date night', color: 'text-orange-300', bg: 'bg-orange-500/10', border: 'border-orange-500/20', bar: 'bg-orange-400' },
  ];

  // Free day indicator
  const freeOpacity = interpolate(frame, [65, 75], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const freeY = interpolate(
    spring({ frame: Math.max(0, frame - 65), fps, config: { damping: 12, stiffness: 80 } }),
    [0, 1], [20, 0],
  );

  return (
    <div className="w-full h-full flex flex-col px-16 pt-12 pb-20">
      <div className="flex items-center gap-5 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
          <Calendar className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-[28px] font-bold text-white tracking-tight">Family Calendar</h2>
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
          const style = staggerIn(frame, fps, i, 5);
          return (
            <div key={evt.name} className={`${evt.bg} border ${evt.border} rounded-2xl p-5 relative`} style={style}>
              <div className={`absolute left-5 top-5 bottom-5 w-1 rounded-full ${evt.bar}`} />
              <div className="pl-5">
                <span className={`text-[17px] ${evt.color} font-semibold`}>{evt.name}</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-500">{evt.time}</span>
                </div>
              </div>
            </div>
          );
        })}

        {/* Free day indicator */}
        <div
          className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-green-500/5 border border-green-500/15"
          style={{ opacity: freeOpacity, transform: `translateY(${freeY}px)` }}
        >
          <div className="w-3 h-3 rounded-full bg-green-400" />
          <span className="text-base text-green-300 font-medium">Wednesday is free for everyone</span>
        </div>
      </div>
    </div>
  );
}

// ─── Scene 3: Reminders ──────────────────────────────────────────

function RemindersScene({ frame, fps }: { frame: number; fps: number }) {
  const reminders = [
    { text: 'Pick up kids at 3:15 PM', time: 'In 2 hours', urgent: true },
    { text: 'Dentist appointment tomorrow', time: 'Tomorrow, 10:00 AM', urgent: false },
    { text: 'Pay electricity bill', time: 'Due in 3 days', urgent: false },
    { text: 'Emma soccer registration', time: 'Due in 5 days', urgent: false },
  ];

  // Push notification
  const notifOpacity = interpolate(frame, [55, 65], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const notifY = interpolate(
    spring({ frame: Math.max(0, frame - 55), fps, config: { damping: 12, stiffness: 80 } }),
    [0, 1], [-30, 0],
  );

  // Snooze action
  const snoozeOpacity = interpolate(frame, [85, 95], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const snoozeScale = spring({ frame: Math.max(0, frame - 85), fps, config: { damping: 10, stiffness: 150 } });

  return (
    <div className="w-full h-full flex flex-col px-16 pt-12 pb-20">
      <div className="flex items-center gap-5 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg shadow-pink-500/20">
          <Bell className="w-7 h-7 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-[28px] font-bold text-white tracking-tight">Reminders</h2>
          <p className="text-base text-gray-500 mt-0.5">4 upcoming</p>
        </div>
      </div>

      <div className="flex-1 space-y-3.5">
        {reminders.map((r, i) => {
          const style = staggerIn(frame, fps, i, 5);
          return (
            <div
              key={r.text}
              className={`flex items-center gap-4 px-5 py-4 rounded-2xl border ${
                r.urgent ? 'bg-pink-500/5 border-pink-500/25' : 'bg-gray-800/50 border-gray-700/40'
              }`}
              style={style}
            >
              <Bell className={`w-5 h-5 flex-shrink-0 ${r.urgent ? 'text-pink-400' : 'text-gray-500'}`} />
              <div className="flex-1">
                <span className="text-[17px] text-white font-medium">{r.text}</span>
                <span className={`text-sm block mt-0.5 ${r.urgent ? 'text-pink-400' : 'text-gray-500'}`}>{r.time}</span>
              </div>
              {r.urgent && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-pink-500/15 text-pink-400">Urgent</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Push notification toast */}
      <div
        className="absolute top-12 right-16 w-[320px] px-5 py-4 rounded-2xl bg-gray-800/90 border border-pink-500/25 shadow-xl shadow-black/30"
        style={{ opacity: notifOpacity, transform: `translateY(${notifY}px)` }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink-500/20 flex items-center justify-center flex-shrink-0">
            <Bell className="w-5 h-5 text-pink-400" />
          </div>
          <div>
            <span className="text-xs text-gray-500">Rowan Reminder</span>
            <span className="text-sm text-white block font-medium">Pick up kids in 2 hours</span>
          </div>
        </div>
        <div
          className="flex items-center gap-2 mt-3 px-3 py-2 rounded-lg bg-gray-700/50 w-fit"
          style={{ opacity: snoozeOpacity, transform: `scale(${snoozeScale})` }}
        >
          <Clock className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-xs text-gray-300">Snooze 30 min</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main Composition ────────────────────────────────────────────

const scenes = [
  { Component: TasksChoresScene, label: 'Tasks & Chores', color: 'text-cyan-400', dotColor: 'bg-cyan-400' },
  { Component: CalendarViewScene, label: 'Family Calendar', color: 'text-purple-400', dotColor: 'bg-purple-400' },
  { Component: RemindersScene, label: 'Reminders', color: 'text-pink-400', dotColor: 'bg-pink-400' },
];

export const OrganizeShowcase: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const currentSceneIndex = Math.min(Math.floor(frame / SCENE_FRAMES), scenes.length - 1);

  return (
    <AbsoluteFill style={{ backgroundColor: '#08080c' }}>
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-[600px] h-[600px] bg-cyan-500/[0.03] rounded-full blur-[150px]" />
        <div className="absolute bottom-1/3 right-1/4 w-[500px] h-[500px] bg-purple-500/[0.03] rounded-full blur-[120px]" />
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
