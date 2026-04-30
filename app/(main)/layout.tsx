import { ReactNode } from "react";
import { redirect } from "next/navigation";
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
import { createClient } from "@/lib/supabase/server";

// Force dynamic rendering for authenticated routes (auth context, real-time data)
export const dynamic = 'force-dynamic';

/**
 * Welcome-flow guard: if a freshly-signed-up user (welcome_completed_at IS NULL)
 * is also the owner of a space, bounce them to /welcome ONCE so they can confirm
 * the auto-derived display name + household name. Invited partners (non-owners)
 * are skipped — they joined someone else's household and shouldn't see the flow.
 *
 * Cost: one indexed PK lookup on users + one space_members lookup per authenticated
 * page render. Both rows are tiny and the second query only fires for the small
 * NULL-flag cohort (new signups), so amortized cost is near zero.
 *
 * Failure mode: if either query errors we silently allow the request through —
 * showing the dashboard is strictly better than locking a real user out of the
 * app over a transient DB hiccup.
 */
async function shouldRedirectToWelcome(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: profile } = await supabase
      .from('users')
      .select('welcome_completed_at')
      .eq('id', user.id)
      .single();

    if (!profile || profile.welcome_completed_at) return false;

    // Only owners get the welcome step. Invited partners stay on dashboard.
    const { data: ownedMembership } = await supabase
      .from('space_members')
      .select('space_id')
      .eq('user_id', user.id)
      .eq('role', 'owner')
      .limit(1)
      .maybeSingle();

    return !!ownedMembership;
  } catch {
    return false;
  }
}

export default async function MainLayout({ children }: { children: ReactNode }) {
  if (await shouldRedirectToWelcome()) {
    redirect('/welcome');
  }

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
