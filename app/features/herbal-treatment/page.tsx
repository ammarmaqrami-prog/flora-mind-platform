"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function HerbalTreatmentPage() {
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string; images?: string[]; isError?: boolean }[]>([
    { role: "assistant", content: "مرحباً! أنا مساعدك في عالم الأعشاب الطبية. يمكنك سؤالي عن استخدام عشبة معينة، أو رفع صورة لعشبة للتعرف عليها، أو وصف حالتك الصحية لأقترح عليك أعشاباً مناسبة." },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);

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

  const callGeminiAPI = async (userMessage: string, images?: string[], isRetry: boolean = false) => {
    if (!isRetry) {
      const userMsg = { role: "user" as const, content: userMessage, images: images };
      setMessages(prev => [...prev, userMsg]);
    }

    setIsLoading(true);
    try {
      // 1. جلب التوكن من localStorage (الذي تم تخزينه عند تسجيل الدخول)
      const token = localStorage.getItem("token"); 

      // 2. استخراج أو إنشاء بصمة الجهاز
      let fingerprint = localStorage.getItem("deviceFingerprint");
      if (!fingerprint) {
        fingerprint = "device_" + Math.random().toString(36).substring(2, 15);
        localStorage.setItem("deviceFingerprint", fingerprint);
      }

      // 3. إرسال الطلب مع التوكن في الهيدر (Authorization)
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": token ? `Bearer ${token}` : "" // 👈 هذا هو السطر الحاسم!
        },
        body: JSON.stringify({ 
          message: userMessage, 
          images: images || [],
          featureName: "العلاج بالأعشاب",
          deviceFingerprint: fingerprint
        }),
      });
      
      const data = await response.json();

      if (response.ok && data.reply) {
        setMessages(prev => [...prev, { role: "assistant", content: "" }]);
        typeWriterEffect(data.reply, (partial) => {
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { ...updated[updated.length - 1], content: partial };
            return updated;
          });
        }, 30);
      } else {
        const errorMsg = data.error || "عذراً، لم أتمكن من معالجة طلبك.";
        setMessages(prev => [...prev, { role: "assistant", content: `خطأ: ${errorMsg}`, isError: true }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: "assistant", content: "حدث خطأ في الاتصال بالخادم.", isError: true }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = () => {
    if (!input.trim() && selectedImages.length === 0) return;
    callGeminiAPI(input, selectedImages);
    setInput("");
    setSelectedImages([]);
  };

  const handleRetryLastMessage = () => {
    const lastUserMsgIndex = [...messages].reverse().findIndex(msg => msg.role === "user");
    if (lastUserMsgIndex === -1) return;
    const actualIndex = messages.length - 1 - lastUserMsgIndex;
    const lastUserMsg = messages[actualIndex];
    setMessages(prev => prev.slice(0, -1));
    callGeminiAPI(lastUserMsg.content, lastUserMsg.images, true);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="h-8 w-full bg-gradient-to-r from-green-800 to-sky-400"></div>

      <nav className="bg-white shadow-md py-3 px-6 md:px-12 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-3xl">🌿</span>
          <span className="text-2xl font-bold text-green-900">فلورا<span className="text-green-700">مايند</span></span>
        </Link>
        <Link href="/" className="text-green-800 hover:underline">العودة للرئيسية</Link>
      </nav>

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-12">
        <div className="flex items-center gap-4 mb-8">
          <span className="text-6xl">🌿</span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-green-900">علاجك يبدأ من الأعشاب</h1>
        </div>

        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-md mb-10 border border-green-100">
          <h2 className="text-2xl font-bold text-green-800 mb-4">عن هذه الميزة</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            <strong>المشكلة:</strong> استخدام الأعشاب الطبية يتم غالباً بشكل عشوائي دون معرفة الجرعة أو طريقة التحضير الصحيحة، مما قد يقلل الفائدة أو يسبب أضراراً.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            <strong>كيف تعمل؟</strong> تصف حالتك الصحية أو ترفع صورة للعشبة التي تريد استخدامها، ويقوم نظامنا بتحليل المعلومات وتقديم إرشادات دقيقة تشمل: الجرعة المناسبة، طريقة التحضير (غلي، نقع، إلخ)، عدد مرات الاستخدام اليومية، والمخاطر المحتملة.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            <strong>الفوائد:</strong> استخدام آمن وفعال للأعشاب، تقليل الأخطاء الشائعة، الاستفادة القصوى من الخصائص العلاجية للنباتات المحلية.
          </p>
          <div className="mt-4 inline-block bg-green-100 text-green-900 px-6 py-2 rounded-full text-lg font-semibold">
            السعر: 2 ريال شهرياً
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-sky-50 rounded-2xl p-6 md:p-8 mb-12 border border-green-200">
          <h2 className="text-2xl font-bold text-green-900 mb-4 flex items-center gap-2">
            <span>🌱</span> نصائح للاستخدام الآمن للأعشاب
          </h2>
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start gap-2"><span>📋</span> <strong>تعرف على العشبة:</strong> تأكد من هوية النبات قبل استخدامه. الصور تساعدنا في التحقق.</li>
            <li className="flex items-start gap-2"><span>⚖️</span> <strong>الجرعة مهمة:</strong> ابدأ بجرعات صغيرة وراقب استجابة جسمك.</li>
            <li className="flex items-start gap-2"><span>⏱️</span> <strong>مدة الاستخدام:</strong> لا تستخدم الأعشاب لفترات طويلة دون استشارة مختص.</li>
            <li className="flex items-start gap-2"><span>🩺</span> <strong>استشر طبيبك:</strong> خاصة إذا كنت تعاني من أمراض مزمنة أو تتناول أدوية أخرى.</li>
            <li className="flex items-start gap-2"><span>🇴🇲</span> <strong>أعشاب عُمانية مشهورة:</strong> السعد، المرة، القرض (السنط)، اللبان. اسألنا عن أي منها!</li>
          </ul>
        </div>

        <div className="relative">
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-3xl animate-bounce">⬇️</div>
          <h3 className="text-xl font-bold text-green-800 mb-2 text-center">تحدث مع خبير الأعشاب</h3>
          <div className="bg-white rounded-2xl shadow-xl border border-green-200 overflow-hidden" ref={chatContainerRef}>
            <div className="h-96 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-2xl p-4 ${msg.role === "user" ? "bg-green-800 text-gray-900" : "bg-white border border-gray-200 text-gray-800 shadow-sm"}`}>
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
                      <button
                        onClick={handleRetryLastMessage}
                        className="mt-2 flex items-center gap-1 text-sm text-green-700 hover:text-green-900 border border-green-300 rounded-full px-3 py-1 bg-green-50 hover:bg-green-100 transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        إعادة المحاولة
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
                    <button
                      onClick={() => removeSelectedImage(idx)}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <span className="text-sm text-gray-600 ml-auto">{selectedImages.length} صورة جاهزة</span>
              </div>
            )}

            <div className="border-t border-gray-200 p-4 flex items-center gap-2 bg-white">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                ref={fileInputRef}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-3 text-gray-600 hover:bg-green-50 rounded-full transition"
                title="رفع صور"
              >
                📎
              </button>
              <button
                onClick={toggleVoiceRecording}
                className={`p-3 rounded-full transition ${
                  isRecording
                    ? "bg-red-500 text-white hover:bg-red-600"
                    : "text-gray-600 hover:bg-green-50"
                }`}
                title={isRecording ? "إيقاف التسجيل" : "تسجيل صوتي"}
              >
                🎤
              </button>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder={isRecording ? "🎙️ جاري الاستماع..." : "اكتب سؤالك هنا..."}
                className="flex-1 border border-gray-300 rounded-full px-5 py-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
                dir="rtl"
                disabled={isRecording}
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading}
                className="bg-green-800 text-white p-3 rounded-full hover:bg-green-900 transition disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19V5m-7 7l7-7 7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <footer className="border-t border-green-200 py-8 text-center text-gray-500 mt-16">
        <p>© 2026 فلورا مايند - جميع الحقوق محفوظة</p>
      </footer>
    </div>
  );
}