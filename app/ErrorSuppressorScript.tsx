/**
 * インラインエラー抑制スクリプト（最優先実行）
 * HTMLの<head>内で即座に実行され、すべての拡張機能エラーをブロック
 */
export default function ErrorSuppressorScript() {
  // 超軽量・超高速な完全版エラー抑制スクリプト（minified）
  const scriptContent = `
(function(){
'use strict';
const P=['chrome-extension://','moz-extension://','runtime.lastError','Could not establish connection','hostname_check','evmAsk','inject.chrome','inject.js','content.js','content-script','Pocket Universe','pocket universe','Cannot redefine property: ethereum','Cannot redefine property: solana','web3','phantom','metamask','coinbase','fd55cc53.js','hostname_check.fd55cc53.js','pageProvider.js','pageProvider.ts','3e05a493.js','inject.chrome.3e05a493.js','Error sending to background','is running!','layout.css','content.css','inject.css','extension.css','grammarly','lastpass','adblock','1password','Extension context invalidated','Unchecked runtime.lastError'];
function isE(m,f,s){
if(!m&&!f&&!s)return false;
const t=((m||'')+' '+(f||'')+' '+(s||'')).toLowerCase();
return P.some(p=>t.indexOf(p.toLowerCase())!==-1);
}
window.addEventListener('error',function(e){
const m=e.message||'',f=e.filename||'',s=e.error?(e.error.stack||''):'';
if(isE(m,f,s)){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();return false;}
},true);
window.addEventListener('unhandledrejection',function(e){
const r=e.reason||{};
let m='',s='';
if(typeof r==='object'&&r!==null){m=r.message||r.toString();s=r.stack||'';}else{m=String(r);}
if(isE(m,'',s)){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();return false;}
},true);
if(typeof console!=='undefined'){
if(console.log){const oL=console.log;console.log=function(){const a=Array.prototype.slice.call(arguments);const m=a.map(x=>x===null?'null':x===undefined?'undefined':typeof x==='object'?(x instanceof Error?x.message+'\\n'+(x.stack||''):JSON.stringify(x)):String(x)).join(' ');if(!isE(m,'','')){oL.apply(console,a);}};}
if(console.error){const oE=console.error;console.error=function(){const a=Array.prototype.slice.call(arguments);const m=a.map(x=>x===null?'null':x===undefined?'undefined':typeof x==='object'?(x instanceof Error?x.message+'\\n'+(x.stack||''):JSON.stringify(x)):String(x)).join(' ');if(!isE(m,'','')){oE.apply(console,a);}};}
if(console.warn){const oW=console.warn;console.warn=function(){const a=Array.prototype.slice.call(arguments);const m=a.map(x=>x===null?'null':x===undefined?'undefined':typeof x==='object'?JSON.stringify(x):String(x)).join(' ');if(!isE(m,'','')){oW.apply(console,a);}};}
if(console.info){const oI=console.info;console.info=function(){const a=Array.prototype.slice.call(arguments);const m=a.map(x=>x===null?'null':x===undefined?'undefined':typeof x==='object'?JSON.stringify(x):String(x)).join(' ');if(!isE(m,'','')){oI.apply(console,a);}};}
if(console.debug){const oD=console.debug;console.debug=function(){const a=Array.prototype.slice.call(arguments);const m=a.map(x=>x===null?'null':x===undefined?'undefined':typeof x==='object'?JSON.stringify(x):String(x)).join(' ');if(!isE(m,'','')){oD.apply(console,a);}};}
}
if(typeof chrome!=='undefined'&&chrome.runtime){
if(chrome.runtime.sendMessage){const oSM=chrome.runtime.sendMessage;chrome.runtime.sendMessage=function(){try{return oSM.apply(this,arguments);}catch(e){return Promise.resolve();}};}
}
window.addEventListener('error',function(e){
const t=e.target||e.srcElement;
if(t&&(t.tagName==='LINK'||t.tagName==='SCRIPT'||t.tagName==='IMG')){
const src=t.src||t.href||'';
if(isE('',src,'')){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();return false;}
}
},true);
})();
  `;

  return (
    <script
      dangerouslySetInnerHTML={{ __html: scriptContent }}
      // このスクリプトは同期的に実行される（非同期ロードしない）
    />
  );
}
