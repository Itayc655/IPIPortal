import type { Metadata } from "next";
import { Assistant } from "next/font/google"; // 1. מייבאים את הפונט
import "./globals.css";
import { headers } from 'next/headers';
import { getCurrentUser } from '@/lib/auth';

// 2. מגדירים את הפונט ותומכים בעברית
const assistant = Assistant({
  subsets: ["hebrew", "latin"],
  weight: ["300", "400", "600", "700", "800"], // משקלים שונים (רגיל, מודגש, שמן)
});

export const metadata: Metadata = {
  title: "IPI PORTAL",
  description: "מערכת לשימור ידע בחברה",
  icons: {
    icon: '/favicon.ico?v=2', // התוספת הזו שוברת את המטמון של הדפדפן
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  
  // הנתונים נמשכים ונשמרים בזיכרון מאחורי הקלעים
  const user = await getCurrentUser();

  // לדוגמה: אפשר להשתמש בנתונים כאן כדי לבדוק הרשאות
  // const isIT = user.department === 'IT';

  return (
    <html lang="he" dir="rtl">
      <body className={assistant.className}>
        {children}
      </body>
    </html>
  );
}