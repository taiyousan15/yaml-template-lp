'use client';

import { useEffect } from 'react';

/**
 * グローバルエラーハンドラー - ブラウザ拡張機能のエラーを抑制
 *
 * このコンポーネントはブラウザ拡張機能（Pocket Universe、MetaMask、その他のWeb3拡張機能など）
 * からのノイズエラーをコンソールに表示されないようにフィルタリングします。
 */
export default function GlobalErrorSuppressor() {
  useEffect(() => {
    // ブラウザ拡張機能のエラーパターン
    const EXTENSION_ERROR_PATTERNS = [
      'chrome-extension://',
      'moz-extension://',
      'safari-extension://',
      'runtime.lastError',
      'Could not establish connection',
      'Receiving end does not exist',
      'hostname_check',
      'evmAsk.js',
      'inject.chrome',
      'Pocket Universe',
      'Cannot redefine property: ethereum',
      'content-script',
      'background hostname check',
      'Unchecked runtime.lastError',
      'Failed to define property',
      'Extension context invalidated',
      'web3',
      'phantom'
    ];

    // エラーがブラウザ拡張機能由来かチェック
    const isExtensionError = (message: string): boolean => {
      return EXTENSION_ERROR_PATTERNS.some(pattern =>
        message.toLowerCase().includes(pattern.toLowerCase())
      );
    };

    // 1. グローバルエラーハンドラー
    const errorHandler = (event: ErrorEvent) => {
      const errorMessage = event.message || '';
      const errorFilename = event.filename || '';
      const fullMessage = `${errorMessage} ${errorFilename}`;

      if (isExtensionError(fullMessage)) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    };

    // 2. Promise Rejection ハンドラー
    const rejectionHandler = (event: PromiseRejectionEvent) => {
      const reason = event.reason || {};
      let message = '';

      if (typeof reason === 'object' && reason !== null) {
        message = reason.message || reason.toString();
      } else {
        message = String(reason);
      }

      if (isExtensionError(message)) {
        event.preventDefault();
        return false;
      }
    };

    // 3. Console.error のオーバーライド
    const originalConsoleError = console.error;
    console.error = function(...args: any[]) {
      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');

      if (!isExtensionError(message)) {
        originalConsoleError.apply(console, args);
      }
    };

    // 4. Console.warn のオーバーライド
    const originalConsoleWarn = console.warn;
    console.warn = function(...args: any[]) {
      const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');

      if (!isExtensionError(message)) {
        originalConsoleWarn.apply(console, args);
      }
    };

    // イベントリスナーを登録
    window.addEventListener('error', errorHandler, true);
    window.addEventListener('unhandledrejection', rejectionHandler);

    // 開発モードでのみログ出力
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ GlobalErrorSuppressor: ブラウザ拡張機能のエラー抑制を有効化');
    }

    // クリーンアップ
    return () => {
      window.removeEventListener('error', errorHandler, true);
      window.removeEventListener('unhandledrejection', rejectionHandler);
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
    };
  }, []);

  // このコンポーネントはUIを持たない
  return null;
}
