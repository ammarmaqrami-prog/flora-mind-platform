import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    const normalizedEmail = email?.trim().toLowerCase();
    await query(`DELETE FROM users WHERE email = $1 AND is_verified = FALSE`, [normalizedEmail]);
    return NextResponse.json({ message: "تم إلغاء التسجيل وحذف الحساب" });
  } catch (error) {
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}