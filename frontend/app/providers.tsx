"use client";

import { ToastProvider } from "@/components/ui/toast";
import { BackendWarmer } from "@/components/backend-warmer";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <BackendWarmer />
      {children}
    </ToastProvider>
  );
}
