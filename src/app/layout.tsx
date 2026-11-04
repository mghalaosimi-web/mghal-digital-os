import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MGHAL Digital OS",
  description: "مساحة العمل الرقمية الذكية لإدارة الهوية والمحتوى والمشاريع والمعرفة.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
