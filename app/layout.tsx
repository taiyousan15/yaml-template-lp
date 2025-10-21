import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YAML Template LP System",
  description: "全自動LP制作テンプレートシステム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.Node;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
