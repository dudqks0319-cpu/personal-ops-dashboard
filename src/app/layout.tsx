import type { Metadata } from "next";
import { AppNav } from "@/components/AppNav";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Youngbin Life OS",
    template: "%s · Youngbin Life OS",
  },
  description: "오늘의 생활 운영과 GitHub 프로젝트 흐름을 한곳에서 확인하는 개인 대시보드",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <AppNav />
        {children}
      </body>
    </html>
  );
}
