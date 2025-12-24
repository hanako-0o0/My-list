// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "マイアニメリスト・マイドラマリスト - My List アプリ",
  description: "マイアニメリスト、マイドラマリストとしてアニメ・ドラマの視聴管理ができるアプリです。",
  openGraph: {
    title: "マイアニメリスト・マイドラマリスト - My List アプリ",
    description: "アニメ・ドラマの視聴状況を簡単に管理できるMy Listアプリです。",
    url: "https://my-list-xi.vercel.app",
    siteName: "My List",
    images: [
      {
        url: "https://my-list-xi.vercel.app/og-image.png", // もしOG画像がない場合は省略可
        width: 1200,
        height: 630,
        alt: "My List サイト画像",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "マイアニメリスト・マイドラマリスト - My List アプリ",
    description: "アニメ・ドラマの視聴状況を簡単に管理できるMy Listアプリです。",
    images: ["https://my-list-xi.vercel.app/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
