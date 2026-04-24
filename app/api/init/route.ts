import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    // المستخدمين
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE,
        phone VARCHAR(20) UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(100),
        is_verified BOOLEAN DEFAULT FALSE,
        farmer_type VARCHAR(100),
        experience_level VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // رموز التحقق
    await query(`
      CREATE TABLE IF NOT EXISTS verification_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(10) NOT NULL,
        type VARCHAR(20) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // أجهزة المستخدمين
    await query(`
      CREATE TABLE IF NOT EXISTS user_devices (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        device_fingerprint VARCHAR(255) NOT NULL,
        last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, device_fingerprint)
      );
    `);

    // تتبع استخدام الزوار (حسب الجهاز)
    await query(`
      CREATE TABLE IF NOT EXISTS feature_usage_by_device (
        id SERIAL PRIMARY KEY,
        device_fingerprint VARCHAR(255) NOT NULL,
        feature_name VARCHAR(100) NOT NULL,
        usage_count INTEGER DEFAULT 1,
        first_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(device_fingerprint, feature_name)
      );
    `);

    // تتبع استخدام المستخدمين المسجلين
    await query(`
      CREATE TABLE IF NOT EXISTS feature_usage_by_user (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        feature_name VARCHAR(100) NOT NULL,
        usage_count INTEGER DEFAULT 1,
        first_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, feature_name)
      );
    `);

    // الاشتراكات
    await query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        feature_name VARCHAR(100) NOT NULL,
        plan_type VARCHAR(20) NOT NULL DEFAULT 'monthly',
        status VARCHAR(20) DEFAULT 'active',
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        auto_renew BOOLEAN DEFAULT TRUE,
        UNIQUE(user_id, feature_name)
      );
    `);

    return NextResponse.json({ message: "تم إنشاء جميع الجداول بنجاح ✅" });
  } catch (error: any) {
    console.error("Init DB Error:", error);
    return NextResponse.json({ error: "فشل إنشاء الجداول: " + error.message }, { status: 500 });
  }
}