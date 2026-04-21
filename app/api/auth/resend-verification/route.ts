import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { query } from "@/lib/db";
import { randomInt } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    const normalizedEmail = email?.trim().toLowerCase();

    // البحث عن المستخدم غير المفعل
    const userRes = await query(
      `SELECT id, full_name FROM users WHERE email = $1 AND is_verified = FALSE`,
      [normalizedEmail]
    );
    if (userRes.rowCount === 0) {
      return NextResponse.json({ error: "الحساب غير موجود أو مفعل بالفعل" }, { status: 404 });
    }
    const userId = userRes.rows[0].id;
    const fullName = userRes.rows[0].full_name || "المستخدم";

    // حذف الرموز القديمة
    await query(`DELETE FROM verification_tokens WHERE user_id = $1 AND type = 'email_verification'`, [userId]);

    // إنشاء رمز جديد
    const token = randomInt(100000, 999999).toString();
    const expires_at = new Date(Date.now() + 15 * 60 * 1000);
    await query(
      `INSERT INTO verification_tokens (user_id, token, type, expires_at) VALUES ($1, $2, 'email_verification', $3)`,
      [userId, token, expires_at]
    );

    // ==== إرسال بريد حقيقي عبر Gmail ====
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"فلورا مايند" <${process.env.EMAIL_USER}>`,
      to: normalizedEmail,
      subject: "رمز التحقق لتأكيد حسابك - فلورا مايند",
      text: `رمز التحقق الجديد الخاص بك هو: ${token}\nهذا الرمز صالح لمدة 15 دقيقة.`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; text-align: right;">
          <h2>مرحباً ${fullName}!</h2>
          <p>رمز التحقق الجديد لتأكيد حسابك في فلورا مايند هو:</p>
          <h1 style="color: #2e7d32; font-size: 32px;">${token}</h1>
          <p>هذا الرمز صالح لمدة 15 دقيقة.</p>
          <p>إذا لم تطلب هذا الرمز، يرجى تجاهل هذا البريد.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ تم إرسال رمز تحقق جديد إلى ${normalizedEmail}`);

    return NextResponse.json({ message: "تم إرسال رمز تحقق جديد إلى بريدك الإلكتروني" });
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء إرسال الرمز" }, { status: 500 });
  }
}