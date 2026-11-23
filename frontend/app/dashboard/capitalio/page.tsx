"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CapitalioDashboardPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="w-full h-full min-h-screen bg-[#0B0B0C] flex items-center justify-center text-zinc-400 text-sm font-mono">
      Routing to Security Intelligence...
    </div>
  );
}
