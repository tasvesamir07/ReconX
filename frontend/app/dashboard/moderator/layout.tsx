import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

const SESSION_COOKIE = "reconx_session";
const API_TARGET = (process.env.API_PROXY_TARGET || "http://localhost:8000").replace(/\/+$/, "");
const ALLOWED_ROLES = new Set(["MODERATOR", "SUPER_ADMIN"]);

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

/** Server-side gate for the compliance moderation queue. */
export default async function ModeratorLayout({ children }: { children: ReactNode }) {
  const role = await getPlatformRole();
  if (!role) {
    redirect("/login?next=/dashboard/moderator");
  }
  if (!ALLOWED_ROLES.has(role)) {
    redirect("/dashboard");
  }
  return <>{children}</>;
}
