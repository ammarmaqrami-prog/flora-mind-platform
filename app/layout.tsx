import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "فلورا مايند - منصة الزراعة الذكية",
  description: "منصة عُمانية ذكية للزراعة المستدامة",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className="antialiased bg-gray-50">
        {children}
      </body>
    </html>
  );
}