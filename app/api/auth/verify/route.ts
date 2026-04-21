import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { email, token } = await req.json();

    const userRes = await query(`SELECT id FROM users WHERE email = $1`, [email]);
    if (userRes.rowCount === 0) {
      return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
    }
    const userId = userRes.rows[0].id;

    const tokenRes = await query(
      `SELECT * FROM verification_tokens
       WHERE user_id = $1 AND token = $2 AND type = 'email_verification' AND expires_at > NOW()`,
      [userId, token]
    );
    if (tokenRes.rowCount === 0) {
      return NextResponse.json({ error: "رمز التحقق غير صحيح أو منتهي الصلاحية" }, { status: 400 });
    }

    await query(`UPDATE users SET is_verified = TRUE WHERE id = $1`, [userId]);
    await query(`DELETE FROM verification_tokens WHERE id = $1`, [tokenRes.rows[0].id]);

    return NextResponse.json({ message: "تم تفعيل الحساب بنجاح، يمكنك الآن تسجيل الدخول" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "حدث خطأ أثناء التحقق" }, { status: 500 });
  }
}