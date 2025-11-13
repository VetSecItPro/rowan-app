import { ReactNode } from "react";
import { AppWithOnboarding } from "@/components/app/AppWithOnboarding";

export default function MainLayout({ children }: { children: ReactNode }) {
  return <AppWithOnboarding>{children}</AppWithOnboarding>;
}

