import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protected routes
  const protectedRoutes = ["/download", "/return"];

  // Check if the current path is a protected route
  if (protectedRoutes.some((route) => pathname.startsWith(route))) {
    const hasAccess = request.cookies.get("nook_access")?.value === "granted";

    // If no access token, redirect to pricing page
    if (!hasAccess) {
      const url = request.nextUrl.clone();
      url.pathname = "/pricing";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/download/:path*", "/return/:path*"],
};
