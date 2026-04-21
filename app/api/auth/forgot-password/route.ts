import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { query } from "@/lib/db";
import { randomInt } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    const trimmedEmail = email.trim().toLowerCase();

    // البحث عن المستخدم
    const userRes = await query(`SELECT id FROM users WHERE LOWER(email) = $1`, [trimmedEmail]);
    if (userRes.rowCount === 0) {
      return NextResponse.json({ error: "البريد الإلكتروني غير مسجل" }, { status: 404 });
    }
    const userId = userRes.rows[0].id;

    // إنشاء رمز إعادة التعيين
    const token = randomInt(100000, 999999).toString();
    const expires_at = new Date(Date.now() + 15 * 60 * 1000); // 15 دقيقة

    await query(
      `INSERT INTO verification_tokens (user_id, token, type, expires_at)
       VALUES ($1, $2, 'password_reset', $3)`,
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
      to: email,
      subject: "رمز إعادة تعيين كلمة المرور - فلورا مايند",
      text: `رمز إعادة تعيين كلمة المرور الخاص بك هو: ${token}\nهذا الرمز صالح لمدة 15 دقيقة.`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; text-align: right;">
          <h2>مرحباً!</h2>
          <p>لقد تلقينا طلباً لإعادة تعيين كلمة المرور لحسابك في فلورا مايند.</p>
          <p>رمز التحقق الخاص بك هو:</p>
          <h1 style="color: #2e7d32; font-size: 32px;">${token}</h1>
          <p>هذا الرمز صالح لمدة 15 دقيقة.</p>
          <p>إذا لم تطلب إعادة تعيين كلمة المرور، يرجى تجاهل هذا البريد.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ تم إرسال رمز إعادة التعيين إلى ${email}`);

    return NextResponse.json({ message: "تم إرسال رمز التحقق إلى بريدك الإلكتروني" });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ error: "حدث خطأ أثناء إرسال الرمز" }, { status: 500 });
  }
}