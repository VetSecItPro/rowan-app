import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Rowan Operations Dashboard',
  description: 'Administrative dashboard for Rowan App operations',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Admin layout is nested under root layout - don't define html/body
  // The root layout already provides ThemeProvider and base styling
  return (
    <div className="min-h-screen bg-gray-900">
      {children}
    </div>
  );
}
