// FE: Default OpenGraph image for social sharing — FIX-042
import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Rowan — Family Management Made Simple'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 80,
            fontWeight: 800,
            color: '#ffffff',
            marginBottom: 16,
            letterSpacing: '-2px',
          }}
        >
          Rowan
        </div>
        <div
          style={{
            fontSize: 32,
            color: '#94a3b8',
            textAlign: 'center',
            maxWidth: 700,
          }}
        >
          Family Management Made Simple
        </div>
        <div
          style={{
            marginTop: 40,
            display: 'flex',
            gap: 24,
          }}
        >
          {['Tasks', 'Calendar', 'Budget', 'Meals', 'Goals'].map((feature) => (
            <div
              key={feature}
              style={{
                padding: '8px 20px',
                borderRadius: 20,
                background: 'rgba(255,255,255,0.1)',
                color: '#e2e8f0',
                fontSize: 18,
              }}
            >
              {feature}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  )
}
