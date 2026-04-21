import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

// تم تضمين المفتاح مباشرة لتجاوز مشاكل البيئة مؤقتًا
const stripe = new Stripe("sk_test_51T0RG2HYOF3wmMEY3Ww3qUIrz0xHDoc1fnFlh9XvZh7yc2THJTfWr8vrC8546ZQ2Ugkg9uTsdPwS9Yo6nQWfMkfV0OPQS5gpRl");

export async function POST(req: NextRequest) {
  try {
    const { featureId, featureName, billingCycle, amount } = await req.json();
    
    // تم تعطيل JWT مؤقتًا - استخدم معرف مستخدم موجود في قاعدة البيانات
    const userId = 1; // تأكد من وجود مستخدم بـ id=1 في جدول users

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "omr",
            product_data: {
              name: `اشتراك ${featureName} - ${billingCycle === "monthly" ? "شهري" : "سنوي"}`,
            },
            unit_amount: Math.round(amount * 1000),
            recurring: {
              interval: billingCycle === "monthly" ? "month" : "year",
            },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${req.nextUrl.origin}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.nextUrl.origin}/subscription?canceled=true`,
      metadata: {
        userId: String(userId),
        featureId,
        billingCycle,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error("Stripe Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}