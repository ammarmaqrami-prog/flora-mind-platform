"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

// مكون منفصل يستخدم useSearchParams
function PaymentDemoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [isFlipped, setIsFlipped] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  const featureName = searchParams.get("feature") || "الميزة";
  const amount = searchParams.get("amount") || "0";
  const billingCycle = searchParams.get("cycle") || "monthly";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (paymentMethod === "card") {
      if (!cardNumber || !cardName || !expiry || !cvv) {
        setError("الرجاء إكمال بيانات البطاقة");
        return;
      }
    }

    setIsProcessing(true);
    
    setTimeout(async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("/api/demo-payment", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            featureName,
            amount: parseFloat(amount),
            billingCycle,
            paymentMethod,
          }),
        });
        
        if (res.ok) {
          router.push(`/payment-demo/success?feature=${encodeURIComponent(featureName)}`);
        } else {
          setError("فشل تأكيد الدفع التجريبي");
        }
      } catch (err) {
        setError("حدث خطأ في الاتصال");
      } finally {
        setIsProcessing(false);
      }
    }, 2000);
  };

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || "";
    const parts = [];
    for (let i = 0; i < match.length; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(" ");
    } else {
      return value;
    }
  };

  const formatExpiry = (value: string) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    if (v.length >= 2) {
      return v.slice(0, 2) + "/" + v.slice(2, 4);
    }
    return v;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-green-950 flex flex-col">
      <div className="bg-gray-800/80 backdrop-blur-sm px-6 py-3 flex items-center gap-4 text-white border-b border-white/10">
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
        </div>
        <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 flex-1 max-w-2xl">
          <span className="text-green-400">🔒</span>
          <span className="text-sm truncate">https://secure.floramind.om/payment</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-5xl">
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center gap-2 md:gap-6">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm">✓</div>
                <span className="text-white/80 hidden md:inline">الخطة</span>
              </div>
              <div className="w-12 h-0.5 bg-green-600"></div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-bold">2</div>
                <span className="text-white hidden md:inline">الدفع</span>
              </div>
              <div className="w-12 h-0.5 bg-white/20"></div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/20 text-white/60 flex items-center justify-center text-sm">3</div>
                <span className="text-white/40 hidden md:inline">تأكيد</span>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                <h3 className="text-white text-xl font-bold mb-4">طريقة الدفع</h3>
                <div className="space-y-3">
                  {[
                    { id: "card", name: "بطاقة ائتمان", icon: "💳" },
                    { id: "paypal", name: "PayPal", icon: "🅿️" },
                    { id: "apple", name: "Apple Pay", icon: "" },
                    { id: "bank", name: "تحويل بنكي", icon: "🏦" },
                    { id: "cod", name: "الدفع عند الاستلام", icon: "📦" },
                  ].map((method) => (
                    <label
                      key={method.id}
                      className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all ${
                        paymentMethod === method.id
                          ? "bg-green-600/20 border border-green-500/50"
                          : "bg-white/5 border border-white/10 hover:bg-white/10"
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method.id}
                        checked={paymentMethod === method.id}
                        onChange={() => setPaymentMethod(method.id)}
                        className="w-5 h-5 accent-green-500"
                      />
                      <span className="text-2xl">{method.icon}</span>
                      <span className="text-white flex-1">{method.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-white/10">
                <h3 className="text-white text-xl font-bold mb-2">ملخص الطلب</h3>
                <div className="space-y-2 text-white/80">
                  <div className="flex justify-between">
                    <span>{featureName}</span>
                    <span>{amount} ريال / {billingCycle === "monthly" ? "شهر" : "سنة"}</span>
                  </div>
                  <div className="border-t border-white/10 my-3"></div>
                  <div className="flex justify-between font-bold text-white">
                    <span>الإجمالي</span>
                    <span>{amount} ريال</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div
                className={`relative w-full h-64 transition-transform duration-500 ${
                  isFlipped ? "[transform:rotateY(180deg)]" : ""
                }`}
                style={{ transformStyle: "preserve-3d" }}
              >
                <div className="absolute inset-0" style={{ backfaceVisibility: "hidden" }}>
                  <div className="w-full h-full rounded-2xl bg-gradient-to-br from-green-600 to-emerald-800 p-6 shadow-2xl flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <span className="text-white/90 text-lg font-medium">FloraMind Bank</span>
                      <span className="text-3xl">💳</span>
                    </div>
                    <div>
                      <div className="text-white/60 text-xs mb-1">رقم البطاقة</div>
                      <div className="text-white text-2xl font-mono tracking-wider">
                        {cardNumber || "•••• •••• •••• ••••"}
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <div>
                        <div className="text-white/60 text-xs mb-1">حامل البطاقة</div>
                        <div className="text-white font-medium">
                          {cardName || "YOUR NAME"}
                        </div>
                      </div>
                      <div>
                        <div className="text-white/60 text-xs mb-1">انتهاء الصلاحية</div>
                        <div className="text-white font-medium">
                          {expiry || "MM/YY"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="absolute inset-0" style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}>
                  <div className="w-full h-full rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 p-6 shadow-2xl">
                    <div className="w-full h-10 bg-black/50 mt-4"></div>
                    <div className="mt-6 flex items-center gap-4">
                      <div className="bg-white/90 w-40 h-8 rounded"></div>
                      <div className="text-white font-mono text-lg">
                        {cvv || "***"}
                      </div>
                    </div>
                    <div className="mt-8 text-right text-white/50 text-sm">
                      <span>CVV</span>
                    </div>
                  </div>
                </div>
              </div>

              {paymentMethod === "card" && (
                <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                  <div>
                    <label className="block text-white/80 mb-1 text-sm">رقم البطاقة</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      placeholder="1234 5678 9012 3456"
                      maxLength={19}
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-green-500 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-white/80 mb-1 text-sm">اسم حامل البطاقة</label>
                    <input
                      type="text"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value.toUpperCase())}
                      placeholder="AHMED ALI"
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-green-500 transition"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-white/80 mb-1 text-sm">تاريخ الانتهاء</label>
                      <input
                        type="text"
                        value={expiry}
                        onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                        placeholder="MM/YY"
                        maxLength={5}
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-green-500 transition"
                      />
                    </div>
                    <div>
                      <label className="block text-white/80 mb-1 text-sm">CVV</label>
                      <input
                        type="text"
                        value={cvv}
                        onChange={(e) => setCvv(e.target.value.replace(/[^0-9]/g, "").slice(0, 3))}
                        placeholder="***"
                        maxLength={3}
                        onFocus={() => setIsFlipped(true)}
                        onBlur={() => setIsFlipped(false)}
                        className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-green-500 transition"
                      />
                    </div>
                  </div>
                  {error && (
                    <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3 text-red-200 text-sm">
                      {error}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <span className="animate-spin">⏳</span>
                        جاري المعالجة...
                      </>
                    ) : (
                      <>
                        <span>🔒</span>
                        إتمام الدفع التجريبي
                      </>
                    )}
                  </button>
                  <p className="text-white/40 text-xs text-center mt-4">
                    هذا وضع تجريبي للمحاكاة فقط. لا يتم خصم أي مبالغ حقيقية.
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// مكون رئيسي مع Suspense
export default function PaymentDemoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-gray-900 to-green-950 flex items-center justify-center text-white">جاري التحميل...</div>}>
      <PaymentDemoContent />
    </Suspense>
  );
}