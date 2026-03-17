import type { Metadata } from "next";
import { Assistant } from "next/font/google";
import "./globals.css";
import { getCurrentUser } from '@/lib/auth';

const assistant = Assistant({
  subsets: ["hebrew", "latin"],
  weight: ["400", "700"], 
});

export const metadata: Metadata = {
  title: "IPI PORTAL",
  description: "מערכת לשימור ידע בחברה",
  icons: {
    icon: '/favicon.ico?v=2',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  
  // 1. שליפת המשתמש
  const user = await getCurrentUser();

  // 2. פקודת הדפסה לטרמינל (תראה את זה ב-PM2 Logs או בטרמינל בשרת)
  console.log('--- User Identity Check ---');
  console.log('Username:', user.username);
  console.log('Department:', user.department);
  console.log('Display Name:', user.displayName);
  console.log('---------------------------');

  return (
    <html lang="he" dir="rtl">
      <body className={assistant.className}>
        {children}
      </body>
    </html>
  );
}