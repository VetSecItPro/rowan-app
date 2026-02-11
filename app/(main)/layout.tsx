import { ReactNode } from "react";
import { AppWithOnboarding } from "@/components/app/AppWithOnboarding";
import { Sidebar } from "@/components/navigation/Sidebar";
import { Header } from "@/components/layout/Header";
import ChatFAB from "@/components/chat/ChatFAB";
import { BottomNav } from "@/components/navigation/BottomNav";
import { ChatProvider } from "@/lib/contexts/chat-context";
import { SubscriptionProvider } from "@/lib/contexts/subscription-context";

// Force dynamic rendering for authenticated routes (auth context, real-time data)
export const dynamic = 'force-dynamic';

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <SubscriptionProvider>
      <AppWithOnboarding>
        <ChatProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 overflow-auto flex flex-col pb-[72px] md:pb-0">
              <Header />
              {children}
            </main>
          </div>
          <BottomNav />
          <ChatFAB />
        </ChatProvider>
      </AppWithOnboarding>
    </SubscriptionProvider>
  );
}
