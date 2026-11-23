import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

const SESSION_COOKIE = "reconx_session";
const API_TARGET = (process.env.API_PROXY_TARGET || "http://localhost:8000").replace(/\/+$/, "");

async function getPlatformRole(): Promise<string | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE)?.value;
  if (!session) return null;

  try {
    const response = await fetch(`${API_TARGET}/api/v1/auth/me`, {
      headers: { cookie: `${SESSION_COOKIE}=${session}` },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data?.user?.platform_role ?? null;
  } catch {
    return null;
  }
}

/**
 * Server-side admin gate. Hiding links in the sidebar is not authorization:
 * every /dashboard/admin/* page is checked here before any markup is sent.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const role = await getPlatformRole();
  if (!role) {
    redirect("/login?next=/dashboard/admin");
  }
  if (role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }
  return <>{children}</>;
}
