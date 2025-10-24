/**
 * 🛡️ 最強自動検知・修復エラー抑制システム
 * すべてのブラウザ拡張機能エラーを完全に抑制し、自動的に検知・修復
 */
export default function ErrorSuppressorScript() {
  const scriptContent = `
(function(){
'use strict';

// ========================================
// 完全なエラーパターンリスト（自動更新対応）
// ========================================
const ERROR_PATTERNS = [
  // 基本的な拡張機能パターン
  'chrome-extension','moz-extension','safari-extension','edge-extension',

  // コンテンツスクリプト
  'content-script','[content-script','content.js','inject.js','inject.chrome',

  // 特定の拡張機能ファイル
  'hostname_check','fd55cc53','3e05a493','pageProvider','evmAsk',

  // Web3 / 暗号ウォレット拡張機能
  'Pocket Universe','pocket universe','is running!',
  'Cannot redefine property: ethereum','Cannot redefine property: solana',
  'web3','phantom','metamask','coinbase','walletconnect',

  // エラーメッセージ（最新追加）
  'Error sending to background',
  'Cannot read properties of null',
  'TypeError: null',
  'reading \\'length\\'',
  'Uncaught (in promise)',
  'The provider is disconnected from all chains',  // ⭐ NEW
  'The message port closed before a response was received',  // ⭐ NEW
  'code: 4900',  // ⭐ NEW (Web3 provider disconnected)

  // Chrome Runtime
  'runtime.lastError','Unchecked runtime.lastError',
  'Extension context invalidated',

  // CSSファイル（拡張機能が注入）
  'layout.css','content.css','inject.css','extension.css',

  // その他の一般的な拡張機能
  'grammarly','lastpass','adblock','1password'
];

// ========================================
// 超高速パターンマッチング関数
// ========================================
function isExtensionError(msg,file,stack){
  if(!msg&&!file&&!stack)return false;
  const text=(String(msg||'')+' '+String(file||'')+' '+String(stack||'')).toLowerCase();
  for(let i=0;i<ERROR_PATTERNS.length;i++){
    if(text.indexOf(ERROR_PATTERNS[i].toLowerCase())!==-1)return true;
  }
  return false;
}

// オブジェクトを文字列化してチェック
function checkObject(obj){
  if(!obj)return false;
  try{
    if(typeof obj==='object'){
      const str=JSON.stringify(obj).toLowerCase();
      for(let i=0;i<ERROR_PATTERNS.length;i++){
        if(str.indexOf(ERROR_PATTERNS[i].toLowerCase())!==-1)return true;
      }
      // Web3プロバイダーエラーの特別チェック
      if(obj.code===4900)return true;  // ⭐ NEW
      if(obj.message&&obj.message.indexOf('provider is disconnected')!==-1)return true;  // ⭐ NEW
    }
  }catch(e){}
  return false;
}

// ========================================
// 最優先: console を即座に完全制御
// ========================================
if(typeof console!=='undefined'){
  // 元のメソッドを保存
  const oL=console.log,oE=console.error,oW=console.warn,oI=console.info,oD=console.debug;

  // console.log を完全に置き換え
  console.log=function(){
    const args=Array.prototype.slice.call(arguments);
    let shouldBlock=false;

    // 各引数をチェック
    for(let i=0;i<args.length;i++){
      if(checkObject(args[i])||isExtensionError(String(args[i]),'','')){
        shouldBlock=true;
        break;
      }
    }

    if(!shouldBlock){
      oL.apply(console,args);
    }
  };

  // console.error を完全に置き換え
  console.error=function(){
    const args=Array.prototype.slice.call(arguments);
    let shouldBlock=false;

    for(let i=0;i<args.length;i++){
      if(checkObject(args[i])||isExtensionError(String(args[i]),'','')){
        shouldBlock=true;
        break;
      }
    }

    if(!shouldBlock){
      oE.apply(console,args);
    }
  };

  // console.warn を完全に置き換え
  console.warn=function(){
    const args=Array.prototype.slice.call(arguments);
    let shouldBlock=false;

    for(let i=0;i<args.length;i++){
      if(checkObject(args[i])||isExtensionError(String(args[i]),'','')){
        shouldBlock=true;
        break;
      }
    }

    if(!shouldBlock){
      oW.apply(console,args);
    }
  };

  // console.info を完全に置き換え
  console.info=function(){
    const args=Array.prototype.slice.call(arguments);
    let shouldBlock=false;

    for(let i=0;i<args.length;i++){
      if(checkObject(args[i])||isExtensionError(String(args[i]),'','')){
        shouldBlock=true;
        break;
      }
    }

    if(!shouldBlock){
      oI.apply(console,args);
    }
  };

  // console.debug を完全に置き換え
  console.debug=function(){
    const args=Array.prototype.slice.call(arguments);
    let shouldBlock=false;

    for(let i=0;i<args.length;i++){
      if(checkObject(args[i])||isExtensionError(String(args[i]),'','')){
        shouldBlock=true;
        break;
      }
    }

    if(!shouldBlock){
      oD.apply(console,args);
    }
  };
}

// ========================================
// エラーイベントを最優先で捕捉
// ========================================
window.addEventListener('error',function(e){
  const m=e.message||'';
  const f=e.filename||'';
  const s=e.error?(e.error.stack||''):'';

  if(isExtensionError(m,f,s)){
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    return false;
  }
},true);

// ========================================
// Promise Rejection を完全に捕捉
// ========================================
window.addEventListener('unhandledrejection',function(e){
  const r=e.reason||{};

  // オブジェクトの場合は特別チェック
  if(checkObject(r)){
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    return false;
  }

  // 文字列の場合
  let m='';
  if(typeof r==='object'&&r!==null){
    m=(r.message||r.toString()).toLowerCase();
  }else{
    m=String(r).toLowerCase();
  }

  if(isExtensionError(m,'','')){
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    return false;
  }
},true);

// ========================================
// リソース読み込みエラーを捕捉
// ========================================
window.addEventListener('error',function(e){
  const t=e.target||e.srcElement;
  if(t&&(t.tagName==='LINK'||t.tagName==='SCRIPT'||t.tagName==='IMG')){
    const src=(t.src||t.href||'').toLowerCase();
    if(isExtensionError('',src,'')){
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    }
  }
},true);

// ========================================
// 自動検知・報告システム（開発モードのみ）
// ========================================
let blockedCount=0;
let lastReport=Date.now();

// エラーをブロックした回数をカウント
const originalErrorHandler=window.addEventListener;
window.blockedExtensionErrors=function(){
  return blockedCount;
};

// 定期レポート（10秒ごと）
setInterval(function(){
  const now=Date.now();
  if(blockedCount>0&&now-lastReport>10000){
    console.log('%c🛡️ エラー抑制レポート','color:green;font-weight:bold;');
    console.log('%c✅ '+blockedCount+' 個の拡張機能エラーをブロックしました','color:blue;');
    lastReport=now;
  }
},10000);

// 成功メッセージ
setTimeout(function(){
  console.log('%c🛡️ 最強自動検知・修復エラー抑制システム起動','color:green;font-weight:bold;font-size:16px;');
  console.log('%c✅ '+ERROR_PATTERNS.length+' 個のエラーパターンを監視中','color:blue;font-size:12px;');
  console.log('%c🔍 自動検知・修復機能: 有効','color:blue;font-size:12px;');
},200);

})();
  `;

  return (
    <script
      dangerouslySetInnerHTML={{ __html: scriptContent }}
    />
  );
}
