import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

/**
 * Next.js 16 Request Proxy (formerly Middleware) (RM-INFO-001)
 * Enforces client navigation route guards and decommissioned signup redirection.
 */
export async function proxy(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const { pathname } = req.nextUrl;

  const isLoggedIn = !!token;
  const userRole = token?.role;

  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isAuthRoute = pathname === "/login" || pathname === "/signup";

  // Decommission public signup route - redirect to staff login
  if (pathname === "/signup") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isDashboardRoute) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    const pathParts = pathname.split("/");
    const targetDashboard = pathParts[2]; // admin, doctor, receptionist, lab-technician, pharmacist

    if (targetDashboard && targetDashboard !== userRole) {
      return NextResponse.redirect(new URL(`/dashboard/${userRole}`, req.url));
    }
  }

  if (isAuthRoute && isLoggedIn) {
    return NextResponse.redirect(new URL(`/dashboard/${userRole}`, req.url));
  }

  return NextResponse.next();
}

// Export default and middleware alias for backward compatibility
export default proxy;
export const middleware = proxy;

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup"],
};

