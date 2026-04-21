"use client";

import { useState, useEffect } from "react";
import { generateDeviceFingerprint } from "@/lib/deviceFingerprint";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: any) => void;
}

type AuthStep = 
  | "login" 
  | "signup" 
  | "verifyEmail" 
  | "forgotPassword" 
  | "resetPasswordVerify";

export default function LoginModal({ isOpen, onClose, onLoginSuccess }: LoginModalProps) {
  const [step, setStep] = useState<AuthStep>("login");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "auto";
    return () => { document.body.style.overflow = "auto"; };
  }, [isOpen]);

  if (!isOpen) return null;

  const resetForm = () => {
    setEmail("");
    setPhone("");
    setPassword("");
    setFullName("");
    setToken("");
    setNewPassword("");
    setError("");
    setMessage("");
    setPreviewUrl(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const fingerprint = generateDeviceFingerprint();
      const normalizedEmail = email.trim().toLowerCase();
      
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: normalizedEmail, 
          password, 
          deviceFingerprint: fingerprint 
        }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        // إذا كان الحساب غير مفعل، انتقل تلقائيًا إلى شاشة التفعيل
        if (res.status === 403 && data.error.includes("غير مفعل")) {
          setStep("verifyEmail");
          setError("");
          setMessage("حسابك غير مفعل. أدخل رمز التفعيل المرسل إلى بريدك، أو اضغط على 'إعادة إرسال الرمز'.");
          return;
        }
        throw new Error(data.error);
      }
      
      localStorage.setItem("token", data.token);
      localStorage.setItem("currentUser", JSON.stringify(data.user));
      onLoginSuccess(data.user);
      resetForm();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const normalizedPhone = phone.trim() || null;
      
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: normalizedEmail, 
          phone: normalizedPhone, 
          password, 
          full_name: fullName 
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setMessage(data.message);
      setPreviewUrl(data.previewUrl || null);
      setStep("verifyEmail");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setMessage("تم تفعيل الحساب بنجاح، يمكنك الآن تسجيل الدخول");
      setStep("login");
      setToken("");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError("");
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setMessage("تم إرسال رمز جديد. تحقق من الرابط في Terminal.");
      setPreviewUrl(data.previewUrl || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSignup = async () => {
    if (!confirm("هل أنت متأكد من إلغاء التسجيل؟ سيتم حذف حسابك نهائيًا.")) return;
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      await fetch("/api/auth/cancel-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      resetForm();
      setStep("login");
    } catch (err) {
      setError("فشل إلغاء التسجيل");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setMessage(data.message);
      setPreviewUrl(data.previewUrl || null);
      setStep("resetPasswordVerify");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, token, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setMessage("تم تغيير كلمة المرور بنجاح");
      setStep("login");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const goToLogin = () => { setStep("login"); resetForm(); };
  const goToSignup = () => { setStep("signup"); resetForm(); };
  const goToForgot = () => { setStep("forgotPassword"); resetForm(); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-gray-100 py-2 flex justify-center">
          <div className="w-20 h-1.5 bg-gray-300 rounded-full"></div>
        </div>
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-green-900">
              {step === "login" && "تسجيل الدخول"}
              {step === "signup" && "إنشاء حساب جديد"}
              {step === "verifyEmail" && "تأكيد البريد الإلكتروني"}
              {step === "forgotPassword" && "نسيت كلمة المرور"}
              {step === "resetPasswordVerify" && "إعادة تعيين كلمة المرور"}
            </h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
          </div>

          {message && <div className="mb-4 p-3 bg-green-100 text-green-800 rounded-lg">{message}</div>}
          {error && <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-lg">{error}</div>}
          
          {/* رابط معاينة البريد (للتطوير فقط) */}
          {previewUrl && (
            <div className="mb-4 p-3 bg-blue-50 text-blue-800 rounded-lg text-sm break-all">
              <p className="font-bold mb-1">🔗 رابط البريد (للتطوير):</p>
              <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="underline">
                {previewUrl}
              </a>
              <p className="mt-1">انسخ الرمز من هنا</p>
            </div>
          )}

          {/* نموذج تسجيل الدخول */}
          {step === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <input type="email" placeholder="البريد الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 border rounded-xl text-gray-900" dir="ltr" required />
              <input type="password" placeholder="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 border rounded-xl text-gray-900" dir="ltr" required />
              <button type="submit" disabled={loading} className="w-full bg-green-800 text-white py-3 rounded-xl font-semibold">{loading ? "جاري..." : "تسجيل الدخول"}</button>
              <div className="flex justify-between text-sm">
                <button type="button" onClick={goToSignup} className="text-green-800">إنشاء حساب</button>
                <button type="button" onClick={goToForgot} className="text-green-800">نسيت كلمة المرور؟</button>
              </div>
            </form>
          )}

          {/* نموذج التسجيل */}
          {step === "signup" && (
            <form onSubmit={handleSignup} className="space-y-4">
              <input type="text" placeholder="الاسم الكامل" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-4 py-3 border rounded-xl text-gray-900" required />
              <input type="email" placeholder="البريد الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 border rounded-xl text-gray-900" dir="ltr" required />
              <input type="tel" placeholder="رقم الهاتف (اختياري)" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-3 border rounded-xl text-gray-900" dir="ltr" />
              <input type="password" placeholder="كلمة المرور" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 border rounded-xl text-gray-900" dir="ltr" required />
              <button type="submit" disabled={loading} className="w-full bg-green-800 text-white py-3 rounded-xl font-semibold">{loading ? "جاري..." : "إنشاء حساب"}</button>
              <button type="button" onClick={goToLogin} className="w-full text-center text-green-800">العودة لتسجيل الدخول</button>
            </form>
          )}

          {/* تأكيد البريد */}
          {step === "verifyEmail" && (
            <form onSubmit={handleVerifyEmail} className="space-y-4">
              <p className="text-gray-700">أدخل الرمز المرسل إلى بريدك الإلكتروني (أو تجده في رابط المعاينة أعلاه)</p>
              <input type="text" placeholder="رمز التحقق" value={token} onChange={(e) => setToken(e.target.value)} className="w-full px-4 py-3 border rounded-xl text-center text-2xl tracking-widest text-gray-900" dir="ltr" required />
              <button type="submit" disabled={loading} className="w-full bg-green-800 text-white py-3 rounded-xl font-semibold">{loading ? "جاري..." : "تأكيد"}</button>
              <div className="flex justify-between text-sm">
                <button type="button" onClick={handleResendCode} className="text-green-800">إعادة إرسال الرمز</button>
                <button type="button" onClick={handleCancelSignup} className="text-red-600">إلغاء التسجيل</button>
              </div>
            </form>
          )}

          {/* نسيت كلمة المرور - طلب البريد */}
          {step === "forgotPassword" && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <p className="text-gray-700">أدخل بريدك الإلكتروني لإرسال رمز إعادة التعيين</p>
              <input type="email" placeholder="البريد الإلكتروني" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 border rounded-xl text-gray-900" dir="ltr" required />
              <button type="submit" disabled={loading} className="w-full bg-green-800 text-white py-3 rounded-xl font-semibold">{loading ? "جاري..." : "إرسال الرمز"}</button>
              <button type="button" onClick={goToLogin} className="w-full text-center text-green-800">العودة</button>
            </form>
          )}

          {/* إعادة تعيين كلمة المرور */}
          {step === "resetPasswordVerify" && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <p className="text-gray-700">أدخل الرمز المرسل وكلمة المرور الجديدة</p>
              <input type="text" placeholder="رمز التحقق" value={token} onChange={(e) => setToken(e.target.value)} className="w-full px-4 py-3 border rounded-xl text-center text-2xl text-gray-900" dir="ltr" required />
              <input type="password" placeholder="كلمة المرور الجديدة" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-4 py-3 border rounded-xl text-gray-900" dir="ltr" required />
              <button type="submit" disabled={loading} className="w-full bg-green-800 text-white py-3 rounded-xl font-semibold">{loading ? "جاري..." : "تغيير كلمة المرور"}</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}