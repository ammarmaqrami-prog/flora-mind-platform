import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { query } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { featureName, amount, billingCycle, paymentMethod } = await req.json();
    
    // التحقق من التوكن
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const userId = decoded.userId;

    // حساب تاريخ انتهاء الاشتراك
    const expiresAt = new Date();
    if (billingCycle === "monthly") {
      expiresAt.setMonth(expiresAt.getMonth() + 1);
    } else {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
    }

    // إدراج أو تحديث الاشتراك في قاعدة البيانات
    await query(
      `INSERT INTO subscriptions (user_id, feature_name, plan_type, status, expires_at)
       VALUES ($1, $2, $3, 'active', $4)
       ON CONFLICT (user_id, feature_name) DO UPDATE
       SET plan_type = $3, status = 'active', expires_at = $4, started_at = NOW()`,
      [userId, featureName, billingCycle, expiresAt]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Demo payment error:", error);
    return NextResponse.json({ error: "فشل تأكيد الدفع التجريبي" }, { status: 500 });
  }
}