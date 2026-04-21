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

const dummyPosts = [
  {
    id: 1,
    user: "أبو خالد",
    avatar: "👨‍🌾",
    content: "عندي مشكلة في شجرة الليمون، الأوراق تذبل رغم الري المنتظم. أي نصايح؟",
    image: "https://images.pexels.com/photos/164504/pexels-photo-164504.jpeg?auto=compress&cs=tinysrgb&w=600",
    time: "منذ ساعتين",
    likes: 12,
    comments: 5,
  },
  {
    id: 2,
    user: "مزارعة نزوى",
    avatar: "👩‍🌾",
    content: "محصول الطماطم هذا الموسم ممتاز الحمدلله. استخدمت سماد عضوي وكان الفرق واضح. أنصحكم تجربوه.",
    image: "https://images.pexels.com/photos/533280/pexels-photo-533280.jpeg?auto=compress&cs=tinysrgb&w=600",
    time: "منذ 5 ساعات",
    likes: 28,
    comments: 8,
  },
  {
    id: 3,
    user: "مهندس زراعي",
    avatar: "🧑‍🔬",
    content: "تنبيه مهم: مع ارتفاع الحرارة الأيام القادمة، قللوا الري للنباتات الحساسة مثل الخيار والكوسا، وزيدوا التظليل.",
    image: null,
    time: "منذ يوم",
    likes: 45,
    comments: 12,
  },
];

const weeklyChallenge = {
  title: "🌿 تحدي زراعة الريحان",
  description: "ازرع بذور ريحان وشاركنا صورة لنموها كل أسبوع. أفضل 3 مشاركين يحصلون على نقاط مضاعفة!",
  points: 100,
};

export default function FarmingCommunityPage() {
  const [activeTab, setActiveTab] = useState<"community" | "assistant">("community");
  const [posts, setPosts] = useState(dummyPosts);
  const [newPost, setNewPost] = useState("");
  const [newPostImage, setNewPostImage] = useState<string | null>(null);
  const [userPoints, setUserPoints] = useState(250);
  
  // حالات المراقبة
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [remainingTrials, setRemainingTrials] = useState<number | null>(null);
  const [trialEndsAt, setTrialEndsAt] = useState<Date | null>(null);
  const [subscriptionExpiresAt, setSubscriptionExpiresAt] = useState<Date | null>(null);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [user, setUser] = useState<{ email: string; name?: string } | null>(null);

  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string; images?: string[]; isError?: boolean }[]>([
    { role: "assistant", content: "مرحباً بك في المجتمع الزراعي العُماني! أنا مساعدك هنا. يمكنني مساعدتك في صياغة الأسئلة، أو إيجاد خبراء في مجال معين، أو شرح كيفية كسب النقاط والتحديات." },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const postImageRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem("currentUser");
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  useEffect(() => {
    if (activeTab === "assistant") checkAccess();
  }, [activeTab]);

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
          featureName: "المجتمع الزراعي العُماني",
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
          featureName: "المجتمع الزراعي العُماني",
          deviceFingerprint: fingerprint,
        }),
      });
      const data = await res.json();
      if (res.status === 403) {
        setIsBlocked(true);
        setBlockReason(data.error || "غير مسموح");
        setMessages(prev => [...prev, { role: "assistant", content: data.error, isError: true }]);
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
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: `خطأ: ${data.error || "لم يتم الرد"}`, isError: true }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: "assistant", content: "حدث خطأ في الاتصال.", isError: true }]);
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

  const handlePostImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setNewPostImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  };

  const handleCreatePost = () => {
    if (!newPost.trim() && !newPostImage) return;
    const newPostObj = {
      id: posts.length + 1,
      user: "أنت",
      avatar: "🧑‍🌾",
      content: newPost,
      image: newPostImage,
      time: "الآن",
      likes: 0,
      comments: 0,
    };
    setPosts([newPostObj, ...posts]);
    setNewPost("");
    setNewPostImage(null);
    setUserPoints(prev => prev + 10);
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
      if (activeTab === "community") {
        setNewPost(prev => prev + (prev ? " " : "") + transcript);
      } else {
        setInput(prev => prev + (prev ? " " : "") + transcript);
      }
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
          <span className="text-3xl">👥</span>
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
          <span className="text-6xl">👥</span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-green-900">المجتمع الزراعي العُماني</h1>
        </div>

        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-md mb-10 border border-green-100">
          <h2 className="text-2xl font-bold text-green-800 mb-4">عن هذه الميزة</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            <strong>المشكلة:</strong> المزارعون يعملون بشكل فردي دون تواصل كافٍ، مما يؤدي إلى تكرار الأخطاء وضعف تبادل الخبرات.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            <strong>كيف تعمل؟</strong> مجتمع رقمي يجمع المزارعين في سلطنة عُمان. يمكنك طرح الأسئلة، مشاركة التجارب، التعلم من الآخرين، والمشاركة في تحديات أسبوعية لربح النقاط.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            <strong>الفوائد:</strong> تسريع التعلم، تقليل الأخطاء، رفع الحماس، ونشر الخبرات المحلية.
          </p>
          <div className="mt-4 inline-block bg-green-100 text-green-900 px-6 py-2 rounded-full text-lg font-semibold">
            مجاني لجميع المستخدمين
          </div>
        </div>

        {/* شريط النقاط والتحديات */}
        <div className="flex flex-wrap gap-4 mb-8">
          <div className="bg-gradient-to-r from-amber-100 to-amber-200 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
            <span className="text-3xl">🏆</span>
            <div>
              <p className="text-sm text-amber-800">نقاطك</p>
              <p className="text-2xl font-bold text-amber-900">{userPoints}</p>
            </div>
          </div>
          <div className="bg-gradient-to-r from-green-100 to-emerald-200 rounded-2xl p-4 flex-1 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{weeklyChallenge.title.split(' ')[0]}</span>
              <p className="font-bold text-green-900">{weeklyChallenge.title}</p>
            </div>
            <p className="text-sm text-gray-700 mt-1">{weeklyChallenge.description}</p>
            <p className="text-xs text-green-700 mt-2">+{weeklyChallenge.points} نقطة للفائزين</p>
          </div>
        </div>

        {/* تبويبات المجتمع والمساعد */}
        <div className="mb-6 border-b border-gray-200">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab("community")}
              className={`pb-3 px-2 font-medium text-lg transition ${
                activeTab === "community"
                  ? "text-green-800 border-b-2 border-green-800"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              🗣️ المناقشات
            </button>
            <button
              onClick={() => setActiveTab("assistant")}
              className={`pb-3 px-2 font-medium text-lg transition ${
                activeTab === "assistant"
                  ? "text-green-800 border-b-2 border-green-800"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              🤖 مساعد المجتمع
            </button>
          </div>
        </div>

        {activeTab === "community" ? (
          <>
            <div className="bg-white rounded-2xl p-4 shadow-md border border-green-100 mb-6">
              <textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="شاركنا استفسارك أو تجربتك الزراعية..."
                className="w-full border border-gray-200 rounded-xl p-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                rows={3}
                dir="rtl"
              />
              {newPostImage && (
                <div className="relative w-32 h-32 mt-3 rounded-lg overflow-hidden border">
                  <Image src={newPostImage} alt="Preview" fill className="object-cover" />
                  <button onClick={() => setNewPostImage(null)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center">×</button>
                </div>
              )}
              <div className="flex items-center justify-between mt-3">
                <div className="flex gap-2">
                  <input type="file" accept="image/*" onChange={handlePostImageUpload} ref={postImageRef} className="hidden" />
                  <button onClick={() => postImageRef.current?.click()} className="p-2 text-gray-600 hover:bg-green-50 rounded-full transition">📎 إضافة صورة</button>
                  <button onClick={toggleVoiceRecording} className={`p-2 rounded-full transition ${isRecording ? "bg-red-500 text-white" : "text-gray-600 hover:bg-green-50"}`}>🎤 تسجيل صوتي</button>
                </div>
                <button onClick={handleCreatePost} className="bg-green-800 text-white px-6 py-2 rounded-full hover:bg-green-900 transition">نشر</button>
              </div>
            </div>
            <div className="space-y-6">
              {posts.map((post) => (
                <div key={post.id} className="bg-white rounded-2xl p-5 shadow-md border border-green-50">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">{post.avatar}</span>
                    <div>
                      <p className="font-bold text-gray-800">{post.user}</p>
                      <p className="text-xs text-gray-500">{post.time}</p>
                    </div>
                  </div>
                  <p className="text-gray-700 mb-3 whitespace-pre-wrap">{post.content}</p>
                  {post.image && (
                    <div className="relative w-full h-64 rounded-xl overflow-hidden mb-3">
                      <Image src={post.image} alt="Post" fill className="object-cover" />
                    </div>
                  )}
                  <div className="flex items-center gap-6 text-gray-600">
                    <button className="flex items-center gap-1 hover:text-green-800">❤️ {post.likes}</button>
                    <button className="flex items-center gap-1 hover:text-green-800">💬 {post.comments} تعليق</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            {/* حالة المراقبة للمساعد */}
            {!user && (
              <div className="mb-4">
                {isBlocked ? (
                  <div className="bg-red-50 border border-red-200 text-red-800 p-3 rounded-xl text-center">
                    🚫 {blockReason}
                    <button onClick={() => setIsLoginModalOpen(true)} className="underline font-bold mr-2">سجل دخولك الآن</button> للاستمتاع بفترة تجريبية 14 يوماً.
                  </div>
                ) : remainingTrials !== null ? (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl text-center">
                    ⏳ متبقي لك {remainingTrials} محاولات مجانية. 
                    <button onClick={() => setIsLoginModalOpen(true)} className="underline font-bold mx-2">سجل دخولك</button> لاستخدام غير محدود لمدة 14 يوماً.
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
                        <button onClick={handleRetryLastMessage} className="mt-2 text-sm text-green-700 border border-green-300 rounded-full px-3 py-1 bg-green-50">🔄 إعادة المحاولة</button>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
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
                  disabled={isLoading || isRecording || isBlocked}
                />
                <button onClick={handleSendMessage} disabled={isLoading || isBlocked} className="bg-green-800 text-white p-3 rounded-full hover:bg-green-900 disabled:opacity-50">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19V5m-7 7l7-7 7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} onLoginSuccess={handleLoginSuccess} />
      <footer className="border-t border-green-200 py-8 text-center text-gray-500 mt-16">
        <p>© 2026 فلورا مايند - جميع الحقوق محفوظة</p>
      </footer>
    </div>
  );
}