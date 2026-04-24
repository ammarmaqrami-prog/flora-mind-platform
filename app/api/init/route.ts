import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    // 1. إنشاء جدول المستخدمين
    await query(`
      CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE,
          phone VARCHAR(20) UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          full_name VARCHAR(100),
          is_verified BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. إنشاء جدول رموز التحقق
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

    // 3. إنشاء جدول أجهزة المستخدمين
    await query(`
      CREATE TABLE IF NOT EXISTS user_devices (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          device_fingerprint VARCHAR(255) NOT NULL,
          last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, device_fingerprint)
      );
    `);

    // 4. إنشاء جدول الاشتراكات (تمت إضافة feature_name ليتوافق مع featureAccess)
    await query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          plan_name VARCHAR(50) NOT NULL,
          feature_name VARCHAR(100), 
          status VARCHAR(20) DEFAULT 'active',
          started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP,
          auto_renew BOOLEAN DEFAULT TRUE
      );
    `);

    // 5. إنشاء جدول تتبع استخدام الأجهزة (للزوار - لحل مشكلة الخطأ)
    await query(`
      CREATE TABLE IF NOT EXISTS feature_usage_by_device (
          id SERIAL PRIMARY KEY,
          device_fingerprint VARCHAR(255) NOT NULL,
          feature_name VARCHAR(255) NOT NULL,
          usage_count INTEGER DEFAULT 0,
          used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(device_fingerprint, feature_name)
      );
    `);

    // 6. إنشاء جدول تتبع استخدام المستخدمين المسجلين
    await query(`
      CREATE TABLE IF NOT EXISTS feature_usage_by_user (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          feature_name VARCHAR(255) NOT NULL,
          usage_count INTEGER DEFAULT 0,
          used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, feature_name)
      );
    `);

    // دالة تحديث updated_at
    await query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // محفز (Trigger)
    await query(`
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at
          BEFORE UPDATE ON users
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
    `);

    // فهارس (Indexes) لتسريع البحث
    await query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_verification_tokens_user_id ON verification_tokens(user_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_verification_tokens_token ON verification_tokens(token);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_user_devices_fingerprint ON user_devices(device_fingerprint);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_feature_usage_device ON feature_usage_by_device(device_fingerprint);`);

    return NextResponse.json({ message: "تم إنشاء جميع الجداول بنجاح ✅" });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}