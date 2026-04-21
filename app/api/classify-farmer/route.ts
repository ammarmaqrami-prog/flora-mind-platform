import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { query } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    const token = authHeader.substring(7);
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    const userId = decoded.userId;

    const { experience, goal, space, waterAvailability } = await req.json();

    // تصنيف بسيط يعتمد على القواعد
    let classification = "";
    let icon = "";
    if (space === "small" && goal === "home") {
      classification = "مزارع منزلي";
      icon = "🏡";
    } else if (goal === "commercial") {
      classification = "مزارع تجاري";
      icon = "💰";
    } else {
      classification = "مزارع هاوٍ";
      icon = "🌱";
    }

    const tips = [
      "ابدأ بمحاصيل سهلة مثل النعناع والريحان.",
      "استخدم تربة زراعية جيدة التصريف.",
      "اسقِ النباتات صباحًا للحفاظ على الرطوبة."
    ];
    const tools = ["مرشة ماء", "سماد عضوي", "أصيص زراعي"];

    await query(
      `UPDATE users SET farmer_type = $1, experience_level = $2 WHERE id = $3`,
      [classification, experience, userId]
    );

    return NextResponse.json({
      classification,
      icon,
      description: `أنت ${classification}، يناسبك نباتات الزينة والخضروات البسيطة.`,
      tips,
      tools
    });
  } catch (error) {
    console.error("Classification error:", error);
    return NextResponse.json({ error: "فشل تصنيف المزارع" }, { status: 500 });
  }
}