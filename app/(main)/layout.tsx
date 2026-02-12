import { ReactNode } from "react";
import { AppWithOnboarding } from "@/components/app/AppWithOnboarding";
import { Sidebar } from "@/components/navigation/Sidebar";
import { Header } from "@/components/layout/Header";
import ChatFAB from "@/components/chat/ChatFAB";
import { BottomNav } from "@/components/navigation/BottomNav";
import { ChatProvider } from "@/lib/contexts/chat-context";
import { SubscriptionProvider } from "@/lib/contexts/subscription-context";
import { AIOnboardingGate } from "@/components/ai/AIOnboardingGate";

// Force dynamic rendering for authenticated routes (auth context, real-time data)
export const dynamic = 'force-dynamic';

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <SubscriptionProvider>
      <AppWithOnboarding>
        <ChatProvider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:text-sm focus:font-medium"
          >
            Skip to main content
          </a>
          <div className="flex min-h-screen">
            <Sidebar />
            <main id="main-content" className="flex-1 overflow-auto flex flex-col pb-[calc(72px+env(safe-area-inset-bottom))] md:pb-0">
              <Header />
              {children}
            </main>
          </div>
          <BottomNav />
          <ChatFAB />
          <AIOnboardingGate />
        </ChatProvider>
      </AppWithOnboarding>
    </SubscriptionProvider>
  );
}
