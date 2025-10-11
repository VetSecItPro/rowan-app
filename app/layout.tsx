import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AuthProvider } from "@/lib/contexts/auth-context";

// Force dynamic rendering for all pages (needed for auth context)
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "Rowan - Your Life, Organized",
  description: "Collaborative life management for couples and families",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-white dark:bg-black text-gray-900 dark:text-white" style={{ scrollbarGutter: 'stable' }}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          storageKey="rowan-theme"
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
