import { ImageResponse } from 'next/og';

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';

export const FEATURE_CONFIG: Record<
  string,
  { name: string; color: string; description: string; icon: string }
> = {
  tasks: {
    name: 'Tasks',
    color: '#3b82f6',
    description: 'Shared task management for families',
    icon: '\u2713', // checkmark
  },
  calendar: {
    name: 'Calendar',
    color: '#8b5cf6',
    description: 'One calendar for your whole family',
    icon: '\u{1F4C5}', // calendar emoji as fallback shape
  },
  reminders: {
    name: 'Reminders',
    color: '#ec4899',
    description: 'Never miss what matters',
    icon: '\u{1F514}', // bell
  },
  messages: {
    name: 'Messages',
    color: '#22c55e',
    description: 'Private family messaging',
    icon: '\u{1F4AC}', // speech bubble
  },
  shopping: {
    name: 'Shopping',
    color: '#10b981',
    description: 'Shared shopping lists for the family',
    icon: '\u{1F6D2}', // shopping cart
  },
  meals: {
    name: 'Meals',
    color: '#f97316',
    description: 'Plan meals the whole family loves',
    icon: '\u{1F372}', // pot of food
  },
  budget: {
    name: 'Budget',
    color: '#f59e0b',
    description: 'Family finances made simple',
    icon: '\u{1F4B0}', // money bag
  },
  goals: {
    name: 'Goals',
    color: '#6366f1',
    description: 'Track family goals together',
    icon: '\u{1F3AF}', // target
  },
  'daily-check-in': {
    name: 'Daily Check-in',
    color: '#06b6d4',
    description: 'Stay connected every day',
    icon: '\u{2600}', // sun
  },
};

export function generateFeatureOG(
  featureName: string,
  featureColor: string,
  description: string,
  icon: string
): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(145deg, #0a0a0a 0%, #111827 50%, #0f172a 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Feature-colored accent bar on the left */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 6,
            background: featureColor,
          }}
        />

        {/* Subtle glow from feature color */}
        <div
          style={{
            position: 'absolute',
            top: '-20%',
            right: '-10%',
            width: 500,
            height: 500,
            borderRadius: '50%',
            background: featureColor,
            opacity: 0.06,
            filter: 'blur(100px)',
          }}
        />

        {/* Left content area */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '60px 60px 60px 48px',
            flex: 1,
          }}
        >
          {/* Rowan branding */}
          <div
            style={{
              fontSize: 20,
              fontWeight: 600,
              color: '#6b7280',
              letterSpacing: '2px',
              textTransform: 'uppercase',
              marginBottom: 20,
            }}
          >
            Rowan
          </div>

          {/* Feature name */}
          <div
            style={{
              fontSize: 72,
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-2px',
              lineHeight: 1.1,
              marginBottom: 20,
            }}
          >
            {featureName}
          </div>

          {/* Description */}
          <div
            style={{
              fontSize: 28,
              color: '#94a3b8',
              lineHeight: 1.4,
              maxWidth: 500,
            }}
          >
            {description}
          </div>

          {/* Bottom URL */}
          <div
            style={{
              marginTop: 48,
              fontSize: 18,
              color: '#4b5563',
              letterSpacing: '1px',
            }}
          >
            rowanapp.com
          </div>
        </div>

        {/* Right side - large icon area */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 380,
            position: 'relative',
          }}
        >
          {/* Icon circle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 180,
              height: 180,
              borderRadius: '40px',
              background: `linear-gradient(135deg, ${featureColor}22, ${featureColor}44)`,
              border: `2px solid ${featureColor}66`,
            }}
          >
            <div style={{ fontSize: 80 }}>{icon}</div>
          </div>
        </div>
      </div>
    ),
    { ...OG_SIZE }
  );
}
