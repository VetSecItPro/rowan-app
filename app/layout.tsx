import type { Metadata, Viewport } from "next";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { DeviceProvider } from "@/lib/contexts/DeviceContext";
import { AuthProvider } from "@/lib/contexts/auth-context";
import { SpacesProvider } from "@/lib/contexts/spaces-context";
import { CookieConsent } from "@/components/gdpr/CookieConsent";
import ClientErrorBoundary from "@/components/shared/ClientErrorBoundary";
import { NetworkStatus } from "@/components/ui/NetworkStatus";
import { KeyboardShortcuts } from "@/components/ui/KeyboardShortcuts";
import { Toaster } from 'sonner';
import { AppQueryProvider } from '@/lib/providers/query-client-provider';
import { MotionProvider } from '@/components/providers/MotionProvider';

// Optimized font loading with Next.js font module
// Automatically self-hosted, preloaded, and optimized

// Plus Jakarta Sans - Modern geometric sans-serif for headings & UI
// Used by premium SaaS products for its clean, professional look
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jakarta',
  weight: ['300', '400', '500', '600', '700', '800'],
});

// Playfair Display - Elegant serif for descriptions & quotes
const playfair = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-playfair',
  weight: ['400', '500', '600', '700', '800', '900'],
  style: ['normal', 'italic'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://rowanapp.com'),
  title: "Rowan - Your Life, Organized",
  description: "Collaborative life management for couples and families. Tasks, meals, budgets, goals, calendar, and more.",
  manifest: '/manifest.json',
  appleWebApp: {
    statusBarStyle: 'black-translucent',
    title: 'Rowan',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/rowan-logo.png',
    apple: '/rowan-logo.png',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://rowanapp.com',
    title: 'Rowan - Your Life, Organized',
    description: 'Collaborative life management for couples and families. Tasks, meals, budgets, goals, calendar, and more.',
    siteName: 'Rowan',
    // OG image auto-generated from app/opengraph-image.tsx
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rowan - Your Life, Organized',
    description: 'Collaborative life management for couples and families',
    // Twitter image auto-generated from app/opengraph-image.tsx
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#000000', // FE: Aligned with manifest.json — FIX-046
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: 'dark' }}>
      <head>
        {/* Resource hints for faster connections - preconnect to critical third-party services */}
        <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL || ''} />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* DNS prefetch for non-critical services */}
        <link rel="dns-prefetch" href="https://vercel.live" />
        <link rel="dns-prefetch" href="https://vitals.vercel-insights.com" />
      </head>
      <body className={`${jakarta.variable} ${playfair.variable} font-sans antialiased bg-black text-white`} style={{ scrollbarGutter: 'stable' }}>
        <MotionProvider>
          <AppQueryProvider>
            <DeviceProvider>
              <AuthProvider>
                <SpacesProvider>
                  <ClientErrorBoundary>
                    <NetworkStatus />
                    <KeyboardShortcuts />
                    {children}
                  </ClientErrorBoundary>
                </SpacesProvider>
                <CookieConsent />
                <Toaster
                  position="top-center"
                  duration={4000}
                  closeButton
                  richColors
                  theme="dark"
                  toastOptions={{
                    className: 'w-full max-w-md mx-4 sm:mx-0',
                    style: {
                      fontSize: '14px',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      border: '1px solid rgba(255,255,255,0.08)',
                    },
                  }}
                  visibleToasts={3}
                  offset="16px"
                  gap={8}
                  swipeDirections={['right', 'top']}
                />
              </AuthProvider>
            </DeviceProvider>
          </AppQueryProvider>
        </MotionProvider>
      </body>
    </html>
  );
}
