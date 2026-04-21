import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { query } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { email, phone, password, deviceFingerprint } = await req.json();

    const userRes = await query(
      `SELECT id, email, phone, password_hash, is_verified FROM users WHERE email = $1 OR phone = $2`,
      [email || null, phone || null]
    );
    if (userRes.rowCount === 0) {
      return NextResponse.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 });
    }

    const user = userRes.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: "بيانات الدخول غير صحيحة" }, { status: 401 });
    }

    // رسالة تفصيلية للتطوير فقط (يمكن إزالتها لاحقاً)
    if (!user.is_verified) {
      return NextResponse.json({ error: "الحساب غير مفعل. يرجى تفعيله عبر الرمز المرسل إلى بريدك الإلكتروني." }, { status: 403 });
    }

    if (deviceFingerprint) {
      await query(
        `INSERT INTO user_devices (user_id, device_fingerprint)
         VALUES ($1, $2)
         ON CONFLICT (user_id, device_fingerprint) DO UPDATE SET last_login = CURRENT_TIMESTAMP`,
        [user.id, deviceFingerprint]
      );
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, phone: user.phone },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    return NextResponse.json({
      token,
      user: { id: user.id, email: user.email, phone: user.phone, full_name: user.full_name },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "حدث خطأ أثناء تسجيل الدخول" }, { status: 500 });
  }
}