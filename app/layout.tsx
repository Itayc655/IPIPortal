import type { Metadata } from "next";
import { Assistant } from "next/font/google"; // 1. מייבאים את הפונט
import "./globals.css";

// 2. מגדירים את הפונט ותומכים בעברית
const assistant = Assistant({ 
  subsets: ["hebrew", "latin"], 
  weight: ["300", "400", "600", "700", "800"], // משקלים שונים (רגיל, מודגש, שמן)
});

export const metadata: Metadata = {
  title: "IPI PORTAL",
  description: "מערכת לשימור ידע בחברה",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      {/* 3. מחילים את הפונט על כל הגוף של האתר */}
      <body className={assistant.className}>{children}</body>
    </html>
  );
}