import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AuthProvider } from "@/lib/contexts/auth-context";
import { CookieConsent } from "@/components/gdpr/CookieConsent";
import { CommandPaletteProvider } from "@/components/ui/command-palette";
import { Toaster } from 'sonner';

// Force dynamic rendering for all pages (needed for auth context)
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Rowan - Your Life, Organized",
  description: "Collaborative life management for couples and families",
  manifest: '/manifest.json',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
  },
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafafa' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' }
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Rowan',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/rowan-logo.png',
    apple: '/rowan-logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-gray-50 dark:bg-black text-gray-900 dark:text-white" style={{ scrollbarGutter: 'stable' }}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem={true}
          storageKey="rowan-theme"
          disableTransitionOnChange
        >
          <AuthProvider>
            <CommandPaletteProvider>
              {children}
            </CommandPaletteProvider>
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
