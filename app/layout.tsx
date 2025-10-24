import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import ClientProvider from "@/components/ClientProvider";
import ErrorSuppressorScript from "./ErrorSuppressorScript";

export const metadata: Metadata = {
  title: "YAML Template LP System",
  description: "全自動LP制作テンプレートシステム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        {/* インラインで即座に実行されるエラー抑制スクリプト */}
        <ErrorSuppressorScript />
        {/* 外部ファイルとしても読み込み（二重防御） */}
        <Script
          src="/error-suppressor.js"
          strategy="beforeInteractive"
        />
      </head>
      <body>
        <ClientProvider>{children}</ClientProvider>
      </body>
    </html>
  );
}
