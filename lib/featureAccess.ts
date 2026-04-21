import { query } from "./db";

export interface AccessCheckResult {
  allowed: boolean;
  reason?: string;
  remainingTrials?: number;
  trialEndsAt?: Date;
  subscriptionExpiresAt?: Date;
}

/**
 * التحقق مما إذا كان بإمكان مستخدم/جهاز استخدام ميزة معينة
 */
export async function checkFeatureAccess(
  featureName: string,
  userId: number | null,
  deviceFingerprint: string | null
): Promise<AccessCheckResult> {
  // 1. حالة المستخدم المسجل
  if (userId) {
    // أ. التحقق من وجود اشتراك نشط للميزة
    const subRes = await query(
      `SELECT expires_at FROM subscriptions 
       WHERE user_id = $1 AND feature_name = $2 AND status = 'active' AND expires_at > NOW()`,
      [userId, featureName]
    );
    if (subRes.rowCount && subRes.rowCount > 0) {
      const expiresAt = new Date(subRes.rows[0].expires_at);
      return { allowed: true, subscriptionExpiresAt: expiresAt };
    }

    // ب. التحقق من الفترة التجريبية (14 يوماً من تاريخ إنشاء الحساب)
    const userRes = await query(
      `SELECT created_at FROM users WHERE id = $1`,
      [userId]
    );
    if (userRes.rowCount === 0) {
      return { allowed: false, reason: "المستخدم غير موجود" };
    }
    const createdAt = new Date(userRes.rows[0].created_at);
    const trialEndsAt = new Date(createdAt);
    trialEndsAt.setDate(trialEndsAt.getDate() + 14); // 14 يوماً تجريبية
    const now = new Date();

    if (now < trialEndsAt) {
      return { allowed: true, trialEndsAt };
    } else {
      return { allowed: false, reason: "انتهت الفترة التجريبية (14 يوماً). يرجى الاشتراك للمتابعة." };
    }
  }

  // 2. حالة المستخدم غير المسجل (زائر) - يعتمد على بصمة الجهاز
  if (!deviceFingerprint) {
    return { allowed: false, reason: "تعذر التعرف على الجهاز" };
  }

  const usageRes = await query(
    `SELECT usage_count FROM feature_usage_by_device 
     WHERE device_fingerprint = $1 AND feature_name = $2`,
    [deviceFingerprint, featureName]
  );

  const maxFreeTrials = 3;
  const currentCount = usageRes.rowCount ? usageRes.rows[0].usage_count : 0;

  if (currentCount < maxFreeTrials) {
    const remaining = maxFreeTrials - currentCount;
    return { allowed: true, remainingTrials: remaining };
  } else {
    return { 
      allowed: false, 
      reason: "لقد استنفدت المحاولات المجانية الثلاث. يرجى تسجيل الدخول للمتابعة.",
      remainingTrials: 0
    };
  }
}

/**
 * تسجيل استخدام ميزة (يزيد العداد)
 */
export async function recordFeatureUsage(
  featureName: string,
  userId: number | null,
  deviceFingerprint: string | null
): Promise<void> {
  if (userId) {
    // للمستخدم المسجل: سجل الاستخدام (للإحصاء فقط)
    await query(
      `INSERT INTO feature_usage_by_user (user_id, feature_name, usage_count)
       VALUES ($1, $2, 1)
       ON CONFLICT (user_id, feature_name) DO UPDATE
       SET usage_count = feature_usage_by_user.usage_count + 1`,
      [userId, featureName]
    );
  } else if (deviceFingerprint) {
    // للجهاز غير المسجل
    await query(
      `INSERT INTO feature_usage_by_device (device_fingerprint, feature_name, usage_count)
       VALUES ($1, $2, 1)
       ON CONFLICT (device_fingerprint, feature_name) DO UPDATE
       SET usage_count = feature_usage_by_device.usage_count + 1`,
      [deviceFingerprint, featureName]
    );
  }
}

/**
 * جلب عدد المحاولات المتبقية لميزة معينة (للعرض في الواجهة)
 */
export async function getRemainingTrials(
  featureName: string,
  deviceFingerprint: string | null
): Promise<number> {
  if (!deviceFingerprint) return 0;
  const res = await query(
    `SELECT usage_count FROM feature_usage_by_device 
     WHERE device_fingerprint = $1 AND feature_name = $2`,
    [deviceFingerprint, featureName]
  );
  const count = res.rowCount ? res.rows[0].usage_count : 0;
  return Math.max(0, 3 - count);
}