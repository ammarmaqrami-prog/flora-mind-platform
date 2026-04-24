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

    // 4. إنشاء جدول الاشتراكات الأساسي
    await query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          plan_name VARCHAR(50) NOT NULL,
          status VARCHAR(20) DEFAULT 'active',
          started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP,
          auto_renew BOOLEAN DEFAULT TRUE
      );
    `);

    // 5. إنشاء جدول تتبع استخدام الأجهزة 
    await query(`
      CREATE TABLE IF NOT EXISTS feature_usage_by_device (
          id SERIAL PRIMARY KEY,
          device_fingerprint VARCHAR(255) NOT NULL,
          used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 6. إنشاء جدول تتبع استخدام المستخدمين
    await query(`
      CREATE TABLE IF NOT EXISTS feature_usage_by_user (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // =========================================================
    // 🚀 الحل السحري هنا: إضافة الأعمدة الناقصة إجبارياً إن لم تكن موجودة
    // =========================================================
    
    // إضافة بيانات المزارع لجدول المستخدمين
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS farmer_type VARCHAR(100);`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS experience_level VARCHAR(100);`);

    // إضافة عمود feature_name لجدول الاشتراكات
    await query(`ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS feature_name VARCHAR(100);`);
    
    // إضافة الأعمدة الناقصة لجدول تتبع الأجهزة
    await query(`ALTER TABLE feature_usage_by_device ADD COLUMN IF NOT EXISTS feature_name VARCHAR(255);`);
    await query(`ALTER TABLE feature_usage_by_device ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;`);
    
    // إضافة الأعمدة الناقصة لجدول تتبع المستخدمين المسجلين
    await query(`ALTER TABLE feature_usage_by_user ADD COLUMN IF NOT EXISTS feature_name VARCHAR(255);`);
    await query(`ALTER TABLE feature_usage_by_user ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;`);
    
    // إضافة القيود (UNIQUE constraints) لمنع تكرار البيانات
    await query(`ALTER TABLE feature_usage_by_device DROP CONSTRAINT IF EXISTS unique_device_feature;`);
    await query(`ALTER TABLE feature_usage_by_device ADD CONSTRAINT unique_device_feature UNIQUE(device_fingerprint, feature_name);`);
    
    await query(`ALTER TABLE feature_usage_by_user DROP CONSTRAINT IF EXISTS unique_user_feature;`);
    await query(`ALTER TABLE feature_usage_by_user ADD CONSTRAINT unique_user_feature UNIQUE(user_id, feature_name);`);

    // =========================================================

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

    return NextResponse.json({ message: "تم إصلاح الجداول وإضافة الأعمدة بنجاح ✅" });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}