"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { generateDeviceFingerprint } from "@/lib/deviceFingerprint";
import LoginModal from "@/components/LoginModal";

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function BestCropPage() {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string; images?: string[]; isError?: boolean }[]>([
    { role: "assistant", content: "مرحباً! أنا مساعدك في اختيار المحصول الأنسب. أخبرني عن محافظتك أو منطقتك، وسأقترح لك أفضل المحاصيل التي تناسب مناخ وتربة منطقتك مع نسبة نجاح متوقعة." },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [remainingTrials, setRemainingTrials] = useState<number | null>(null);
  const [trialEndsAt, setTrialEndsAt] = useState<Date | null>(null);
  const [subscriptionExpiresAt, setSubscriptionExpiresAt] = useState<Date | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [user, setUser] = useState<{ email: string; name?: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("currentUser");
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  useEffect(() => {
    checkAccess();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  const checkAccess = async () => {
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
          message: "",
          images: [],
          featureName: "المحصول الأنسب لكل محافظة",
          deviceFingerprint: fingerprint,
        }),
      });

      const data = await res.json();
      if (res.status === 403) {
        setIsBlocked(true);
        setBlockReason(data.error || "غير مسموح باستخدام هذه الميزة");
      } else {
        setIsBlocked(false);
        setRemainingTrials(data.remainingTrials ?? null);
        setTrialEndsAt(data.trialEndsAt ? new Date(data.trialEndsAt) : null);
        setSubscriptionExpiresAt(data.subscriptionExpiresAt ? new Date(data.subscriptionExpiresAt) : null);
      }
    } catch (error) {
      console.error("فشل التحقق من الصلاحية", error);
    }
  };

  const callChatAPI = async (userMessage: string, images?: string[], isRetry: boolean = false) => {
    if (isBlocked) {
      setMessages(prev => [...prev, { role: "assistant", content: blockReason, isError: true }]);
      return;
    }

    if (!isRetry) {
      const userMsg = { role: "user" as const, content: userMessage, images: images };
      setMessages(prev => [...prev, userMsg]);
    }

    setIsLoading(true);
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
          featureName: "المحصول الأنسب لكل محافظة",
          deviceFingerprint: fingerprint,
        }),
      });
      const data = await res.json();

      if (res.status === 403) {
        setIsBlocked(true);
        setBlockReason(data.error || "غير مسموح باستخدام هذه الميزة");
        setMessages(prev => [...prev, { role: "assistant", content: data.error || "محظور", isError: true }]);
        return;
      }

      if (data.reply) {
        setRemainingTrials(data.remainingTrials ?? null);
        setTrialEndsAt(data.trialEndsAt ? new Date(data.trialEndsAt) : null);
        setSubscriptionExpiresAt(data.subscriptionExpiresAt ? new Date(data.subscriptionExpiresAt) : null);
        setMessages(prev => [...prev, { role: "assistant", content: "" }]);
        typeWriterEffect(data.reply, (partial) => {
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { ...updated[updated.length - 1], content: partial };
            return updated;
          });
        }, 30);
      } else if (data.error) {
        setMessages(prev => [...prev, { role: "assistant", content: `خطأ: ${data.error}`, isError: true }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: "assistant", content: "حدث خطأ في الاتصال بالخادم.", isError: true }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = () => {
    if (!input.trim() && selectedImages.length === 0) return;
    callChatAPI(input, selectedImages);
    setInput("");
    setSelectedImages([]);
  };

  const handleRetryLastMessage = () => {
    const lastUserMsgIndex = [...messages].reverse().findIndex(msg => msg.role === "user");
    if (lastUserMsgIndex === -1) return;
    const actualIndex = messages.length - 1 - lastUserMsgIndex;
    const lastUserMsg = messages[actualIndex];
    setMessages(prev => prev.slice(0, -1));
    callChatAPI(lastUserMsg.content, lastUserMsg.images, true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newImages: string[] = [];
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          newImages.push(event.target.result as string);
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
      alert("عذراً، متصفحك لا يدعم التسجيل الصوتي. استخدم Chrome أو Edge.");
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
    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsRecording(false);
      if (event.error === "not-allowed") {
        alert("الرجاء السماح للموقع باستخدام الميكروفون.");
      }
    };
    recognition.onend = () => setIsRecording(false);
    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopVoiceRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleVoiceRecording = () => {
    isRecording ? stopVoiceRecording() : startVoiceRecording();
  };

  const handleLoginSuccess = (loggedUser: any) => {
    setUser(loggedUser);
    localStorage.setItem("currentUser", JSON.stringify(loggedUser));
    setIsLoginModalOpen(false);
    setIsBlocked(false);
    checkAccess();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="h-8 w-full bg-gradient-to-r from-green-800 to-sky-400"></div>

      <nav className="bg-white shadow-md py-3 px-6 md:px-12 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-3xl">🌾</span>
          <span className="text-2xl font-bold text-green-900">فلورا<span className="text-green-700">مايند</span></span>
        </Link>
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-green-800">👤 {user.email?.split('@')[0]}</span>
              <button
                onClick={() => {
                  localStorage.removeItem("token");
                  localStorage.removeItem("currentUser");
                  setUser(null);
                  checkAccess();
                }}
                className="text-red-600 text-sm hover:underline"
              >
                خروج
              </button>
            </div>
          ) : (
            <button onClick={() => setIsLoginModalOpen(true)} className="text-green-800 hover:underline">
              تسجيل الدخول
            </button>
          )}
          <Link href="/" className="text-green-800 hover:underline">العودة للرئيسية</Link>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-12">
        <div className="flex items-center gap-4 mb-8">
          <span className="text-6xl">🌾</span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-green-900">المحصول الأنسب لكل محافظة</h1>
        </div>

        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-md mb-10 border border-green-100">
          <h2 className="text-2xl font-bold text-green-800 mb-4">عن هذه الميزة</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            <strong>المشكلة:</strong> كثير من المزارعين يختارون محاصيل غير مناسبة لبيئتهم، مما يؤدي إلى ضعف الإنتاج أو فشل الزراعة من البداية.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            <strong>كيف تعمل؟</strong> بناءً على محافظتك أو منطقتك، يقوم نظامنا بتحليل الظروف المناخية (درجة الحرارة، الرطوبة، الأمطار) ونوع التربة ومستوى الملوحة. ثم يعطيك قائمة بالمحاصيل الأنسب مع نسبة نجاح متوقعة وأفضل موسم للزراعة.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            <strong>الفوائد:</strong> زيادة الإنتاج، تقليل الخسائر، توفير الوقت والجهد، واتخاذ قرار زراعي صحيح من البداية.
          </p>
          <div className="mt-4 inline-block bg-green-100 text-green-900 px-6 py-2 rounded-full text-lg font-semibold">
            السعر: 3 ريال شهرياً
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-sky-50 rounded-2xl p-6 md:p-8 mb-12 border border-green-200">
          <h2 className="text-2xl font-bold text-green-900 mb-4 flex items-center gap-2">
            <span>🗺️</span> محاصيل مقترحة حسب المحافظات العُمانية
          </h2>
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start gap-2"><span>🌴</span> <strong>الداخلية:</strong> النخيل، المانجو، الليمون، البرسيم، الخضروات الشتوية.</li>
            <li className="flex items-start gap-2"><span>🌊</span> <strong>الباطنة:</strong> الموز، جوز الهند، الطماطم، الخيار، الباذنجان.</li>
            <li className="flex items-start gap-2"><span>🏜️</span> <strong>الظاهرة:</strong> القمح، الشعير، الأعلاف، النخيل.</li>
            <li className="flex items-start gap-2"><span>⛰️</span> <strong>مسندم:</strong> الحمضيات، المانجو، الموز، الرمان.</li>
            <li className="flex items-start gap-2"><span>🌵</span> <strong>الوسطى:</strong> النخيل، الأعلاف، بعض الخضروات المحمية.</li>
            <li className="flex items-start gap-2"><span>🐟</span> <strong>الشرقية:</strong> النخيل، المانجو، الليمون، الطماطم، البصل.</li>
            <li className="flex items-start gap-2"><span>☀️</span> <strong>ظفار:</strong> جوز الهند، الموز، الفواكه الاستوائية، اللبان.</li>
          </ul>
          <p className="text-sm text-gray-500 mt-4">* هذه توصيات عامة. للحصول على توصية دقيقة، اذكر اسم ولايتك أو قريتك.</p>
        </div>

        {/* حالة الاستخدام */}
        {!user && (
          <div className="mb-4">
            {isBlocked ? (
              <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-xl text-center">
                🚫 {blockReason}
                <button onClick={() => setIsLoginModalOpen(true)} className="underline font-bold mr-2">
                  سجل دخولك الآن
                </button>
                للاستمتاع بفترة تجريبية 14 يوماً.
              </div>
            ) : remainingTrials !== null ? (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl text-center">
                ⏳ متبقي لك {remainingTrials} محاولات مجانية.
                <button onClick={() => setIsLoginModalOpen(true)} className="underline font-bold mx-2">
                  سجل دخولك
                </button>
                لاستخدام غير محدود لمدة 14 يوماً.
              </div>
            ) : null}
          </div>
        )}

        {user && subscriptionExpiresAt && (
          <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded-xl text-center mb-4">
            🎉 أنت مشترك. الاشتراك ساري حتى {subscriptionExpiresAt.toLocaleDateString("ar-OM")}.
          </div>
        )}

        {user && trialEndsAt && !subscriptionExpiresAt && (
          <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded-xl text-center mb-4">
            🎉 أنت في الفترة التجريبية حتى {trialEndsAt.toLocaleDateString("ar-OM")}.
          </div>
        )}

        <div className="relative">
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-3xl animate-bounce">⬇️</div>
          <h3 className="text-xl font-bold text-green-800 mb-2 text-center">تحدث مع مستشار المحاصيل</h3>
          <div className="bg-white rounded-2xl shadow-xl border border-green-200 overflow-hidden" ref={chatContainerRef}>
            <div className="h-96 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl p-4 ${msg.role === "user" ? "bg-green-800 text-white" : "bg-white border border-gray-200 text-gray-800 shadow-sm"}`}>
                    {msg.images && msg.images.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-2">
                        {msg.images.map((img, i) => (
                          <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden">
                            <Image src={img} alt={`Uploaded ${i + 1}`} fill className="object-cover" />
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
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                    <div className="flex space-x-2 rtl:space-x-reverse">
                      <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce delay-100"></div>
                      <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce delay-200"></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {selectedImages.length > 0 && (
              <div className="px-4 py-2 bg-gray-100 border-t flex flex-wrap items-center gap-2">
                {selectedImages.map((img, idx) => (
                  <div key={idx} className="relative w-12 h-12 rounded overflow-hidden border border-gray-300">
                    <Image src={img} alt={`Preview ${idx + 1}`} fill className="object-cover" />
                    <button onClick={() => removeSelectedImage(idx)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
                  </div>
                ))}
                <span className="text-sm text-gray-600 ml-auto">{selectedImages.length} صورة جاهزة</span>
              </div>
            )}

            <div className="border-t border-gray-200 p-4 flex items-center gap-2 bg-white">
              <input type="file" accept="image/*" multiple onChange={handleImageUpload} ref={fileInputRef} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} className="p-3 text-gray-600 hover:bg-green-50 rounded-full transition" title="رفع صور">📎</button>
              <button onClick={toggleVoiceRecording} className={`p-3 rounded-full transition ${isRecording ? "bg-red-500 text-white" : "text-gray-600 hover:bg-green-50"}`} title={isRecording ? "إيقاف التسجيل" : "تسجيل صوتي"}>🎤</button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder={isRecording ? "🎙️ جاري الاستماع..." : "اكتب اسم محافظتك أو منطقتك..."}
                className="flex-1 border border-gray-300 rounded-full px-5 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                dir="rtl"
                disabled={isLoading || isRecording || isBlocked}
              />
              <button onClick={handleSendMessage} disabled={isLoading || isBlocked} className="bg-green-800 text-white p-3 rounded-full hover:bg-green-900 transition disabled:opacity-50">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19V5m-7 7l7-7 7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} onLoginSuccess={handleLoginSuccess} />

      <footer className="border-t border-green-200 py-8 text-center text-gray-500 mt-16">
        <p>© 2026 فلورا مايند - جميع الحقوق محفوظة</p>
      </footer>
    </div>
  );
}