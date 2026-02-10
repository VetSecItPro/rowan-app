import type { Metadata } from 'next';
import { AdminQueryProvider } from '@/lib/providers/query-client-provider';

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
  // The root layout already provides base styling (dark mode only)
  return (
    <AdminQueryProvider>
      <div className="min-h-screen bg-black">
        {children}
      </div>
    </AdminQueryProvider>
  );
}
