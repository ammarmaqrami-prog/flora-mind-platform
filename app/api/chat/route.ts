import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { checkFeatureAccess, recordFeatureUsage } from "@/lib/featureAccess";
import { query } from "@/lib/db";
import { GoogleGenerativeAI } from "@google/generative-ai";

// محاكاة ردود ذكاء اصطناعي مقنعة (للوضع الاحتياطي النهائي)
function getMockReply(message: string): string {
  const lowerMsg = message.toLowerCase();
  if (lowerMsg.includes("ري") || lowerMsg.includes("ماء")) {
    return "💧 يعتمد الري على نوع النبات والمناخ. في المناطق الحارة مثل عُمان، يُفضل الري بالتنقيط صباحًا. تجنب الري وقت الظهيرة لتقليل التبخر. تذكر أن الإفراط في الري قد يسبب تعفن الجذور.";
  }
  if (lowerMsg.includes("سماد") || lowerMsg.includes("تسميد")) {
    return "🌱 للتسميد المتوازن، استخدم **NPK 20-20-20** للنباتات الورقية، أو **NPK 10-30-20** للإزهار والإثمار. أضف السماد كل أسبوعين خلال موسم النمو، وقلله في الشتاء.";
  }
  if (lowerMsg.includes("مرض") || lowerMsg.includes("آفة")) {
    return "🐛 من الأمراض الشائعة في عُمان **البياض الدقيقي** (بقع بيضاء على الأوراق). عالجه برش **الكبريت الميكروني** أو **زيت النيم**. تأكد من التهوية الجيدة وتجنب الري العلوي.";
  }
  return "🌿 أنا مساعدك الزراعي المتخصص. يمكنني مساعدتك في تشخيص أمراض النبات، طرق الري والتسميد، واختيار المحاصيل المناسبة لمناخ عُمان. كيف يمكنني مساعدتك اليوم؟";
}

export async function POST(req: NextRequest) {
  try {
    const { message, images, featureName, deviceFingerprint } = await req.json();

    let userId: number | null = null;
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      try {
        const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
        userId = decoded.userId;
      } catch {}
    }

    const feature = featureName || "فحص النبات";
    const access = await checkFeatureAccess(feature, userId, deviceFingerprint || null);
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.reason || "غير مسموح باستخدام هذه الميزة", blocked: true },
        { status: 403 }
      );
    }

    let farmerProfile: { farmer_type: string; experience_level: string } | null = null;
    if (userId) {
      const userRes = await query(
        `SELECT farmer_type, experience_level FROM users WHERE id = $1`,
        [userId]
      );
      if (userRes.rowCount) farmerProfile = userRes.rows[0];
    }

    const hasImages = images && Array.isArray(images) && images.length > 0;
    let reply = "";

    // ===== إعداد Prompt الخبير =====
    let systemPrompt = `أنت خبير زراعي متخصص حصريًا في زراعة المحاصيل والنباتات في سلطنة عُمان والمناطق الحارة. أجب بالعربية الفصحى الواضحة. لا تجب عن أي سؤال خارج نطاق الزراعة.`;
    if (farmerProfile) {
      systemPrompt += ` المستخدم ${farmerProfile.farmer_type} ومستواه ${farmerProfile.experience_level}.`;
    }
    const userPrompt = message || (hasImages ? "حلل هذه الصورة وقدم تشخيصاً دقيقاً للنبات." : "مرحباً، كيف يمكنني تحسين زراعتي؟");

    // ===== 1. التعامل مع الصور: نحاول Gemini فقط =====
    if (hasImages) {
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey) {
        try {
          const genAI = new GoogleGenerativeAI(apiKey);
          const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

          const parts: any[] = [{ text: `${systemPrompt}\n\n${userPrompt}` }];
          for (const img of images) {
            const matches = img.match(/^data:image\/([a-zA-Z]+);base64,(.+)$/);
            if (matches) {
              parts.push({ inlineData: { mimeType: `image/${matches[1]}`, data: matches[2] } });
            }
          }

          const result = await model.generateContent({ contents: [{ role: "user", parts }] });
          reply = result.response.text();
          console.log("✅ تم تحليل الصورة عبر Gemini");
        } catch (geminiError: any) {
          console.warn("⚠️ فشل Gemini للصور:", geminiError.message);
          reply = "🖼️ عذراً، خدمة تحليل الصور غير متاحة حالياً (تم استنفاد الحصة اليومية). يُرجى المحاولة بعد 24 ساعة. يمكنك الآن استخدام المحادثة النصية بشكل طبيعي.";
        }
      } else {
        reply = "🖼️ عذراً، خدمة تحليل الصور غير مفعلة حالياً. يمكنك استخدام المحادثة النصية.";
      }
    }

    // ===== 2. التعامل مع النصوص فقط =====
    if (!hasImages) {
      let usedGroq = false;
      let usedGemini = false;

      // المحاولة الأولى: Groq
      const groqKey = process.env.GROQ_API_KEY;
      if (groqKey) {
        try {
          const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${groqKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "meta-llama/llama-4-scout-17b-16e-instruct",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
              ],
              temperature: 0.7,
              max_tokens: 1024,
            }),
          });

          if (groqRes.ok) {
            const data = await groqRes.json();
            reply = data.choices[0]?.message?.content || "";
            usedGroq = true;
            console.log("✅ تم الرد عبر Groq");
          } else {
            throw new Error("Groq API error");
          }
        } catch (groqError) {
          console.warn("⚠️ Groq فشل، جاري محاولة Gemini...");
        }
      }

      // المحاولة الثانية: Gemini (إذا لم ينجح Groq)
      if (!usedGroq) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey) {
          try {
            const genAI = new GoogleGenerativeAI(apiKey);
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
            const result = await model.generateContent(`${systemPrompt}\n\n${userPrompt}`);
            reply = result.response.text();
            usedGemini = true;
            console.log("✅ تم الرد عبر Gemini");
          } catch (geminiError) {
            console.warn("⚠️ Gemini فشل أيضاً.");
          }
        }
      }

      // إذا فشل كلاهما، نستخدم الوضع التجريبي
      if (!usedGroq && !usedGemini) {
        reply = getMockReply(userPrompt);
        console.log("🎭 استخدام الوضع التجريبي (Mock AI)");
      }
    }

    // إذا لم نستلم رداً بعد (حالة نادرة)، نستخدم الوضع التجريبي
    if (!reply) {
      reply = getMockReply(userPrompt);
      console.log("🎭 استخدام الوضع التجريبي كإجراء احتياطي");
    }

    await recordFeatureUsage(feature, userId, deviceFingerprint || null);

    return NextResponse.json({
      reply,
      remainingTrials: access.remainingTrials,
      trialEndsAt: access.trialEndsAt,
      subscriptionExpiresAt: access.subscriptionExpiresAt,
    });
  } catch (error: any) {
    console.error("Chat API Error:", error);
    return NextResponse.json({ error: "حدث خطأ في معالجة طلبك." }, { status: 500 });
  }
}