"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import LoginModal from "@/components/LoginModal";
import Link from "next/link";

// بيانات الميزات (12 ميزة)
const features = [
  {
    icon: "📸",
    title: "فحص نبتتك + المؤشر الآمن",
    description: "شخّص أمراض النباتات فوراً واحصل على خطوات علاجية دقيقة مع مؤشر خطورة.",
    price: "3 ريال/شهرياً",
  },
  {
    icon: "🌿",
    title: "علاجك يبدأ من الأعشاب",
    description: "استخدام آمن للأعشاب مع جرعات وطرق تحضير موثوقة حسب حالتك.",
    price: "2 ريال/شهرياً",
  },
  {
    icon: "💧",
    title: "ميزان الماء الذكي + جدول العناية",
    description: "جدول ري وتسميد ذكي مع تنبيهات يومية لتوفير الماء وتحسين النمو.",
    price: "2.5 ريال/شهرياً (شخصي)",
  },
  {
    icon: "🌾",
    title: "المحصول الأنسب لكل محافظة",
    description: "اختر المحصول المثالي حسب موقعك ومناخك مع نسبة نجاح متوقعة.",
    price: "3 ريال/شهرياً",
  },
  {
    icon: "👨‍🌾",
    title: "أي مزارع أنت",
    description: "مساعد شخصي يحدد مستواك ويقترح نباتات مناسبة وخطوات واضحة.",
    price: "2 ريال/شهرياً",
  },
  {
    icon: "🔮",
    title: "المساعد الزراعي التنبؤي",
    description: "تنبؤ بالمشاكل قبل حدوثها وتنبيهات وقائية لإنقاذ المحصول.",
    price: "4 ريال/شهرياً",
  },
  {
    icon: "👥",
    title: "المجتمع الزراعي العُماني",
    description: "تواصل مع مزارعين محليين، شارك تجاربك، واربح نقاطاً وتحديات.",
    price: "مجاني",
  },
  {
    icon: "🎙️",
    title: "الذكاء الاصطناعي للتسجيل الصوتي",
    description: "اشرح مشكلتك صوتياً، نحولها إلى تشخيص دقيق وخطة علاج مكتوبة.",
    price: "2 ريال/شهرياً",
  },
  {
    icon: "🌦️",
    title: "إدارة الأزمات المناخية الزراعية",
    description: "تنبيهات مناخية ذكية مرتبطة بمحاصيلك مع توصيات للحماية.",
    price: "3 ريال/شهرياً",
  },
  {
    icon: "🌸",
    title: "خدمة صناعة العطور",
    description: "صمم عطرك الخاص بخطوات موجهة ومكونات طبيعية تناسب ذوقك.",
    price: "3 ريال/كل شهرين",
  },
  {
    icon: "📦",
    title: "برنامج الإنتاج الوطني + التصدير",
    description: "نسوق إنتاجك محلياً ونوجه الفائض للتصدير بمعايير احترافية.",
    price: "5 ريال/شهرياً",
  },
  {
    icon: "🛒",
    title: "المتجر الزراعي الذكي",
    description: "منتجات زراعية مختارة حسب محصولك وموسمك، بدون تشتت.",
    price: "1.5 ريال + عمولة",
  },
];

// قائمة اللغات (20+ لغة)
const languages = [
  "العربية", "English", "فارسی", "Français", "Español", "Deutsch", "Italiano",
  "Português", "Русский", "中文", "日本語", "한국어", "हिन्दी", "اردو",
  "Kiswahili", "Türkçe", "Nederlands", "Svenska", "Polski", "ελληνικά",
  "עברית", "ไทย", "Tiếng Việt", "Bahasa Indonesia", "Melayu"
];

export default function Home() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [user, setUser] = useState<{ email: string; name?: string } | null>(null);

  useEffect(() => {
    // استعادة جلسة المستخدم عند التحميل
    const savedUser = localStorage.getItem("currentUser");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  return (
    <main className="min-h-screen">
      {/* الشريط العلوي المتدرج - عريض جداً (h-8) من الأخضر (يسار) إلى الأزرق (يمين) */}
      <div className="h-8 w-full bg-gradient-to-r from-green-800 to-sky-400"></div>

      {/* شريط التبويبات الأبيض */}
      <nav className="bg-white shadow-md py-3 px-6 md:px-12 flex items-center justify-between flex-wrap gap-4">
        {/* الشعار في أقصى اليسار */}
        <div className="flex items-center gap-2">
          <span className="text-3xl">🌱</span>
          <span className="text-2xl font-bold text-green-900">
            فلورا<span className="text-green-700">مايند</span>
          </span>
        </div>

        {/* التبويبات */}
        <div className="flex items-center gap-6 text-gray-800 font-medium">
          <a href="#" className="text-green-800 border-b-2 border-green-800 pb-1">
            الرئيسية
          </a>
          <button
            onClick={() => setIsLoginModalOpen(true)}
            className="hover:text-green-800 transition"
          >
            تسجيل الدخول
          </button>

          <a href="#" className="hover:text-green-800 transition">
            حول فلورا مايند
          </a>

          {/* تبويبة الاشتراكات الجديدة */}
          <Link href="/subscription" className="hover:text-green-800 transition">
            الاشتراكات
          </Link>

          {/* قائمة اللغة المنسدلة */}
          <div className="relative group">
            <button className="flex items-center gap-1 px-3 py-1 rounded-full border border-green-300 bg-green-50 hover:bg-green-100 transition">
              <span>🌐</span>
              <span className="text-sm">اللغة</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {/* القائمة المنسدلة */}
            <div className="absolute left-0 mt-2 w-56 max-h-80 overflow-y-auto bg-white rounded-lg shadow-2xl border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <ul className="py-2">
                {languages.map((lang, idx) => (
                  <li key={idx}>
                    <a
                      href="#"
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-800"
                    >
                      {lang}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* زر تسجيل الدخول الإضافي (يظهر للمستخدم غير المسجل) */}
        {!user ? (
          <button
            onClick={() => setIsLoginModalOpen(true)}
            className="bg-green-800 text-white px-5 py-2 rounded-full hover:bg-green-900 transition shadow-sm"
          >
            دخول
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-green-800 font-medium">👤 {user.email.split('@')[0]}</span>
            <button
              onClick={() => {
                localStorage.removeItem("currentUser");
                setUser(null);
              }}
              className="text-sm text-red-600 hover:underline"
            >
              خروج
            </button>
          </div>
        )}
      </nav>

      {/* قسم الصورة الرئيسية */}
<section className="relative w-full h-[80vh] min-h-[600px] flex items-end justify-start">
  {/* صورة خلفية */}
  <div className="absolute inset-0 -z-10">
    <Image
      src="https://images.pexels.com/photos/2933243/pexels-photo-2933243.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
      alt="مزرعة عُمانية"
      fill
      className="object-cover brightness-50"
      priority
      sizes="100vw"
    />
  </div>

  {/* النص في أسفل اليسار مع أحجام صغيرة */}
  <div className="text-white p-8 md:p-12">
    <h2 className="text-3xl md:text-4xl font-bold mb-3 drop-shadow-lg">
      سجل لدينا في المنصة
    </h2>
    <p
      onClick={() => {
        const featuresSection = document.getElementById("features-section");
        if (featuresSection) {
          featuresSection.scrollIntoView({ behavior: "smooth" });
        }
      }}
      className="text-lg md:text-xl mb-6 font-semibold bg-green-800/70 inline-block px-6 py-2 rounded-full backdrop-blur-sm cursor-pointer hover:bg-green-800/90 transition"
    >
      قم بتجريب الميزات لدينا مجاناً
    </p>
    <div>
      <button
        onClick={() => setIsLoginModalOpen(true)}
        className="bg-white text-green-900 px-8 py-3 rounded-full text-lg font-bold hover:bg-green-100 transition transform hover:scale-105 shadow-lg"
      >
        ابدأ الآن
      </button>
    </div>
  </div>
</section>

      {/* قسم الميزات (12 ميزة) */}
        <section id="features-section" className="max-w-7xl mx-auto px-4 md:px-8 py-24">
        <h2 className="text-4xl md:text-6xl font-extrabold text-center text-green-900 mb-20">
          ميزاتنا الذكية
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {features.map((feature, index) => {
            // تحديد رابط الصفحة حسب الميزة
            const featureLink = 
            index === 0 ? "/features/plant-scan" :
            index === 1 ? "/features/herbal-treatment" :
            index === 2 ? "/features/smart-irrigation" :
            index === 3 ? "/features/best-crop" :
            index === 4 ? "/features/farmer-level" :
            index === 5 ? "/features/predictive-assistant" :
            index === 6 ? "/features/farming-community" :
            index === 7 ? "/features/voice-ai" :
            index === 8 ? "/features/climate-crisis" :   // ← الميزة التاسعة
            "#";
  
            return (
              <div
                key={index}
                className="bg-white p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 border border-green-100 flex flex-col group hover:-translate-y-2"
              >
                {/* الرابط يغطي الأيقونة والعنوان والوصف */}
                <Link href={featureLink} className="block flex-grow">
                  <div className="text-6xl mb-6 transform transition-transform group-hover:scale-110">
                    {feature.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-green-900 mb-4 group-hover:text-green-700 transition">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    {feature.description}
                  </p>
                </Link>
      
                {/* السعر وزر التفاصيل (لصفحة الدفع لاحقاً) */}
                <div className="mt-6 pt-6 border-t border-green-200 flex justify-between items-center">
                  <span className="text-xl font-bold text-green-800">
                    {feature.price}
                  </span>
                  <button className="bg-green-100 text-green-800 px-5 py-2 rounded-full text-sm font-medium hover:bg-green-800 hover:text-white transition">
                    تفاصيل
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-center text-gray-500 mt-16 text-lg italic">
          * الميزات قابلة للزيادة حسب احتياجاتك
        </p>
      </section>

      {/* ========== الأقسام الإضافية ========== */}

      {/* 1. قسم "عن فلورا مايند" مع صورة هاتف */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 pb-24">
        <div className="bg-gradient-to-br from-green-50 to-sky-50 rounded-3xl p-8 md:p-12 shadow-lg border border-green-200">
          <div className="flex flex-col md:flex-row items-center gap-10">
            {/* النص */}
            <div className="md:w-2/3">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-4xl">🌱</span>
                <h2 className="text-3xl md:text-4xl font-bold text-green-900">
                  عن منصة فلورا مايند
                </h2>
              </div>
              <p className="text-gray-700 text-lg leading-loose mb-6">
                منصة فلورا مايند هي منصة زراعية ذكية تهدف إلى تمكين المزارعين والمهتمين بالزراعة في سلطنة عُمان والوطن العربي. نقدم مجموعة متكاملة من الخدمات التي تعتمد على الذكاء الاصطناعي وإنترنت الأشياء لتحسين الإنتاج الزراعي، وترشيد استهلاك المياه، وتشخيص أمراض النبات، وتوفير الإرشاد الزراعي المتخصص.
              </p>
              <p className="text-gray-700 text-lg leading-loose">
                سواء كنت مزارعاً محترفاً أو هاوياً مبتدئاً، فإن فلورا مايند تمنحك الأدوات اللازمة لمراقبة محاصيلك، وإدارة مزرعتك بكفاءة، والتواصل مع مجتمع من الخبراء والمزارعين.
              </p>
            </div>
            {/* صورة الهاتف */}
            <div className="md:w-1/3 flex justify-center">
              <div className="relative w-56 h-96 bg-gray-800 rounded-[3rem] border-4 border-gray-700 shadow-2xl overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-6 bg-black rounded-t-[2.5rem] flex justify-center">
                  <div className="w-20 h-5 bg-black absolute -top-1 rounded-full"></div>
                </div>
                <div className="h-full w-full bg-gradient-to-b from-green-700 to-green-900 flex flex-col items-center justify-center p-4 text-white">
                  <span className="text-5xl mb-4">🌿</span>
                  <span className="text-xl font-bold text-center">فلورا مايند</span>
                  <span className="text-xs mt-2 opacity-80">تطبيق المزارع الذكي</span>
                  <div className="mt-6 w-full h-1 bg-white/30 rounded"></div>
                  <div className="mt-2 w-3/4 h-1 bg-white/20 rounded"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. قسم "خدماتنا الأساسية" بتصميم متناوب */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 pb-24">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-green-900 mb-12">
          خدماتنا الأساسية
        </h2>
        <div className="space-y-12">
          {/* الخدمة 1: نص ثم صورة */}
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="md:w-1/2">
              <div className="text-5xl mb-4">📷</div>
              <h3 className="text-2xl font-bold text-green-900 mb-3">تشخيص الأمراض</h3>
              <p className="text-gray-700 leading-relaxed">
                صوّر نبتتك واحصل على تشخيص فوري مع خطة علاجية متكاملة. يستخدم نظامنا الذكاء الاصطناعي لتحليل الأعراض وتحديد المشكلة بدقة متناهية، مع خطوات علاجية واضحة ومؤشر خطورة يساعدك على اتخاذ القرار المناسب بسرعة.
              </p>
            </div>
            <div className="md:w-1/2 flex justify-center">
              <div className="relative w-full max-w-md h-64 rounded-2xl overflow-hidden shadow-lg">
                <Image src="https://images.pexels.com/photos/1459339/pexels-photo-1459339.jpeg?auto=compress&cs=tinysrgb&w=600" alt="تشخيص الأمراض" fill className="object-cover" />
              </div>
            </div>
          </div>
          {/* الخدمة 2: صورة ثم نص (عكس) */}
          <div className="flex flex-col md:flex-row-reverse items-center gap-8">
            <div className="md:w-1/2">
              <div className="text-5xl mb-4">💧</div>
              <h3 className="text-2xl font-bold text-green-900 mb-3">جدولة الري الذكي</h3>
              <p className="text-gray-700 leading-relaxed">
                وفر الماء مع تنبيهات مخصصة لكل محصول. يحدد نظامنا احتياجات الري بناءً على نوع النبات والمناخ والتربة، وينشئ جدولاً دقيقاً لمواعيد الري والتسميد مع إرسال إشعارات في الأوقات المناسبة، مما يقلل الهدر ويحسن النمو.
              </p>
            </div>
            <div className="md:w-1/2 flex justify-center">
              <div className="relative w-full max-w-md h-64 rounded-2xl overflow-hidden shadow-lg">
                <Image src="https://images.pexels.com/photos/2933243/pexels-photo-2933243.jpeg?auto=compress&cs=tinysrgb&w=600" alt="الري الذكي" fill className="object-cover" />
              </div>
            </div>
          </div>
          {/* الخدمة 3: نص ثم صورة */}
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="md:w-1/2">
              <div className="text-5xl mb-4">🌤️</div>
              <h3 className="text-2xl font-bold text-green-900 mb-3">تنبؤات الطقس الزراعي</h3>
              <p className="text-gray-700 leading-relaxed">
                احمِ محاصيلك من التقلبات المناخية المفاجئة. نراقب الطقس على مدار الساعة ونربط التوقعات بمحاصيلك لنرسل تنبيهات مبكرة مع توصيات عملية (مثل تقليل الري قبل موجة حر، أو تغطية النباتات قبل عاصفة ترابية). حافظ على إنتاجيتك وقلل الخسائر.
              </p>
            </div>
            <div className="md:w-1/2 flex justify-center">
              <div className="relative w-full max-w-md h-64 rounded-2xl overflow-hidden shadow-lg">
                <Image src="https://images.pexels.com/photos/2132177/pexels-photo-2132177.jpeg?auto=compress&cs=tinysrgb&w=600" alt="الطقس الزراعي" fill className="object-cover" />
              </div>
            </div>
          </div>
          {/* الخدمة 4: صورة ثم نص */}
          <div className="flex flex-col md:flex-row-reverse items-center gap-8">
            <div className="md:w-1/2">
              <div className="text-5xl mb-4">🛒</div>
              <h3 className="text-2xl font-bold text-green-900 mb-3">متجر المستلزمات الذكي</h3>
              <p className="text-gray-700 leading-relaxed">
                بذور وأسمدة وأدوات مختارة بعناية حسب محصولك وموسمك. لا مزيد من التشتت بين آلاف المنتجات — نقترح عليك فقط ما يناسب احتياجاتك الفعلية، مما يوفر وقتك وجهدك ويضمن حصولك على أفضل مستلزمات الزراعة.
              </p>
            </div>
            <div className="md:w-1/2 flex justify-center">
              <div className="relative w-full max-w-md h-64 rounded-2xl overflow-hidden shadow-lg">
                <Image src="https://images.pexels.com/photos/264537/pexels-photo-264537.jpeg?auto=compress&cs=tinysrgb&w=600" alt="متجر المستلزمات" fill className="object-cover" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. قسم "كيف تبدأ مع فلورا مايند؟" بتصميم متناوب مع صور */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 pb-24">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-green-900 mb-12">
          كيف تبدأ مع فلورا مايند؟
        </h2>
        <div className="space-y-12">
          {/* الخطوة 1: نص ثم صورة */}
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="md:w-1/2">
              <div className="text-6xl font-extrabold text-green-200 mb-4">01</div>
              <h3 className="text-2xl font-bold text-green-800 mb-3">أنشئ حسابك</h3>
              <p className="text-gray-700 leading-relaxed">
                سجل مجاناً وحدد نوع محاصيلك وموقع مزرعتك. بمجرد إنشاء حسابك، ستبدأ فترة تجريبية مجانية لمدة 7 أيام تتيح لك تجربة جميع الميزات دون حدود. كل ما تحتاجه هو بريد إلكتروني وكلمة مرور.
              </p>
            </div>
            <div className="md:w-1/2 flex justify-center">
              <div className="relative w-full max-w-md h-64 rounded-2xl overflow-hidden shadow-lg">
                <Image src="https://images.pexels.com/photos/3760067/pexels-photo-3760067.jpeg?auto=compress&cs=tinysrgb&w=600" alt="إنشاء حساب" fill className="object-cover" />
              </div>
            </div>
          </div>
          {/* الخطوة 2: صورة ثم نص */}
          <div className="flex flex-col md:flex-row-reverse items-center gap-8">
            <div className="md:w-1/2">
              <div className="text-6xl font-extrabold text-green-200 mb-4">02</div>
              <h3 className="text-2xl font-bold text-green-800 mb-3">اختر الخدمات</h3>
              <p className="text-gray-700 leading-relaxed">
                فعّل الميزات التي تحتاجها مثل فحص النبات، جدول الري، أو التنبؤات المناخية. يمكنك الاشتراك في أي ميزة بشكل منفصل — ادفع فقط لما تستخدمه. خطط شهرية وسنوية مرنة تناسب احتياجاتك.
              </p>
            </div>
            <div className="md:w-1/2 flex justify-center">
              <div className="relative w-full max-w-md h-64 rounded-2xl overflow-hidden shadow-lg">
                <Image src="https://images.pexels.com/photos/590022/pexels-photo-590022.jpeg?auto=compress&cs=tinysrgb&w=600" alt="اختر الخدمات" fill className="object-cover" />
              </div>
            </div>
          </div>
          {/* الخطوة 3: نص ثم صورة */}
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="md:w-1/2">
              <div className="text-6xl font-extrabold text-green-200 mb-4">03</div>
              <h3 className="text-2xl font-bold text-green-800 mb-3">انطلق مع مجتمعك</h3>
              <p className="text-gray-700 leading-relaxed">
                تواصل مع خبراء ومزارعين آخرين في مجتمع فلورا مايند. شارك تجاربك، اطرح أسئلتك، وتعلم من نجاحات الآخرين. شارك في التحديات الأسبوعية واربح نقاطاً وجوائز. الزراعة أسهل وأمتع مع مجتمع داعم.
              </p>
            </div>
            <div className="md:w-1/2 flex justify-center">
              <div className="relative w-full max-w-md h-64 rounded-2xl overflow-hidden shadow-lg">
                <Image src="https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=600" alt="مجتمع المزارعين" fill className="object-cover" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* تذييل مع أيقونات التواصل الاجتماعي */}
      <footer className="border-t border-green-200 py-10 text-center text-gray-500">
        <p className="text-lg">© 2026 فلورا مايند - جميع الحقوق محفوظة</p>
        <p className="mt-3 text-base">منصة زراعية ذكية تخدم المزارع العُماني</p>
        <div className="flex justify-center gap-6 mt-6">
          <a href="https://instagram.com/floramind" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-green-800 transition">
            <span className="text-2xl">📸</span>
            <span className="sr-only">Instagram</span>
          </a>
          <a href="https://tiktok.com/@floramind" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-green-800 transition">
            <span className="text-2xl">🎵</span>
            <span className="sr-only">TikTok</span>
          </a>
          <a href="https://twitter.com/floramind" target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-green-800 transition">
            <span className="text-2xl">🐦</span>
            <span className="sr-only">X (Twitter)</span>
          </a>
        </div>
      </footer>

      {/* مكون تسجيل الدخول المنبثق */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={(loggedUser) => {
          setUser(loggedUser);
          localStorage.setItem("currentUser", JSON.stringify(loggedUser));
        }}
      />
    </main>
  );
}