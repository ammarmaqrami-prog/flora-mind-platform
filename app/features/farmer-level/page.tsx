"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation"; // ✅ تمت الإضافة
import LoginModal from "@/components/LoginModal";
import { generateDeviceFingerprint } from "@/lib/deviceFingerprint";

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function FarmerLevelPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"questionnaire" | "chat">("questionnaire");

  // حالة النموذج
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"questions" | "result">("questions");
  const [result, setResult] = useState<any>(null);
  const [experience, setExperience] = useState("");
  const [goal, setGoal] = useState("");
  const [space, setSpace] = useState("");
  const [waterAvailability, setWaterAvailability] = useState("");

  // حالة المحادثة
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string; images?: string[]; isError?: boolean }[]>([
    { role: "assistant", content: "مرحباً! أنا مساعدك الشخصي. يمكنك سؤالي عن أي شيء يخص الزراعة حسب مستواك. بعد تحديد مستواك من التبويب الأول، سأتمكن من تقديم إجابات مخصصة لك." },
  ]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);

  // التحقق من تسجيل الدخول
  useEffect(() => {
    const savedUser = localStorage.getItem("currentUser");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // التمرير التلقائي في المحادثة
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // تنظيف المؤثرات
  useEffect(() => {
    return () => {
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
      if (recognitionRef.current) recognitionRef.current.stop();
    };
  }, []);

  const cleanMarkdown = (text: string): string => {
    return text
      .replace(/\*\*\*(.*?)\*\*\*/g, "$1")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/__(.*?)__/g, "$1")
      .replace(/~~(.*?)~~/g, "$1")
      .replace(/`(.*?)`/g, "$1")
      .trim();
  };

  const typeWriterEffect = (fullText: string, callback: (partial: string) => void, speed: number = 30) => {
    if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
    const cleanedText = cleanMarkdown(fullText);
    let index = 0;
    const interval = setInterval(() => {
      if (index < cleanedText.length) {
        callback(cleanedText.substring(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
        typingIntervalRef.current = null;
      }
    }, speed);
    typingIntervalRef.current = interval;
    return () => clearInterval(interval);
  };

  // ---- دالة إرسال النموذج ----
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setIsLoginModalOpen(true);
      return;
    }
    if (!experience || !goal || !space || !waterAvailability) {
      alert("الرجاء الإجابة على جميع الأسئلة");
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/classify-farmer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ experience, goal, space, waterAvailability }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        setStep("result");
        const updatedUser = { ...user, farmerProfile: data };
        localStorage.setItem("currentUser", JSON.stringify(updatedUser));
        setUser(updatedUser);
        // أضف رسالة ترحيب في المساعد
        setMessages([{
          role: "assistant",
          content: `تم تصنيفك كـ ${data.classification}. الآن يمكنك سؤالي أي سؤال عن الزراعة وسأجيبك بناءً على مستواك!`
        }]);
      } else {
        alert(data.error || "حدث خطأ");
      }
    } catch (error) {
      alert("فشل الاتصال بالخادم");
    } finally {
      setIsLoading(false);
    }
  };

  // ---- دوال المحادثة ----
  const callChatAPI = async (userMessage: string, images?: string[], isRetry: boolean = false) => {
    if (!isRetry) {
      setMessages(prev => [...prev, { role: "user", content: userMessage, images }]);
    }
    setChatLoading(true);
    try {
      const token = localStorage.getItem("token");
      const fingerprint = generateDeviceFingerprint();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          message: userMessage,
          images: images || [],
          featureName: "أي مزارع أنت",
          deviceFingerprint: fingerprint,
        }),
      });
      const data = await res.json();
      if (data.reply) {
        setMessages(prev => [...prev, { role: "assistant", content: "" }]);
        typeWriterEffect(data.reply, (partial) => {
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { ...updated[updated.length - 1], content: partial };
            return updated;
          });
        }, 30);
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: `خطأ: ${data.error || "لم يتم الرد"}`, isError: true }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: "assistant", content: "حدث خطأ في الاتصال.", isError: true }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSendMessage = () => {
    if (!input.trim() && selectedImages.length === 0) return;
    callChatAPI(input, selectedImages);
    setInput("");
    setSelectedImages([]);
  };

  const handleRetryLastMessage = () => {
    const lastUserMsg = [...messages].reverse().find(m => m.role === "user");
    if (!lastUserMsg) return;
    setMessages(prev => prev.slice(0, -1));
    callChatAPI(lastUserMsg.content, lastUserMsg.images, true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newImages: string[] = [];
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        if (ev.target?.result) {
          newImages.push(ev.target.result as string);
          if (newImages.length === files.length) {
            setSelectedImages(prev => [...prev, ...newImages]);
          }
        }
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const removeSelectedImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const startVoiceRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("متصفحك لا يدعم التسجيل الصوتي.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "ar-OM";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev + (prev ? " " : "") + transcript);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopVoiceRecording = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  };

  const handleLoginSuccess = (loggedUser: any) => {
    setUser(loggedUser);
    localStorage.setItem("currentUser", JSON.stringify(loggedUser));
    setIsLoginModalOpen(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4 text-lg text-gray-700">يجب تسجيل الدخول لاستخدام هذه الميزة</p>
          <button onClick={() => setIsLoginModalOpen(true)} className="bg-green-800 text-white px-6 py-3 rounded-full">
            تسجيل الدخول
          </button>
          <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} onLoginSuccess={handleLoginSuccess} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="h-8 w-full bg-gradient-to-r from-green-800 to-sky-400"></div>

      <nav className="bg-white shadow-md py-3 px-6 md:px-12 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-3xl">👨‍🌾</span>
          <span className="text-2xl font-bold text-green-900">فلورا<span className="text-green-700">مايند</span></span>
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-green-800">👤 {user.email?.split('@')[0]}</span>
          <Link href="/" className="text-green-800 hover:underline">العودة للرئيسية</Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-12">
        <div className="flex items-center gap-4 mb-8">
          <span className="text-6xl">👨‍🌾</span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-green-900">أي مزارع أنت</h1>
        </div>

        {/* التبويبات */}
        <div className="flex gap-4 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("questionnaire")}
            className={`pb-3 px-4 text-lg font-medium transition ${
              activeTab === "questionnaire"
                ? "text-green-800 border-b-2 border-green-800"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            📋 تحديد المستوى
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={`pb-3 px-4 text-lg font-medium transition ${
              activeTab === "chat"
                ? "text-green-800 border-b-2 border-green-800"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            💬 المساعد الذكي
          </button>
        </div>

        {/* محتوى التبويب النشط */}
        {activeTab === "questionnaire" ? (
          step === "questions" ? (
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-lg border border-green-100">
              <p className="text-gray-700 text-lg mb-6">
                أجب عن الأسئلة التالية لنتمكن من فهم احتياجاتك الزراعية وتقديم توصيات مخصصة لك في جميع خدمات المنصة.
              </p>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* الخبرة */}
                <div>
                  <label className="block text-lg font-medium text-green-900 mb-3">ما مدى خبرتك في الزراعة؟</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      { value: "beginner", label: "مبتدئ", desc: "ليس لدي خبرة سابقة" },
                      { value: "intermediate", label: "متوسط", desc: "لدي بعض المعرفة الأساسية" },
                      { value: "advanced", label: "متقدم", desc: "أمارس الزراعة منذ سنوات" },
                    ].map((opt) => (
                      <label key={opt.value} className={`flex flex-col items-center p-4 border-2 rounded-xl cursor-pointer ${experience === opt.value ? "border-green-600 bg-green-50" : "border-gray-200 hover:border-green-300"}`}>
                        <input type="radio" name="experience" value={opt.value} checked={experience === opt.value} onChange={(e) => setExperience(e.target.value)} className="sr-only" />
                        <span className="font-bold text-green-800 mb-1">{opt.label}</span>
                        <span className="text-sm text-gray-500">{opt.desc}</span>
                      </label>
                    ))}
                  </div>
                </div>
                {/* الهدف */}
                <div>
                  <label className="block text-lg font-medium text-green-900 mb-3">ما هو هدفك الرئيسي من الزراعة؟</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { value: "home", label: "استهلاك منزلي", icon: "🏡" },
                      { value: "commercial", label: "بيع تجاري", icon: "💰" },
                      { value: "investment", label: "استثمار طويل الأجل", icon: "📈" },
                      { value: "hobby", label: "هواية وتسلية", icon: "🌻" },
                    ].map((opt) => (
                      <label key={opt.value} className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer ${goal === opt.value ? "border-green-600 bg-green-50" : "border-gray-200 hover:border-green-300"}`}>
                        <input type="radio" name="goal" value={opt.value} checked={goal === opt.value} onChange={(e) => setGoal(e.target.value)} className="sr-only" />
                        <span className="text-2xl">{opt.icon}</span>
                        <span className="font-medium text-gray-800">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                {/* المساحة */}
                <div>
                  <label className="block text-lg font-medium text-green-900 mb-3">ما المساحة المتوفرة لديك للزراعة؟</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      { value: "small", label: "صغيرة", desc: "شرفة أو حديقة منزلية" },
                      { value: "medium", label: "متوسطة", desc: "فناء أو قطعة أرض صغيرة" },
                      { value: "large", label: "كبيرة", desc: "مزرعة أو أرض واسعة" },
                    ].map((opt) => (
                      <label key={opt.value} className={`flex flex-col items-center p-4 border-2 rounded-xl cursor-pointer ${space === opt.value ? "border-green-600 bg-green-50" : "border-gray-200 hover:border-green-300"}`}>
                        <input type="radio" name="space" value={opt.value} checked={space === opt.value} onChange={(e) => setSpace(e.target.value)} className="sr-only" />
                        <span className="font-bold text-green-800 mb-1">{opt.label}</span>
                        <span className="text-sm text-gray-500">{opt.desc}</span>
                      </label>
                    ))}
                  </div>
                </div>
                {/* توفر الماء */}
                <div>
                  <label className="block text-lg font-medium text-green-900 mb-3">ما مدى توفر المياه لديك؟</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { value: "abundant", label: "وفيرة", desc: "مياه متاحة بكميات كافية" },
                      { value: "limited", label: "محدودة", desc: "أعاني من شح المياه" },
                    ].map((opt) => (
                      <label key={opt.value} className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer ${waterAvailability === opt.value ? "border-green-600 bg-green-50" : "border-gray-200 hover:border-green-300"}`}>
                        <input type="radio" name="waterAvailability" value={opt.value} checked={waterAvailability === opt.value} onChange={(e) => setWaterAvailability(e.target.value)} className="sr-only" />
                        <span className="text-2xl">{opt.value === "abundant" ? "💧" : "🌵"}</span>
                        <span className="font-medium text-gray-800">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <button type="submit" disabled={isLoading} className="w-full bg-green-800 text-white py-4 rounded-full font-bold text-lg hover:bg-green-900 transition disabled:opacity-50">
                  {isLoading ? "جاري تحليل إجاباتك..." : "اكتشف أي مزارع أنت"}
                </button>
              </form>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-lg border border-green-100">
              <div className="text-center mb-8">
                <div className="text-6xl mb-4">{result?.icon || "🌱"}</div>
                <h2 className="text-3xl font-bold text-green-900 mb-2">{result?.classification || "تم تصنيفك"}</h2>
                <p className="text-lg text-gray-600">{result?.description}</p>
              </div>
              <div className="bg-green-50 rounded-xl p-6 mb-6">
                <h3 className="font-bold text-green-900 text-xl mb-3">نصائح مخصصة لك</h3>
                <ul className="space-y-2 text-gray-700">
                  {result?.tips?.map((tip: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2"><span className="text-green-600">✅</span>{tip}</li>
                  ))}
                </ul>
              </div>
              <div className="bg-amber-50 rounded-xl p-6 mb-6">
                <h3 className="font-bold text-amber-800 text-xl mb-3">أدوات وموارد مقترحة</h3>
                <ul className="space-y-2 text-gray-700">
                  {result?.tools?.map((tool: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-2"><span className="text-amber-600">🛠️</span>{tool}</li>
                  ))}
                </ul>
              </div>
              <div className="flex gap-4">
                <button onClick={() => setStep("questions")} className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-full font-medium hover:bg-gray-300">إعادة الاختبار</button>
                <button onClick={() => setActiveTab("chat")} className="flex-1 bg-green-800 text-white py-3 rounded-full font-bold hover:bg-green-900">تحدث مع المساعد</button>
              </div>
            </div>
          )
        ) : (
          // تبويب المساعد الذكي
          <div className="bg-white rounded-2xl shadow-xl border border-green-200 overflow-hidden" ref={chatContainerRef}>
            <div className="h-96 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl p-4 ${msg.role === "user" ? "bg-green-800 text-white" : "bg-white border border-gray-200 text-gray-800 shadow-sm"}`}>
                    {msg.images && msg.images.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-2">
                        {msg.images.map((img, i) => (
                          <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden">
                            <Image src={img} alt={`upload-${i}`} fill className="object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{cleanMarkdown(msg.content)}</p>
                    {msg.role === "assistant" && msg.isError && (
                      <button onClick={handleRetryLastMessage} className="mt-2 text-sm text-green-700 border border-green-300 rounded-full px-3 py-1 bg-green-50">
                        🔄 إعادة المحاولة
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-2xl p-4">
                    <div className="flex space-x-2 rtl:space-x-reverse">
                      <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce delay-100" />
                      <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce delay-200" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {selectedImages.length > 0 && (
              <div className="px-4 py-2 bg-gray-100 border-t flex flex-wrap gap-2">
                {selectedImages.map((img, idx) => (
                  <div key={idx} className="relative w-12 h-12 rounded overflow-hidden border">
                    <Image src={img} alt="preview" fill className="object-cover" />
                    <button onClick={() => removeSelectedImage(idx)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs">×</button>
                  </div>
                ))}
                <span className="text-sm text-gray-600 ml-auto">{selectedImages.length} صورة</span>
              </div>
            )}

            <div className="border-t border-gray-200 p-4 flex items-center gap-2 bg-white">
              <input type="file" accept="image/*" multiple onChange={handleImageUpload} ref={fileInputRef} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} className="p-3 text-gray-600 hover:bg-green-50 rounded-full" title="رفع صور">📎</button>
              <button onClick={isRecording ? stopVoiceRecording : startVoiceRecording} className={`p-3 rounded-full ${isRecording ? "bg-red-500 text-white" : "text-gray-600 hover:bg-green-50"}`} title={isRecording ? "إيقاف" : "تسجيل"}>🎤</button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder={isRecording ? "🎙️ جاري الاستماع..." : "اسألني عن الزراعة..."}
                className="flex-1 border border-gray-300 rounded-full px-5 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                dir="rtl"
                disabled={chatLoading || isRecording}
              />
              <button onClick={handleSendMessage} disabled={chatLoading} className="bg-green-800 text-white p-3 rounded-full hover:bg-green-900 disabled:opacity-50">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19V5m-7 7l7-7 7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>

      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} onLoginSuccess={handleLoginSuccess} />
      <footer className="border-t border-green-200 py-8 text-center text-gray-500 mt-16">
        <p>© 2026 فلورا مايند - جميع الحقوق محفوظة</p>
      </footer>
    </div>
  );
}