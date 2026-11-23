import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "reconx_session";

/**
 * First line of defence for the authenticated area. The API performs the real
 * authorization checks; this middleware prevents the dashboard shell (and
 * admin routes) from being rendered to anonymous visitors at all.
 */
export function middleware(request: NextRequest) {
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  if (!session) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
