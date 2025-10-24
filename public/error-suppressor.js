/**
 * 🛡️ 超強力エラー抑制システム - ULTRA AGGRESSIVE MODE
 * すべてのブラウザ拡張機能エラーを完全に抑制
 * console.log/warn/error/info/debug すべてをフィルタリング
 */
(function() {
  'use strict';

  // ブラウザ拡張機能のエラーパターン（完全版 + 追加）
  const EXTENSION_PATTERNS = [
    // 拡張機能の基本パターン
    'chrome-extension://',
    'moz-extension://',
    'safari-extension://',
    'edge-extension://',

    // Chrome Runtime エラー
    'runtime.lastError',
    'Could not establish connection',
    'Receiving end does not exist',
    'Extension context invalidated',
    'Unchecked runtime.lastError',

    // 特定の拡張機能ファイル
    'hostname_check',
    'evmAsk.js',
    'evmAsk.ts',
    'inject.chrome',
    'inject.js',
    'content.js',
    'content-script',
    'fd55cc53.js',
    'hostname_check.fd55cc53.js',
    'pageProvider.js',
    'pageProvider.ts',
    '3e05a493.js',
    'inject.chrome.3e05a493.js',

    // Web3 / 暗号ウォレット拡張機能
    'Pocket Universe',
    'pocket universe',
    'Cannot redefine property: ethereum',
    'Cannot redefine property: solana',
    'Failed to define property',
    'web3',
    'phantom',
    'metamask',
    'coinbase',
    'walletconnect',

    // エラーメッセージ
    'Error sending to background',
    'background hostname check',
    'is running!', // "Pocket Universe is running!" など

    // CSSファイル（拡張機能が注入）
    'layout.css',
    'content.css',
    'inject.css',
    'extension.css',

    // その他の拡張機能パターン
    'grammarly',
    'lastpass',
    'adblock',
    '1password'
  ];

  // エラーメッセージが拡張機能由来かチェック
  function isExtensionError(message, filename, stack) {
    if (!message && !filename && !stack) return false;

    const combinedText = (message || '') + ' ' + (filename || '') + ' ' + (stack || '');
    const lowerText = combinedText.toLowerCase();

    return EXTENSION_PATTERNS.some(function(pattern) {
      return lowerText.indexOf(pattern.toLowerCase()) !== -1;
    });
  }

  // ========================================
  // 1. グローバルエラーハンドラー（最優先・キャプチャフェーズ）
  // ========================================
  window.addEventListener('error', function(event) {
    const message = event.message || '';
    const filename = event.filename || '';
    const stack = event.error ? (event.error.stack || '') : '';

    if (isExtensionError(message, filename, stack)) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      return false;
    }
  }, true);

  // ========================================
  // 2. Promise Rejection ハンドラー
  // ========================================
  window.addEventListener('unhandledrejection', function(event) {
    const reason = event.reason || {};
    let message = '';
    let stack = '';

    if (typeof reason === 'object' && reason !== null) {
      message = reason.message || reason.toString();
      stack = reason.stack || '';
    } else {
      message = String(reason);
    }

    if (isExtensionError(message, '', stack)) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      return false;
    }
  }, true);

  // ========================================
  // 3. Console メソッドの完全オーバーライド
  // ========================================

  // console.log のオーバーライド（最重要！拡張機能の多くはこれを使用）
  if (typeof console !== 'undefined' && console.log) {
    const originalLog = console.log;
    console.log = function() {
      const args = Array.prototype.slice.call(arguments);
      const message = args.map(function(arg) {
        if (arg === null) return 'null';
        if (arg === undefined) return 'undefined';
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg);
          } catch (e) {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');

      // 拡張機能のログをブロック
      if (!isExtensionError(message, '', '')) {
        originalLog.apply(console, args);
      }
    };
  }

  // console.error のオーバーライド
  if (typeof console !== 'undefined' && console.error) {
    const originalError = console.error;
    console.error = function() {
      const args = Array.prototype.slice.call(arguments);
      const message = args.map(function(arg) {
        if (arg === null) return 'null';
        if (arg === undefined) return 'undefined';
        if (typeof arg === 'object') {
          try {
            // エラーオブジェクトの場合はスタックも含める
            if (arg instanceof Error) {
              return arg.message + '\n' + (arg.stack || '');
            }
            return JSON.stringify(arg);
          } catch (e) {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');

      if (!isExtensionError(message, '', '')) {
        originalError.apply(console, args);
      }
    };
  }

  // console.warn のオーバーライド
  if (typeof console !== 'undefined' && console.warn) {
    const originalWarn = console.warn;
    console.warn = function() {
      const args = Array.prototype.slice.call(arguments);
      const message = args.map(function(arg) {
        if (arg === null) return 'null';
        if (arg === undefined) return 'undefined';
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg);
          } catch (e) {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');

      if (!isExtensionError(message, '', '')) {
        originalWarn.apply(console, args);
      }
    };
  }

  // console.info のオーバーライド
  if (typeof console !== 'undefined' && console.info) {
    const originalInfo = console.info;
    console.info = function() {
      const args = Array.prototype.slice.call(arguments);
      const message = args.map(function(arg) {
        if (arg === null) return 'null';
        if (arg === undefined) return 'undefined';
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg);
          } catch (e) {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');

      if (!isExtensionError(message, '', '')) {
        originalInfo.apply(console, args);
      }
    };
  }

  // console.debug のオーバーライド
  if (typeof console !== 'undefined' && console.debug) {
    const originalDebug = console.debug;
    console.debug = function() {
      const args = Array.prototype.slice.call(arguments);
      const message = args.map(function(arg) {
        if (arg === null) return 'null';
        if (arg === undefined) return 'undefined';
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg);
          } catch (e) {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');

      if (!isExtensionError(message, '', '')) {
        originalDebug.apply(console, args);
      }
    };
  }

  // ========================================
  // 4. Chrome Runtime エラー抑制
  // ========================================
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    // sendMessage のエラー抑制
    if (chrome.runtime.sendMessage) {
      const originalSendMessage = chrome.runtime.sendMessage;
      chrome.runtime.sendMessage = function() {
        try {
          return originalSendMessage.apply(this, arguments);
        } catch (e) {
          // エラーを無視
          return Promise.resolve();
        }
      };
    }

    // lastError のアクセスを傍受
    if (chrome.runtime.lastError) {
      try {
        Object.defineProperty(chrome.runtime, 'lastError', {
          get: function() {
            // lastError を読み取ってもコンソールに出力しない
            return undefined;
          },
          configurable: true
        });
      } catch (e) {
        // エラーを無視
      }
    }
  }

  // ========================================
  // 5. Resource Load エラー抑制（layout.css などの404エラー）
  // ========================================
  window.addEventListener('error', function(event) {
    const target = event.target || event.srcElement;

    if (target && (target.tagName === 'LINK' || target.tagName === 'SCRIPT' || target.tagName === 'IMG')) {
      const src = target.src || target.href || '';

      // 拡張機能のリソース読み込みエラーをブロック
      if (isExtensionError('', src, '')) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return false;
      }
    }
  }, true);

  // ========================================
  // 6. Ethereum / Web3 オブジェクト保護
  // ========================================
  if (typeof window !== 'undefined') {
    // 既に存在する ethereum オブジェクトを保護
    setTimeout(function() {
      if (window.ethereum) {
        try {
          Object.defineProperty(window, 'ethereum', {
            configurable: true,
            writable: true,
            enumerable: true,
            value: window.ethereum
          });
        } catch (e) {
          // エラーを無視（すでに定義されている場合）
        }
      }
    }, 0);

    // solana オブジェクトも保護
    setTimeout(function() {
      if (window.solana) {
        try {
          Object.defineProperty(window, 'solana', {
            configurable: true,
            writable: true,
            enumerable: true,
            value: window.solana
          });
        } catch (e) {
          // エラーを無視
        }
      }
    }, 0);
  }

  // ========================================
  // 7. MutationObserver で動的スクリプト/CSSを監視
  // ========================================
  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.addedNodes) {
          mutation.addedNodes.forEach(function(node) {
            // 拡張機能が注入するスクリプト・CSSを検出
            if (node.nodeName === 'SCRIPT' || node.nodeName === 'LINK') {
              const src = node.src || node.href || '';
              if (isExtensionError('', src, '')) {
                // エラーハンドラーを追加
                node.addEventListener('error', function(e) {
                  e.preventDefault();
                  e.stopPropagation();
                  e.stopImmediatePropagation();
                  return false;
                }, true);
              }
            }
          });
        }
      });
    });

    // body が利用可能になったら監視開始
    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    } else {
      document.addEventListener('DOMContentLoaded', function() {
        if (document.body) {
          observer.observe(document.body, {
            childList: true,
            subtree: true
          });
        }
      });
    }
  }

  // ========================================
  // 8. すべてのイベントリスナーをラップ
  // ========================================
  const originalAddEventListener = EventTarget.prototype.addEventListener;
  EventTarget.prototype.addEventListener = function(type, listener, options) {
    const wrappedListener = function(event) {
      try {
        if (typeof listener === 'function') {
          return listener.call(this, event);
        } else if (listener && typeof listener.handleEvent === 'function') {
          return listener.handleEvent(event);
        }
      } catch (error) {
        const message = error.message || '';
        const stack = error.stack || '';

        // 拡張機能のエラーは無視
        if (isExtensionError(message, '', stack)) {
          return;
        }

        // それ以外のエラーは再スロー
        throw error;
      }
    };

    return originalAddEventListener.call(this, type, wrappedListener, options);
  };

  // ========================================
  // 成功メッセージ（開発モードのみ）
  // ========================================
  setTimeout(function() {
    if (typeof process === 'undefined' || (typeof process !== 'undefined' && process.env && process.env.NODE_ENV !== 'production')) {
      console.log('%c✅ 超強力エラー抑制システム起動完了', 'color: green; font-weight: bold; font-size: 14px;');
      console.log('%c🛡️ すべてのブラウザ拡張機能エラーが完全にブロックされます', 'color: blue; font-size: 12px;');
      console.log('%c📋 対象: console.log/warn/error/info/debug すべて', 'color: gray; font-size: 10px;');
    }
  }, 100);
})();
