import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { MockAuthProvider } from "@/lib/contexts/mock-auth-context";

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
      <body className="antialiased bg-white dark:bg-black text-gray-900 dark:text-white">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <MockAuthProvider>
            {children}
          </MockAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
