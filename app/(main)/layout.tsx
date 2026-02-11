import { ReactNode } from "react";
import { AppWithOnboarding } from "@/components/app/AppWithOnboarding";
import { Sidebar } from "@/components/navigation/Sidebar";
import { Header } from "@/components/layout/Header";
import ChatFAB from "@/components/chat/ChatFAB";
import { SubscriptionProvider } from "@/lib/contexts/subscription-context";

// Force dynamic rendering for authenticated routes (auth context, real-time data)
export const dynamic = 'force-dynamic';

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <SubscriptionProvider>
      <AppWithOnboarding>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 overflow-auto flex flex-col">
            <Header />
            {children}
          </main>
        </div>
        <ChatFAB />
      </AppWithOnboarding>
    </SubscriptionProvider>
  );
}

