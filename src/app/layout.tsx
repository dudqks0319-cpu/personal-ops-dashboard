import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "개인 운영 대시보드",
  description: "할 일, 집중시간, 메모, 일정, 날씨를 한 화면에서 관리하는 개인 대시보드",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
