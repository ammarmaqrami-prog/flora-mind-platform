"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// بيانات الميزات والأسعار
const featuresList = [
  {
    id: "plant-scan",
    name: "فحص نبتتك + المؤشر الآمن",
    icon: "📸",
    description: "شخّص أمراض النباتات فوراً مع خطوات علاجية",
    monthlyPrice: 3,
    yearlyPrice: 30,
  },
  {
    id: "herbal-treatment",
    name: "علاجك يبدأ من الأعشاب",
    icon: "🌿",
    description: "استخدام آمن للأعشاب مع جرعات وطرق تحضير",
    monthlyPrice: 2,
    yearlyPrice: 20,
  },
  {
    id: "smart-irrigation",
    name: "ميزان الماء الذكي + جدول العناية",
    icon: "💧",
    description: "جدول ري وتسميد ذكي مع تنبيهات يومية",
    monthlyPrice: 2.5,
    yearlyPrice: 25,
  },
  {
    id: "best-crop",
    name: "المحصول الأنسب لكل محافظة",
    icon: "🌾",
    description: "اختر المحصول المثالي حسب موقعك ومناخك",
    monthlyPrice: 3,
    yearlyPrice: 30,
  },
  {
    id: "farmer-level",
    name: "أي مزارع أنت",
    icon: "👨‍🌾",
    description: "مساعد شخصي يحدد مستواك ويقترح نباتات",
    monthlyPrice: 2,
    yearlyPrice: 20,
  },
  {
    id: "predictive-assistant",
    name: "المساعد الزراعي التنبؤي",
    icon: "🔮",
    description: "تنبؤ بالمشاكل قبل حدوثها وتنبيهات وقائية",
    monthlyPrice: 4,
    yearlyPrice: 40,
  },
  {
    id: "farming-community",
    name: "المجتمع الزراعي العُماني",
    icon: "👥",
    description: "تواصل مع مزارعين محليين وشارك تجاربك",
    monthlyPrice: 0,
    yearlyPrice: 0,
  },
  {
    id: "voice-ai",
    name: "الذكاء الاصطناعي للتسجيل الصوتي",
    icon: "🎙️",
    description: "اشرح مشكلتك صوتياً نحولها لتشخيص دقيق",
    monthlyPrice: 2,
    yearlyPrice: 20,
  },
  {
    id: "climate-crisis",
    name: "إدارة الأزمات المناخية الزراعية",
    icon: "🌦️",
    description: "تنبيهات مناخية ذكية لحماية محاصيلك",
    monthlyPrice: 3,
    yearlyPrice: 30,
  },
  {
    id: "perfume",
    name: "خدمة صناعة العطور",
    icon: "🌸",
    description: "صمم عطرك الخاص بخطوات موجهة",
    monthlyPrice: 3,
    yearlyPrice: 30,
  },
  {
    id: "export",
    name: "برنامج الإنتاج الوطني + التصدير",
    icon: "📦",
    description: "نسوق إنتاجك محلياً ودولياً",
    monthlyPrice: 5,
    yearlyPrice: 50,
  },
  {
    id: "store",
    name: "المتجر الزراعي الذكي",
    icon: "🛒",
    description: "منتجات مختارة حسب محصولك وموسمك",
    monthlyPrice: 1.5,
    yearlyPrice: 15,
  },
];

export default function SubscriptionPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [user, setUser] = useState<any>(null);
  const [loadingFeature, setLoadingFeature] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const savedUser = localStorage.getItem("currentUser");
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  const handleSubscribe = async (featureId: string, featureName: string) => {
    if (!user) {
      router.push("/?login=true");
      return;
    }
    
    const price = billingCycle === "monthly"
      ? featuresList.find(f => f.id === featureId)?.monthlyPrice
      : featuresList.find(f => f.id === featureId)?.yearlyPrice;
      
    // توجيه إلى صفحة الدفع التجريبية
    router.push(`/payment-demo?feature=${encodeURIComponent(featureName)}&amount=${price}&cycle=${billingCycle}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="h-8 w-full bg-gradient-to-r from-green-800 to-sky-400"></div>

      <nav className="bg-white shadow-md py-3 px-6 md:px-12 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-3xl">🌱</span>
          <span className="text-2xl font-bold text-green-900">فلورا<span className="text-green-700">مايند</span></span>
        </Link>
        <Link href="/" className="text-green-800 hover:underline">العودة للرئيسية</Link>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-extrabold text-center text-green-900 mb-4">اختر خطتك</h1>
        <p className="text-center text-gray-600 mb-8">اشترك في الميزات التي تحتاجها. وفر حتى 20% مع الخطط السنوية!</p>

        <div className="flex justify-center gap-4 mb-12">
          <button
            onClick={() => setBillingCycle("monthly")}
            className={`px-6 py-2 rounded-full font-semibold ${billingCycle === "monthly" ? "bg-green-800 text-white" : "bg-gray-200 text-gray-700"}`}
          >
            شهري
          </button>
          <button
            onClick={() => setBillingCycle("yearly")}
            className={`px-6 py-2 rounded-full font-semibold ${billingCycle === "yearly" ? "bg-green-800 text-white" : "bg-gray-200 text-gray-700"}`}
          >
            سنوي (خصم 20%)
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {featuresList.map((feature) => (
            <div key={feature.id} className="bg-white rounded-2xl p-6 shadow-lg border border-green-100 flex flex-col">
              <div className="text-5xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-bold text-green-900 mb-2">{feature.name}</h3>
              <p className="text-gray-600 mb-4 flex-grow">{feature.description}</p>
              
              <div className="mb-4">
                <span className="text-3xl font-bold text-green-800">
                  {billingCycle === "monthly" ? feature.monthlyPrice : feature.yearlyPrice} ريال
                </span>
                <span className="text-gray-500 text-sm"> / {billingCycle === "monthly" ? "شهر" : "سنة"}</span>
              </div>

              {billingCycle === "yearly" && (
                <p className="text-sm text-green-600 mb-3">💚 شهرين مجاناً مع الخطة السنوية</p>
              )}

              <button
                onClick={() => handleSubscribe(feature.id, feature.name)}
                disabled={loadingFeature === feature.id}
                className="bg-green-800 text-white py-3 rounded-full font-semibold hover:bg-green-900 transition disabled:opacity-50"
              >
                {loadingFeature === feature.id ? "جاري..." : "اشترك الآن"}
              </button>
            </div>
          ))}
        </div>

        {!user && (
          <div className="text-center mt-8 text-amber-700 bg-amber-50 p-4 rounded-xl">
            ⚡ يجب <button onClick={() => router.push("/?login=true")} className="font-bold underline">تسجيل الدخول</button> للاشتراك.
          </div>
        )}
      </div>
    </div>
  );
}