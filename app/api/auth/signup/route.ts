import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import nodemailer from "nodemailer";
import { query } from "@/lib/db";
import { randomInt } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { email, phone, password, full_name } = await req.json();
    const normalizedEmail = email?.trim().toLowerCase() || null;
    const normalizedPhone = phone?.trim() || null;

    // التحقق من وجود المستخدم
    const existingUser = await query(
      `SELECT id, is_verified, created_at FROM users WHERE LOWER(email) = $1`,
      [normalizedEmail]
    );

    if (existingUser.rowCount && existingUser.rowCount > 0) {
      const user = existingUser.rows[0];
      if (!user.is_verified) {
        const createdAt = new Date(user.created_at);
        const now = new Date();
        const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
        if (diffMinutes > 30) {
          await query(`DELETE FROM users WHERE id = $1`, [user.id]);
        } else {
          return NextResponse.json({ 
            error: "الحساب موجود بانتظار التفعيل. تحقق من بريدك أو انتظر 30 دقيقة." 
          }, { status: 400 });
        }
      } else {
        return NextResponse.json({ error: "البريد الإلكتروني مستخدم بالفعل" }, { status: 400 });
      }
    }

    const password_hash = await bcrypt.hash(password, 10);
    const result = await query(
      `INSERT INTO users (email, phone, password_hash, full_name, is_verified)
       VALUES ($1, $2, $3, $4, FALSE) RETURNING id`,
      [normalizedEmail, normalizedPhone, password_hash, full_name]
    );
    const userId = result.rows[0].id;

    const token = randomInt(100000, 999999).toString();
    const expires_at = new Date(Date.now() + 15 * 60 * 1000);
    await query(
      `INSERT INTO verification_tokens (user_id, token, type, expires_at)
       VALUES ($1, $2, 'email_verification', $3)`,
      [userId, token, expires_at]
    );

    // ===== إرسال بريد حقيقي عبر Gmail =====
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
      subject: "رمز التحقق لتأكيد حسابك في فلورا مايند",
      text: `رمز التحقق الخاص بك هو: ${token}`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; text-align: right;">
          <h2>مرحباً ${full_name || "بك"}!</h2>
          <p>شكراً لتسجيلك في منصة فلورا مايند. رمز التحقق الخاص بك هو:</p>
          <h1 style="color: #2e7d32; font-size: 32px;">${token}</h1>
          <p>هذا الرمز صالح لمدة 15 دقيقة.</p>
          <p>إذا لم تطلب هذا الرمز، يرجى تجاهل هذا البريد.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ تم إرسال بريد حقيقي إلى ${normalizedEmail} مع الرمز: ${token}`);

    return NextResponse.json({
      message: "تم التسجيل بنجاح. تحقق من بريدك الإلكتروني للحصول على رمز التفعيل.",
    });
  } catch (error: any) {
    console.error("🔥 خطأ في التسجيل:", error);
    // إرجاع رسالة الخطأ الحقيقية للواجهة
    return NextResponse.json(
      { error: `فشل إرسال البريد: ${error.message}` },
      { status: 500 }
    );
  }
}