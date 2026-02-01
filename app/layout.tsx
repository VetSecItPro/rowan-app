import type { Metadata, Viewport } from "next";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { DeviceProvider } from "@/lib/contexts/DeviceContext";
import { AuthProvider } from "@/lib/contexts/auth-context";
import { SpacesProvider } from "@/lib/contexts/spaces-context";
import { CookieConsent } from "@/components/gdpr/CookieConsent";
import ClientErrorBoundary from "@/components/shared/ClientErrorBoundary";
import { NetworkStatus } from "@/components/ui/NetworkStatus";
import { Toaster } from 'sonner';
import { AppQueryProvider } from '@/lib/providers/query-client-provider';

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
  title: "Rowan - Your Life, Organized",
  description: "Collaborative life management for couples and families",
  manifest: '/manifest.json',
  appleWebApp: {
    statusBarStyle: 'default',
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
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  themeColor: '#111827',
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
        <link rel="preconnect" href="https://mhqpjprmpvigmwcghpzx.supabase.co" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* DNS prefetch for non-critical services */}
        <link rel="dns-prefetch" href="https://vercel.live" />
        <link rel="dns-prefetch" href="https://vitals.vercel-insights.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
      </head>
      <body className={`${jakarta.variable} ${playfair.variable} font-sans antialiased bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 text-white`} style={{ scrollbarGutter: 'stable' }}>
        <AppQueryProvider>
        <DeviceProvider>
          <AuthProvider>
            <SpacesProvider>
              <ClientErrorBoundary>
                <NetworkStatus />
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
                },
              }}
              visibleToasts={3}
              offset="16px"
            />
          </AuthProvider>
        </DeviceProvider>
        </AppQueryProvider>
      </body>
    </html>
  );
}
