import { ReactNode } from "react";
import { AppWithOnboarding } from "@/components/app/AppWithOnboarding";
import { Sidebar } from "@/components/navigation/Sidebar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/navigation/Footer";
import ChatFAB from "@/components/chat/ChatFAB";
import { DesktopChatPanel } from "@/components/chat/DesktopChatPanel";
import { BottomNav } from "@/components/navigation/BottomNav";
import { ChatProvider } from "@/lib/contexts/chat-context";
import { SubscriptionProvider } from "@/lib/contexts/subscription-context";
import { AIOnboardingGate } from "@/components/ai/AIOnboardingGate";
import { LayoutFooterProvider } from "@/lib/contexts/layout-context";

// Force dynamic rendering for authenticated routes (auth context, real-time data)
export const dynamic = 'force-dynamic';

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <SubscriptionProvider>
      <AppWithOnboarding>
        <ChatProvider>
          <LayoutFooterProvider>
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:text-sm focus:font-medium"
            >
              Skip to main content
            </a>
            <div className="flex h-dvh w-full">
              <Sidebar />
              <div className="flex-1 min-w-0 flex flex-col">
                <Header />
                <div
                  id="main-content"
                  className="flex-1 min-h-0 overflow-auto pb-[calc(72px+env(safe-area-inset-bottom))] md:pb-0"
                >
                  {/* Content + chat panel side by side */}
                  <div className="flex min-h-full">
                    <main className="flex-1 min-w-0 flex flex-col">
                      {children}
                    </main>
                    {/* Chat panel: sticky sidebar in content flow */}
                    <DesktopChatPanel />
                  </div>
                  {/* Footer spans full width like header */}
                  <div className="hidden md:block">
                    <Footer />
                  </div>
                </div>
              </div>
            </div>
            <BottomNav />
            <ChatFAB />
            <AIOnboardingGate />
          </LayoutFooterProvider>
        </ChatProvider>
      </AppWithOnboarding>
    </SubscriptionProvider>
  );
}
