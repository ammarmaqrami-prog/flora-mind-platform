import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
// التحقق مما إذا كان المسار يبدأ بـ /admin
  if (request.nextUrl.pathname.startsWith("/admin")) {
    // الحصول على توكن المسؤول من الكوكيز أو localStorage (نستخدم localStorage عبر فحص بسيط)
    // بما أن middleware لا تستطيع قراءة localStorage مباشرة، سنستخدم cookie
    const adminToken = request.cookies.get("admin_token")?.value;

    // كلمة سر بسيطة للمسؤول (يمكنك تغييرها أو جعلها في .env)
    const ADMIN_SECRET = process.env.ADMIN_SECRET || "admin123";

    if (adminToken !== ADMIN_SECRET) {
      // إذا لم يكن مصرحاً، توجيه إلى صفحة تسجيل الدخول للمسؤول (سننشئها)
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/admin/:path*",
};