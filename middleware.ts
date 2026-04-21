import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  // التحقق مما إذا كان المسار يبدأ بـ /admin
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const adminToken = request.cookies.get("admin_token")?.value;
    const ADMIN_SECRET = process.env.ADMIN_SECRET || "admin123";

    if (adminToken !== ADMIN_SECRET) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/admin/:path*",
};