import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { query } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    const token = authHeader.substring(7);
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const userId = decoded.userId;

    const { featureId, featureName, billingCycle } = await req.json();

    // حفظ الطلب كاشتراك معلق
    await query(
      `INSERT INTO subscriptions (user_id, feature_name, plan_type, status, started_at, expires_at)
       VALUES ($1, $2, $3, 'pending', NOW(), NULL)`,
      [userId, featureName, billingCycle]
    );

    return NextResponse.json({ message: "تم استلام طلب الاشتراك" });
  } catch (error) {
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}