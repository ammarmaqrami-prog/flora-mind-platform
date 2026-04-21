import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { userId, featureName } = await req.json();

    if (!userId || !featureName) {
      return NextResponse.json({ error: "بيانات غير مكتملة" }, { status: 400 });
    }

    // تعيين تاريخ انتهاء افتراضي (شهر)
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    await query(
      `UPDATE subscriptions 
       SET status = 'active', 
           expires_at = $1, 
           started_at = NOW()
       WHERE user_id = $2 
         AND feature_name = $3 
         AND status = 'pending'`,
      [expiresAt, userId, featureName]
    );

    return NextResponse.json({ success: true, message: "تم تفعيل الاشتراك بنجاح" });
  } catch (error) {
    console.error("Activate subscription error:", error);
    return NextResponse.json({ error: "فشل تفعيل الاشتراك" }, { status: 500 });
  }
}