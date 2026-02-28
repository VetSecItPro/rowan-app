/**
 * OverviewMontage — "What is Rowan?" marketing video
 *
 * Uses actual app screenshots with cross-dissolve transitions
 * that feel like navigating between pages (sidebar click effect).
 *
 * Scenes overlap by OVERLAP frames, creating a seamless weave
 * where the outgoing page slides left + fades while the incoming
 * page slides in from the right.
 *
 * Duration: ~25s @ 30fps, 1920x1080 (Full HD)
 */

import {
  AbsoluteFill,
  Img,
  Sequence,
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
  staticFile,
} from 'remotion';

/* ─── Scene config ──────────────────────────────────────── */

interface SceneConfig {
  image: string;
  label: string;
  /** How long this scene is visible (including overlap on both ends) */
  duration: number;
}

const INTRO_DURATION = 45; // 1.5s — logo + tagline visible from frame 0
const OUTRO_DURATION = 90; // 3s
const OVERLAP = 12; // frames of cross-dissolve between scenes

const SCENES: SceneConfig[] = [
  { image: 'dashboard.png', label: 'Your Command Center', duration: 80 },
  { image: 'tasks.png', label: 'Tasks & Chores', duration: 60 },
  { image: 'calendar.png', label: 'Calendar', duration: 60 },
  { image: 'reminders.png', label: 'Reminders', duration: 60 },
  { image: 'messages.png', label: 'Messages', duration: 60 },
  { image: 'meals.png', label: 'Meal Planning', duration: 60 },
  { image: 'shopping.png', label: 'Shopping Lists', duration: 60 },
  { image: 'projects.png', label: 'Projects & Budget', duration: 60 },
  { image: 'goals.png', label: 'Goals & Milestones', duration: 60 },
];

/* ─── Brand colors ──────────────────────────────────────── */

const BRAND = {
  bg: '#0a0a0a',
  accent: '#10b981',
  accentAlt: '#14b8a6',
  purple: '#7c3aed',
  blue: '#2563eb',
  text: '#ffffff',
  textMuted: '#a1a1aa',
};

/* ─── Sidebar icon colors (matches Rowan's actual sidebar) ── */

const SCENE_COLORS: Record<string, string> = {
  'dashboard.png': '#10b981',
  'tasks.png': '#3b82f6',
  'calendar.png': '#a855f7',
  'reminders.png': '#ec4899',
  'messages.png': '#22c55e',
  'meals.png': '#f97316',
  'shopping.png': '#10b981',
  'projects.png': '#f59e0b',
  'goals.png': '#6366f1',
};

/* ─── Intro Scene ───────────────────────────────────────── */

const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Quick subtle scale-in — visible from frame 0, settles by frame 8
  const logoScale = spring({
    frame,
    fps,
    config: { damping: 15, mass: 0.4, stiffness: 200 },
    from: 0.9,
    to: 1,
  });

  // Tagline slides up slightly — very fast, visible almost immediately
  const taglineY = interpolate(frame, [0, 6], [8, 0], {
    extrapolateRight: 'clamp',
  });
  const taglineOpacity = interpolate(frame, [0, 6], [0.7, 1], {
    extrapolateRight: 'clamp',
  });

  // Glow pulses gently
  const glowIntensity = interpolate(frame, [0, 15, 30], [0.3, 0.6, 0.3], {
    extrapolateRight: 'clamp',
  });

  // Exit: fade + scale down at end
  const exitProgress = interpolate(frame, [30, 45], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const exitScale = interpolate(exitProgress, [0, 1], [1, 0.95]);
  const exitOpacity = interpolate(exitProgress, [0, 1], [1, 0]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BRAND.bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        opacity: exitOpacity,
        transform: `scale(${exitScale})`,
      }}
    >
      <div
        style={{
          transform: `scale(${logoScale})`,
          filter: `drop-shadow(0 0 ${30 * glowIntensity}px ${BRAND.accent})`,
        }}
      >
        <Img
          src={staticFile('rowan-logo.png')}
          style={{ width: 140, height: 140, borderRadius: 28 }}
        />
      </div>

      <div
        style={{
          fontSize: 72,
          fontWeight: 800,
          fontFamily: 'Plus Jakarta Sans, sans-serif',
          background: `linear-gradient(90deg, ${BRAND.purple}, ${BRAND.blue})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: -1,
        }}
      >
        Rowan
      </div>

      <div
        style={{
          opacity: taglineOpacity,
          transform: `translateY(${taglineY}px)`,
          fontSize: 28,
          fontWeight: 400,
          fontFamily: 'Playfair Display, serif',
          color: BRAND.textMuted,
          letterSpacing: 2,
        }}
      >
        Your Life. Organized.
      </div>
    </AbsoluteFill>
  );
};

/* ─── Screenshot Scene (with weaving transitions) ────────── */

const ScreenshotScene: React.FC<{
  image: string;
  label: string;
  duration: number;
  isFirst: boolean;
  isLast: boolean;
}> = ({ image, label, duration, isFirst, isLast }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sceneColor = SCENE_COLORS[image] || BRAND.accent;

  // ── ENTER transition: slide in from right ──
  const enterSpring = spring({
    frame,
    fps,
    config: { damping: 18, mass: 0.7, stiffness: 100 },
  });
  const enterX = isFirst
    ? interpolate(enterSpring, [0, 1], [60, 0])
    : interpolate(enterSpring, [0, 1], [1920, 0]); // full slide from right
  const enterOpacity = interpolate(frame, [0, 8], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // ── EXIT transition: slide out to left ──
  const exitStart = duration - OVERLAP;
  const exitSpring = spring({
    frame: Math.max(0, frame - exitStart),
    fps,
    config: { damping: 18, mass: 0.7, stiffness: 100 },
  });
  const exitX = isLast
    ? 0
    : frame >= exitStart
      ? interpolate(exitSpring, [0, 1], [0, -1920])
      : 0;
  const exitOpacity = isLast
    ? interpolate(frame, [duration - 10, duration], [1, 0], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
    : frame >= exitStart
      ? interpolate(exitSpring, [0, 1], [1, 0])
      : 1;

  // Combine enter + exit
  const translateX = frame < OVERLAP ? enterX : exitX;
  const opacity = frame < OVERLAP ? enterOpacity : exitOpacity;

  // Gentle Ken Burns zoom throughout
  const scale = interpolate(frame, [0, duration], [1.03, 1.0], {
    extrapolateRight: 'clamp',
  });

  // ── Label pill ──
  const labelEnter = interpolate(frame, [8, 18], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const labelExit = interpolate(
    frame,
    [duration - OVERLAP - 10, duration - OVERLAP],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const labelOpacity = Math.min(labelEnter, labelExit);
  const labelY = interpolate(frame, [8, 18], [12, 0], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg }}>
      {/* Screenshot layer */}
      <AbsoluteFill
        style={{
          opacity,
          transform: `translateX(${translateX}px) scale(${scale})`,
        }}
      >
        <Img
          src={staticFile(`remotion-assets/${image}`)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      </AbsoluteFill>

      {/* Label overlay at bottom-center */}
      <div
        style={{
          position: 'absolute',
          bottom: 44,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          opacity: labelOpacity,
          transform: `translateY(${labelY}px)`,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(16px)',
            borderRadius: 14,
            padding: '10px 28px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            border: `1px solid rgba(255, 255, 255, 0.08)`,
            boxShadow: `0 0 20px rgba(0,0,0,0.5), 0 0 40px ${sceneColor}22`,
          }}
        >
          {/* Colored dot matching the feature */}
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: sceneColor,
              boxShadow: `0 0 6px ${sceneColor}`,
            }}
          />
          <span
            style={{
              fontSize: 20,
              fontWeight: 600,
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              color: BRAND.text,
              letterSpacing: 0.3,
            }}
          >
            {label}
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ─── Outro Scene ───────────────────────────────────────── */

const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoScale = spring({
    frame,
    fps,
    config: { damping: 14, mass: 0.5 },
  });

  const taglineOpacity = interpolate(frame, [15, 30], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const ctaOpacity = interpolate(frame, [35, 50], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const ctaY = interpolate(frame, [35, 50], [15, 0], {
    extrapolateRight: 'clamp',
  });

  const lineWidth = interpolate(frame, [10, 40], [0, 200], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: BRAND.bg,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          transform: `scale(${logoScale})`,
        }}
      >
        <Img
          src={staticFile('rowan-logo.png')}
          style={{ width: 80, height: 80, borderRadius: 16 }}
        />
        <span
          style={{
            fontSize: 56,
            fontWeight: 800,
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            background: `linear-gradient(90deg, ${BRAND.purple}, ${BRAND.blue})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Rowan
        </span>
      </div>

      <div
        style={{
          height: 2,
          width: lineWidth,
          background: `linear-gradient(90deg, ${BRAND.accent}, ${BRAND.accentAlt})`,
          borderRadius: 1,
        }}
      />

      <div
        style={{
          opacity: taglineOpacity,
          fontSize: 32,
          fontWeight: 400,
          fontFamily: 'Playfair Display, serif',
          color: BRAND.text,
          letterSpacing: 3,
        }}
      >
        Your Life. Organized.
      </div>

      <div
        style={{
          opacity: ctaOpacity,
          transform: `translateY(${ctaY}px)`,
          marginTop: 16,
        }}
      >
        <div
          style={{
            background: `linear-gradient(135deg, ${BRAND.accent}, ${BRAND.accentAlt})`,
            borderRadius: 12,
            padding: '14px 36px',
            fontSize: 20,
            fontWeight: 700,
            fontFamily: 'Plus Jakarta Sans, sans-serif',
            color: BRAND.bg,
            letterSpacing: 0.5,
          }}
        >
          Try Free at rowanapp.com
        </div>
      </div>
    </AbsoluteFill>
  );
};

/* ─── Main Composition ──────────────────────────────────── */

export const OverviewMontage: React.FC = () => {
  // Build timeline with overlapping scenes
  const timeline: { start: number; duration: number; config: SceneConfig; isFirst: boolean; isLast: boolean }[] = [];
  let cursor = INTRO_DURATION - OVERLAP; // first scene overlaps intro exit

  for (let i = 0; i < SCENES.length; i++) {
    const scene = SCENES[i];
    timeline.push({
      start: cursor,
      duration: scene.duration,
      config: scene,
      isFirst: i === 0,
      isLast: i === SCENES.length - 1,
    });
    // Next scene starts OVERLAP frames before this one ends
    cursor += scene.duration - OVERLAP;
  }

  const outroStart = cursor;
  const _totalDuration = outroStart + OUTRO_DURATION;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg }}>
      {/* Intro */}
      <Sequence from={0} durationInFrames={INTRO_DURATION}>
        <IntroScene />
      </Sequence>

      {/* Feature screenshots — overlapping for cross-dissolve weave */}
      {timeline.map(({ start, duration, config, isFirst, isLast }) => (
        <Sequence
          key={config.image}
          from={start}
          durationInFrames={duration}
        >
          <ScreenshotScene
            image={config.image}
            label={config.label}
            duration={duration}
            isFirst={isFirst}
            isLast={isLast}
          />
        </Sequence>
      ))}

      {/* Outro */}
      <Sequence from={outroStart} durationInFrames={OUTRO_DURATION}>
        <OutroScene />
      </Sequence>
    </AbsoluteFill>
  );
};
