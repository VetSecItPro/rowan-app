import { ReactNode } from "react";
import { AppWithOnboarding } from "@/components/app/AppWithOnboarding";
import { Sidebar } from "@/components/navigation/Sidebar";
import { Header } from "@/components/layout/Header";

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <AppWithOnboarding>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-auto flex flex-col">
          <Header />
          {children}
        </main>
      </div>
    </AppWithOnboarding>
  );
}

