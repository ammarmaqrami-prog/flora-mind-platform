import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    // يمكنك إضافة تحقق بسيط من صلاحيات المسؤول هنا (مثلاً via header token)
    // لكن للاختبار نتركه مفتوحاً

    const result = await query(`
      SELECT 
        s.id,
        s.user_id,
        s.feature_name,
        s.plan_type,
        s.started_at,
        u.email
      FROM subscriptions s
      JOIN users u ON s.user_id = u.id
      WHERE s.status = 'pending'
      ORDER BY s.started_at DESC
    `);

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error("Fetch pending subscriptions error:", error);
    return NextResponse.json({ error: "فشل جلب الطلبات المعلقة" }, { status: 500 });
  }
}