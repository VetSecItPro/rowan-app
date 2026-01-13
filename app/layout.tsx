import type { Metadata, Viewport } from "next";
import { Playfair_Display, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { DeviceProvider } from "@/lib/contexts/DeviceContext";
import { AuthProvider } from "@/lib/contexts/auth-context";
import { SpacesProvider } from "@/lib/contexts/spaces-context";
import { CookieConsent } from "@/components/gdpr/CookieConsent";
import ClientErrorBoundary from "@/components/shared/ClientErrorBoundary";
import { NetworkStatus } from "@/components/ui/NetworkStatus";
// import { CommandPaletteProvider } from "@/components/ui/command-palette"; // Temporarily disabled UI
import { Toaster } from 'sonner';

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

// Force dynamic rendering for all pages since we use AuthProvider with React Context
export const dynamic = 'force-dynamic';

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
  viewportFit: 'cover', // Enable safe area support for notched devices
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafafa' },
    { media: '(prefers-color-scheme: dark)', color: '#111827' }
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Resource hints for faster connections - preconnect to critical third-party services */}
        <link rel="preconnect" href="https://SUPABASE_PROJECT_REF.supabase.co" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* DNS prefetch for non-critical services */}
        <link rel="dns-prefetch" href="https://vercel.live" />
        <link rel="dns-prefetch" href="https://vitals.vercel-insights.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />

        {/*
          Inline script to prevent theme flash - runs before React hydrates.
          SECURITY: This dangerouslySetInnerHTML usage is SAFE because:
          1. Content is a hardcoded string literal (no user input interpolation)
          2. Theme value from localStorage is validated against allowlist
          3. Standard Next.js pattern for FOUC prevention
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('rowan-theme');
                  // SECURITY: Only allow 'light' or 'dark' - prevents injection
                  var theme = (stored === 'light' || stored === 'dark') ? stored : 'dark';
                  document.documentElement.classList.add(theme);
                  document.documentElement.style.colorScheme = theme;
                } catch (e) {
                  document.documentElement.classList.add('dark');
                  document.documentElement.style.colorScheme = 'dark';
                }
              })();
            `,
          }}
        />
      </head>
      <body className={`${jakarta.variable} ${playfair.variable} font-sans antialiased bg-gradient-to-br from-gray-50 via-slate-50 to-stone-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950 text-gray-900 dark:text-white`} style={{ scrollbarGutter: 'stable' }}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          storageKey="rowan-theme"
          disableTransitionOnChange
        >
          <DeviceProvider>
            <AuthProvider>
              <SpacesProvider>
                <ClientErrorBoundary>
                  <NetworkStatus />
                  {/* <CommandPaletteProvider> // Temporarily disabled UI */}
                    {children}
                  {/* </CommandPaletteProvider> */}
                </ClientErrorBoundary>
              </SpacesProvider>
              <CookieConsent />
              <Toaster
                position="top-center"
                duration={4000}
                closeButton
                richColors
                theme="system"
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
        </ThemeProvider>
      </body>
    </html>
  );
}
