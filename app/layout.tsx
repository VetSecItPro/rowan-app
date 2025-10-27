import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AuthProvider } from "@/lib/contexts/auth-context";
import { CookieConsent } from "@/components/gdpr/CookieConsent";
import ClientErrorBoundary from "@/components/shared/ClientErrorBoundary";
// import { CommandPaletteProvider } from "@/components/ui/command-palette"; // Temporarily disabled UI
import { Toaster } from 'sonner';

// Force dynamic rendering for all pages (needed for auth context)
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
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafafa' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' }
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-gradient-to-br from-gray-50 via-purple-50/30 to-blue-50/30 dark:from-gray-950 dark:via-purple-950/20 dark:to-blue-950/20 text-gray-900 dark:text-white" style={{ scrollbarGutter: 'stable' }}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          storageKey="rowan-theme"
          disableTransitionOnChange
        >
          <AuthProvider>
            <ClientErrorBoundary>
              {/* <CommandPaletteProvider> // Temporarily disabled UI */}
                {children}
              {/* </CommandPaletteProvider> */}
            </ClientErrorBoundary>
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
        </ThemeProvider>
      </body>
    </html>
  );
}
