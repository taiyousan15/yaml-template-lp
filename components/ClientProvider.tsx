'use client';

import GlobalErrorSuppressor from './GlobalErrorSuppressor';

/**
 * クライアントサイドプロバイダー
 * グローバルエラーハンドラーなどのクライアント専用機能を提供
 */
export default function ClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <GlobalErrorSuppressor />
      {children}
    </>
  );
}
