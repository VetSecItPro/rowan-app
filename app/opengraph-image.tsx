// FE: Default OpenGraph image for social sharing — FIX-042
import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Rowan - Your Life, Organized';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * Generates the OpenGraph image for the Rowan app.
 *
 * Design: Dark background (#0a0a0a) matching the app's dark-mode-only theme,
 * with the Rowan branding, hero tagline, and subtitle.
 *
 * Uses Satori (via next/og) to convert React/CSS to PNG.
 */
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0a0a',
          position: 'relative',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Gradient background effects */}
        <div
          style={{
            position: 'absolute',
            top: '-10%',
            right: '-5%',
            width: '40%',
            height: '80%',
            background: 'radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-10%',
            left: '-5%',
            width: '40%',
            height: '80%',
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />

        {/* Content container */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 80px',
            zIndex: 10,
          }}
        >
          {/* Logo placeholder and brand name */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
              marginBottom: '48px',
            }}
          >
            {/* Logo placeholder - represents the Rowan leaf logo */}
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '48px',
                fontWeight: 900,
                color: 'white',
              }}
            >
              R
            </div>
            <div
              style={{
                fontSize: '56px',
                fontWeight: 900,
                background: 'linear-gradient(90deg, #60a5fa 0%, #38bdf8 50%, #3b82f6 100%)',
                backgroundClip: 'text',
                color: 'transparent',
                letterSpacing: '-0.02em',
              }}
            >
              Rowan
            </div>
          </div>

          {/* Main tagline - matches homepage hero */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              fontSize: '64px',
              fontWeight: 800,
              color: 'white',
              textAlign: 'center',
              lineHeight: 1.2,
              marginBottom: '24px',
              maxWidth: '900px',
              letterSpacing: '-0.03em',
            }}
          >
            <span>Stop being your family&apos;s </span>
            <span
              style={{
                background: 'linear-gradient(90deg, #60a5fa 0%, #38bdf8 50%, #3b82f6 100%)',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              memory.
            </span>
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontSize: '28px',
              color: '#9ca3af',
              textAlign: 'center',
              maxWidth: '800px',
              lineHeight: 1.5,
            }}
          >
            Tasks, calendars, budgets, meals & more — for your whole household
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
