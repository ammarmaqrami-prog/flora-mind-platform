import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { email, token, newPassword } = await req.json();
    const trimmedEmail = email.trim().toLowerCase();

    const userRes = await query(`SELECT id FROM users WHERE LOWER(email) = $1`, [trimmedEmail]);
    if (userRes.rowCount === 0) {
      return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
    }
    const userId = userRes.rows[0].id;

    const tokenRes = await query(
      `SELECT * FROM verification_tokens WHERE user_id = $1 AND token = $2 AND type = 'password_reset' AND expires_at > NOW()`,
      [userId, token]
    );
    if (tokenRes.rowCount === 0) {
      return NextResponse.json({ error: "رمز التحقق غير صحيح أو منتهي" }, { status: 400 });
    }

    const password_hash = await bcrypt.hash(newPassword, 10);
    await query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [password_hash, userId]);
    await query(`DELETE FROM verification_tokens WHERE id = $1`, [tokenRes.rows[0].id]);

    return NextResponse.json({ message: "تم تغيير كلمة المرور بنجاح" });
  } catch (error) {
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}