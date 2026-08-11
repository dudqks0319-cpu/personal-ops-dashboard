import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Youngbin Life OS",
  description: "집밥노트 90일 집중, 오늘 체크리스트, 교대근무 시간표와 D-day를 관리하는 개인 운영 화면",
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
