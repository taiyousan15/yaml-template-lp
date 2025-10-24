'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import yaml from 'js-yaml';

export default function YAMLRendererPage() {
  const [yamlText, setYamlText] = useState('');
  const [parsedData, setParsedData] = useState<any>(null);
  const [parseError, setParseError] = useState('');

  // ブラウザ拡張機能のエラーを抑制
  useEffect(() => {
    // グローバルエラーハンドラー
    const errorHandler = (event: ErrorEvent) => {
      const extensionErrors = [
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
        'background hostname check'
      ];

      const errorMessage = event.message || '';
      const errorFilename = event.filename || '';

      const isExtensionError = extensionErrors.some(pattern =>
        errorMessage.includes(pattern) || errorFilename.includes(pattern)
      );

      if (isExtensionError) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    };

    // Promise Rejection ハンドラー
    const rejectionHandler = (event: PromiseRejectionEvent) => {
      const reason = event.reason || {};
      const message = typeof reason === 'object' && reason.message ? reason.message : reason.toString();

      const extensionPatterns = [
        'chrome-extension://',
        'runtime.lastError',
        'Could not establish connection',
        'hostname_check',
        'evmAsk',
        'inject.chrome',
        'Pocket Universe'
      ];

      const isExtensionError = extensionPatterns.some(pattern =>
        message.includes(pattern)
      );

      if (isExtensionError) {
        event.preventDefault();
        return false;
      }
    };

    // Console.error のオーバーライド
    const originalConsoleError = console.error;
    console.error = function(...args: any[]) {
      const message = args.join(' ');

      const extensionPatterns = [
        'chrome-extension://',
        'moz-extension://',
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
        'Failed to define property'
      ];

      const isExtensionError = extensionPatterns.some(pattern =>
        message.includes(pattern)
      );

      if (!isExtensionError) {
        originalConsoleError.apply(console, args);
      }
    };

    window.addEventListener('error', errorHandler, true);
    window.addEventListener('unhandledrejection', rejectionHandler);

    console.log('✅ ブラウザ拡張機能のエラー抑制を有効化しました');

    return () => {
      window.removeEventListener('error', errorHandler, true);
      window.removeEventListener('unhandledrejection', rejectionHandler);
      console.error = originalConsoleError;
    };
  }, []);

  // 初期化時にlocalStorageから読み込み
  useEffect(() => {
    const importedYAML = localStorage.getItem('importedYAML');
    if (importedYAML) {
      setYamlText(importedYAML);
      parseYAML(importedYAML);
      // 一度読み込んだら削除
      localStorage.removeItem('importedYAML');
    }
  }, []);

  // YAMLをパース
  const parseYAML = (yamlString: string) => {
    try {
      const parsed = yaml.load(yamlString);

      // 異なるYAML形式に対応
      // 形式1: LPデザイン分析agent形式（design_tokens + hero/features/etc）
      if (parsed && typeof parsed === 'object' && parsed !== null &&
          ('hero' in parsed || 'features' in parsed || 'design_tokens' in parsed)) {
        // LPデザイン分析agent形式を内部形式に変換
        const convertedData = convertLPAnalysisFormat(parsed);
        setParsedData(convertedData);
        setParseError('');
        return convertedData;
      }

      // 形式2: sections構造（高度YAML生成の出力形式）
      if (parsed && typeof parsed === 'object' && parsed !== null && 'sections' in parsed) {
        setParsedData(parsed);
        setParseError('');
        return parsed;
      }

      // 形式3: component配列形式
      if (Array.isArray(parsed)) {
        // component形式を sections形式に変換
        const convertedData: any = {
          sections: {}
        };

        parsed.forEach((item: any, index: number) => {
          const componentName = item.component || `section${index}`;
          const sectionKey = componentName.toLowerCase();

          convertedData.sections[sectionKey] = {
            type: componentName.toLowerCase(),
            layout: {},
            background: {},
            texts: item.text ? [{ content: item.text, role: 'body', fontSize: item.style?.['font-size'] || 'text-base', fontWeight: item.style?.['font-weight'] || 'normal', color: item.style?.color || '#000000', alignment: item.style?.['text-align'] || 'left' }] : [],
            buttons: [],
            items: []
          };
        });

        setParsedData(convertedData);
        setParseError('');
        return convertedData;
      }

      // パースできたが形式が不明
      setParsedData(parsed);
      setParseError('');
      return parsed;
    } catch (error: any) {
      setParseError(`YAMLパースエラー: ${error.message}`);
      return null;
    }
  };

  // LPデザイン分析agent形式を内部形式に変換
  const convertLPAnalysisFormat = (data: any) => {
    const sections: any = {};
    const tokens = data.design_tokens || {};

    // Heroセクション
    if (data.hero) {
      const hero = data.hero;
      sections.hero = {
        type: 'hero',
        layout: {
          padding: hero.layout?.padding || '80px 24px',
          minHeight: hero.layout?.min_height || '100vh',
          display: hero.layout?.display || 'flex',
          alignItems: hero.layout?.align_items || 'center',
          justifyContent: hero.layout?.justify_content || 'center',
        },
        background: {
          type: 'solid',
          color: hero.background_color || tokens.colors?.primary || '#1a1a2e',
          image: hero.background_image,
        },
        texts: [
          hero.headline?.text && {
            role: 'headline',
            content: hero.headline.text,
            fontSize: hero.headline.font_size || tokens.typography?.['size-4'] || '48px',
            fontFamily: hero.headline.font_family || tokens.typography?.font_primary || 'sans-serif',
            color: hero.headline.color || '#FFFFFF',
            lineHeight: hero.headline.line_height || '1.2',
            alignment: 'center',
            fontWeight: 'bold',
            marginBottom: hero.headline.margin_bottom || tokens.spacing?.lg || '32px',
          },
          hero.subheadline?.text && {
            role: 'subheadline',
            content: hero.subheadline.text,
            fontSize: hero.subheadline.font_size || tokens.typography?.['size-1'] || '18px',
            color: hero.subheadline.color || '#E0E0E0',
            alignment: 'center',
            marginBottom: hero.subheadline.margin_bottom || tokens.spacing?.xl || '48px',
          },
        ].filter(Boolean),
        buttons: hero.cta_button ? [{
          text: hero.cta_button.text || 'CTA',
          bgColor: hero.cta_button.background_color || tokens.colors?.secondary || '#7FE86C',
          textColor: hero.cta_button.text_color || '#FFFFFF',
          size: 'large',
          borderRadius: hero.cta_button.border_radius || tokens.borders?.['radius-lg'] || '9999px',
          shadow: true,
          padding: hero.cta_button.padding,
          transition: hero.cta_button.transition || 'all 0.3s ease',
          hoverTransform: hero.cta_button.hover_transform || 'scale(1.05)',
        }] : [],
      };
    }

    // Featuresセクション
    if (data.features) {
      const features = data.features;
      sections.features = {
        type: 'features',
        layout: {
          padding: features.layout?.padding || '64px 24px',
          display: features.layout?.display || 'grid',
          gridColumns: features.layout?.grid_columns || 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: features.layout?.gap || tokens.spacing?.lg || '32px',
        },
        background: {
          type: 'solid',
          color: '#FFFFFF',
        },
        texts: features.section_title ? [{
          role: 'headline',
          content: features.section_title.text || features.section_title,
          fontSize: features.section_title.font_size || tokens.typography?.['size-3'] || '36px',
          color: features.section_title.color || tokens.colors?.primary || '#1a1a2e',
          alignment: features.section_title.text_align || 'center',
          marginBottom: features.section_title.margin_bottom || tokens.spacing?.xl || '48px',
          fontWeight: 'bold',
        }] : [],
        items: (features.items || []).map((item: any) => ({
          icon: item.icon,
          title: item.title,
          description: item.description,
          cardBackground: item.card_background || '#FFFFFF',
          cardPadding: item.card_padding || tokens.spacing?.lg || '32px',
          cardBorderRadius: item.card_border_radius || tokens.borders?.['radius-md'] || '16px',
          cardShadow: item.card_shadow || tokens.shadows?.['shadow-0'] || '0 4px 6px rgba(0, 0, 0, 0.1)',
        })),
      };
    }

    // Testimonialsセクション
    if (data.testimonials) {
      const testimonials = data.testimonials;
      sections.testimonials = {
        type: 'testimonials',
        layout: {
          padding: '64px 24px',
          gap: '32px',
        },
        background: {
          type: 'solid',
          color: '#F9FAFB',
        },
        texts: testimonials.section_title ? [{
          role: 'headline',
          content: testimonials.section_title.text || testimonials.section_title,
          fontSize: testimonials.section_title.font_size || '36px',
          color: testimonials.section_title.color || tokens.colors?.primary || '#1a1a2e',
          alignment: 'center',
          marginBottom: '48px',
          fontWeight: 'bold',
        }] : [],
        items: (testimonials.items || []).map((item: any) => ({
          name: item.name,
          role: item.role,
          comment: item.comment,
          rating: item.rating || 5,
          avatar: item.avatar,
        })),
      };
    }

    // Pricingセクション
    if (data.pricing) {
      const pricing = data.pricing;
      sections.pricing = {
        type: 'pricing',
        layout: {
          padding: '64px 24px',
          gap: '32px',
        },
        background: {
          type: 'solid',
          color: '#FFFFFF',
        },
        texts: pricing.section_title ? [{
          role: 'headline',
          content: pricing.section_title.text || pricing.section_title,
          fontSize: pricing.section_title.font_size || '36px',
          color: tokens.colors?.primary || '#1a1a2e',
          alignment: 'center',
          marginBottom: '48px',
          fontWeight: 'bold',
        }] : [],
        items: (pricing.plans || []).map((plan: any) => ({
          name: plan.name,
          price: plan.price,
          features: plan.features || [],
          ctaText: plan.cta_text || plan.cta,
          highlight: plan.highlight || false,
        })),
      };
    }

    // FAQセクション
    if (data.faq) {
      const faq = data.faq;
      sections.faq = {
        type: 'faq',
        layout: {
          padding: '64px 24px',
        },
        background: {
          type: 'solid',
          color: '#F9FAFB',
        },
        texts: faq.section_title ? [{
          role: 'headline',
          content: faq.section_title.text || faq.section_title,
          fontSize: faq.section_title.font_size || '36px',
          color: tokens.colors?.primary || '#1a1a2e',
          alignment: 'center',
          marginBottom: '48px',
          fontWeight: 'bold',
        }] : [],
        items: (faq.items || []).map((item: any) => ({
          question: item.question,
          answer: item.answer,
        })),
      };
    }

    // CTAセクション
    if (data.cta) {
      const cta = data.cta;
      sections.cta = {
        type: 'cta',
        layout: {
          padding: cta.padding || '64px 24px',
        },
        background: {
          type: 'solid',
          color: cta.background_color || tokens.colors?.primary || '#1a1a2e',
        },
        texts: cta.headline ? [{
          role: 'headline',
          content: cta.headline.text || cta.headline,
          fontSize: cta.headline.font_size || '36px',
          color: cta.headline.color || '#FFFFFF',
          alignment: 'center',
          marginBottom: '32px',
          fontWeight: 'bold',
        }] : [],
        buttons: cta.button ? [{
          text: cta.button.text,
          bgColor: cta.button.background_color || tokens.colors?.secondary || '#7FE86C',
          textColor: cta.button.text_color || '#FFFFFF',
          size: 'large',
          borderRadius: cta.button.border_radius || '9999px',
          shadow: true,
          padding: cta.button.padding,
        }] : [],
      };
    }

    // Footerセクション
    if (data.footer) {
      const footer = data.footer;
      sections.footer = {
        type: 'footer',
        layout: {
          padding: footer.padding || '32px 24px',
        },
        background: {
          type: 'solid',
          color: footer.background_color || tokens.colors?.primary || '#1a1a2e',
        },
        texts: [{
          role: 'body',
          content: footer.company_name || '',
          color: footer.text_color || '#FFFFFF',
          alignment: 'center',
          fontSize: '18px',
          fontWeight: 'bold',
          marginBottom: '16px',
        }],
        items: (footer.links || []).map((link: any) => ({
          text: link.text,
          url: link.url,
        })),
        copyright: footer.copyright,
      };
    }

    return {
      meta: data.meta || {},
      design_tokens: tokens,
      sections,
    };
  };

  // Tailwind CSSクラスをインラインスタイルに変換
  const tailwindToStyle = (className: string): React.CSSProperties => {
    const style: React.CSSProperties = {};

    // フォントサイズ
    if (className.includes('text-5xl')) style.fontSize = '3rem';
    else if (className.includes('text-4xl')) style.fontSize = '2.25rem';
    else if (className.includes('text-3xl')) style.fontSize = '1.875rem';
    else if (className.includes('text-2xl')) style.fontSize = '1.5rem';
    else if (className.includes('text-xl')) style.fontSize = '1.25rem';
    else if (className.includes('text-lg')) style.fontSize = '1.125rem';
    else if (className.includes('text-base')) style.fontSize = '1rem';
    else if (className.includes('text-sm')) style.fontSize = '0.875rem';
    else if (className.includes('text-xs')) style.fontSize = '0.75rem';

    // フォントウェイト
    if (className.includes('font-bold')) style.fontWeight = 700;
    else if (className.includes('font-semibold')) style.fontWeight = 600;
    else if (className.includes('font-medium')) style.fontWeight = 500;
    else if (className.includes('font-light')) style.fontWeight = 300;
    else if (className.includes('font-normal')) style.fontWeight = 400;

    // テキスト配置
    if (className.includes('text-center')) style.textAlign = 'center';
    else if (className.includes('text-left')) style.textAlign = 'left';
    else if (className.includes('text-right')) style.textAlign = 'right';

    // 行間
    if (className.includes('leading-tight')) style.lineHeight = '1.25';
    else if (className.includes('leading-relaxed')) style.lineHeight = '1.625';
    else if (className.includes('leading-normal')) style.lineHeight = '1.5';

    return style;
  };

  // セクションをレンダリング
  const renderSection = (sectionKey: string, section: any, index: number) => {
    if (!section) return null;

    const layout = section.layout || {};
    const background = section.background || {};
    const texts = section.texts || [];
    const buttons = section.buttons || [];
    const items = section.items || [];
    const type = section.type || sectionKey;

    // セクションスタイル
    const sectionStyle: React.CSSProperties = {
      padding: layout.padding || '80px 20px',
      maxWidth: layout.max_width || layout.maxWidth || '100%',
      margin: '0 auto',
      textAlign: layout.alignment === 'center' ? 'center' : layout.alignment === 'right' ? 'right' : 'left',
      minHeight: layout.minHeight,
      display: layout.display || 'block',
      alignItems: layout.alignItems,
      justifyContent: layout.justifyContent,
    };

    // 背景スタイル
    if (background.type === 'gradient' && background.gradient) {
      const { from, to, direction } = background.gradient;
      const gradientDirection = direction === 'to-bottom' ? 'to bottom' :
                               direction === 'to-right' ? 'to right' :
                               direction === 'to-top' ? 'to top' :
                               direction === 'to-left' ? 'to left' : 'to bottom';
      sectionStyle.background = `linear-gradient(${gradientDirection}, ${from}, ${to})`;
    } else if (background.color) {
      sectionStyle.backgroundColor = background.color;
    }
    if (background.image) {
      sectionStyle.backgroundImage = `url(${background.image})`;
      sectionStyle.backgroundSize = 'cover';
      sectionStyle.backgroundPosition = 'center';
    }

    // セクションタイプ別レンダリング
    if (type === 'testimonials') {
      return renderTestimonialsSection(sectionKey, section, index, sectionStyle);
    }
    if (type === 'pricing') {
      return renderPricingSection(sectionKey, section, index, sectionStyle);
    }
    if (type === 'faq') {
      return renderFAQSection(sectionKey, section, index, sectionStyle);
    }
    if (type === 'footer') {
      return renderFooterSection(sectionKey, section, index, sectionStyle);
    }

    return (
      <section key={`${sectionKey}-${index}`} style={sectionStyle}>
        <div style={{ maxWidth: layout.maxWidth || '1200px', margin: '0 auto' }}>
          {/* テキスト */}
          {texts.map((text: any, i: number) => {
            const textStyle: React.CSSProperties = {
              color: text.color || '#000000',
              marginBottom: text.marginBottom || (text.role === 'headline' ? '20px' : text.role === 'subheadline' ? '15px' : '10px'),
              fontSize: parseFontSize(text.fontSize),
              fontFamily: text.fontFamily,
              fontWeight: text.fontWeight === 'bold' ? 700 : text.fontWeight === 'semibold' ? 600 : text.fontWeight === 'medium' ? 500 : 400,
              textAlign: text.alignment as any || 'left',
              lineHeight: typeof text.lineHeight === 'string' && !text.lineHeight.match(/^\d/) ? (text.lineHeight === 'tight' ? '1.25' : text.lineHeight === 'relaxed' ? '1.625' : '1.5') : text.lineHeight,
            };

            if (text.role === 'headline') {
              return <h1 key={i} style={textStyle}>{text.content}</h1>;
            } else if (text.role === 'subheadline') {
              return <h2 key={i} style={textStyle}>{text.content}</h2>;
            } else if (text.role === 'body') {
              return <p key={i} style={textStyle}>{text.content}</p>;
            } else {
              return <p key={i} style={textStyle}>{text.content}</p>;
            }
          })}

          {/* ボタン */}
          {buttons.map((btn: any, i: number) => {
            const buttonStyle: React.CSSProperties = {
              backgroundColor: btn.bgColor || '#667eea',
              color: btn.textColor || '#ffffff',
              padding: btn.padding || (btn.size === 'large' ? '16px 48px' : btn.size === 'small' ? '8px 24px' : '12px 36px'),
              borderRadius: typeof btn.borderRadius === 'string' && btn.borderRadius.includes('px') ? btn.borderRadius : (btn.borderRadius === 'rounded-full' ? '9999px' : btn.borderRadius === 'rounded-lg' ? '12px' : '8px'),
              border: 'none',
              fontSize: btn.size === 'large' ? '1.125rem' : '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: btn.shadow ? '0 4px 6px rgba(0,0,0,0.1)' : 'none',
              marginTop: '20px',
              display: 'inline-block',
              transition: btn.transition || 'all 0.3s ease',
            };

            return (
              <button
                key={i}
                style={buttonStyle}
                onMouseEnter={(e) => {
                  if (btn.hoverTransform) {
                    e.currentTarget.style.transform = btn.hoverTransform;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                }}
              >
                {btn.text}
              </button>
            );
          })}

          {/* アイテム（カード・リスト） */}
          {items.length > 0 && type !== 'testimonials' && type !== 'pricing' && type !== 'faq' && (
            <div style={{
              display: layout.display === 'grid' ? 'grid' : 'grid',
              gridTemplateColumns: layout.gridColumns || 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: layout.gap || '24px',
              marginTop: '40px',
            }}>
              {items.map((item: any, i: number) => (
                <div key={i} style={{
                  backgroundColor: item.cardBackground || '#ffffff',
                  padding: item.cardPadding || '24px',
                  borderRadius: item.cardBorderRadius || '12px',
                  boxShadow: item.cardShadow || '0 2px 8px rgba(0,0,0,0.1)',
                }}>
                  {item.icon && <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>{item.icon}</div>}
                  {item.title && <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px', color: '#1a1a2e' }}>{item.title}</h3>}
                  {item.description && <p style={{ color: '#666', lineHeight: '1.6' }}>{item.description}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  };

  // Testimonialsセクションレンダリング
  const renderTestimonialsSection = (sectionKey: string, section: any, index: number, sectionStyle: React.CSSProperties) => {
    const { texts = [], items = [] } = section;

    return (
      <section key={`${sectionKey}-${index}`} style={sectionStyle}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {texts.map((text: any, i: number) => (
            <h2 key={i} style={{
              fontSize: parseFontSize(text.fontSize),
              color: text.color,
              textAlign: text.alignment as any,
              marginBottom: text.marginBottom || '48px',
              fontWeight: 'bold',
            }}>{text.content}</h2>
          ))}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '32px' }}>
            {items.map((item: any, i: number) => (
              <div key={i} style={{
                backgroundColor: '#FFFFFF',
                padding: '32px',
                borderRadius: '16px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                  {item.avatar && (
                    <div style={{
                      width: '50px',
                      height: '50px',
                      borderRadius: '50%',
                      backgroundColor: '#667eea',
                      marginRight: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontWeight: 'bold',
                      fontSize: '20px',
                    }}>
                      {item.name?.charAt(0) || '?'}
                    </div>
                  )}
                  <div>
                    <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#1a1a2e' }}>{item.name}</div>
                    <div style={{ fontSize: '14px', color: '#666' }}>{item.role}</div>
                  </div>
                </div>
                <div style={{ color: '#FFD700', marginBottom: '12px', fontSize: '20px' }}>
                  {'⭐'.repeat(item.rating || 5)}
                </div>
                <p style={{ color: '#444', lineHeight: '1.6', fontStyle: 'italic' }}>
                  "{item.comment}"
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  };

  // Pricingセクションレンダリング
  const renderPricingSection = (sectionKey: string, section: any, index: number, sectionStyle: React.CSSProperties) => {
    const { texts = [], items = [] } = section;

    return (
      <section key={`${sectionKey}-${index}`} style={sectionStyle}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {texts.map((text: any, i: number) => (
            <h2 key={i} style={{
              fontSize: parseFontSize(text.fontSize),
              color: text.color,
              textAlign: text.alignment as any,
              marginBottom: text.marginBottom || '48px',
              fontWeight: 'bold',
            }}>{text.content}</h2>
          ))}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
            {items.map((plan: any, i: number) => (
              <div key={i} style={{
                backgroundColor: plan.highlight ? '#667eea' : '#FFFFFF',
                padding: '40px',
                borderRadius: '16px',
                boxShadow: plan.highlight ? '0 8px 16px rgba(102,126,234,0.3)' : '0 4px 6px rgba(0,0,0,0.1)',
                border: plan.highlight ? '2px solid #764ba2' : '1px solid #e0e0e0',
                transform: plan.highlight ? 'scale(1.05)' : 'scale(1)',
                transition: 'all 0.3s ease',
              }}>
                <h3 style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  marginBottom: '16px',
                  color: plan.highlight ? '#FFFFFF' : '#1a1a2e',
                }}>{plan.name}</h3>
                <div style={{
                  fontSize: '48px',
                  fontWeight: 'bold',
                  marginBottom: '24px',
                  color: plan.highlight ? '#FFFFFF' : '#667eea',
                }}>{plan.price}</div>
                <ul style={{ listStyle: 'none', padding: 0, marginBottom: '32px' }}>
                  {(plan.features || []).map((feature: string, fi: number) => (
                    <li key={fi} style={{
                      padding: '8px 0',
                      color: plan.highlight ? '#FFFFFF' : '#444',
                      borderBottom: '1px solid rgba(0,0,0,0.1)',
                    }}>
                      ✓ {feature}
                    </li>
                  ))}
                </ul>
                <button style={{
                  width: '100%',
                  padding: '16px',
                  backgroundColor: plan.highlight ? '#FFFFFF' : '#667eea',
                  color: plan.highlight ? '#667eea' : '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}>
                  {plan.ctaText || '選択'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  };

  // FAQセクションレンダリング
  const renderFAQSection = (sectionKey: string, section: any, index: number, sectionStyle: React.CSSProperties) => {
    const { texts = [], items = [] } = section;

    return (
      <section key={`${sectionKey}-${index}`} style={sectionStyle}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {texts.map((text: any, i: number) => (
            <h2 key={i} style={{
              fontSize: parseFontSize(text.fontSize),
              color: text.color,
              textAlign: text.alignment as any,
              marginBottom: text.marginBottom || '48px',
              fontWeight: 'bold',
            }}>{text.content}</h2>
          ))}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {items.map((faq: any, i: number) => (
              <details key={i} style={{
                backgroundColor: '#FFFFFF',
                padding: '24px',
                borderRadius: '12px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}>
                <summary style={{
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: '#1a1a2e',
                  cursor: 'pointer',
                  listStyle: 'none',
                }}>
                  <span style={{ marginRight: '12px' }}>Q:</span>
                  {faq.question}
                </summary>
                <p style={{
                  marginTop: '16px',
                  paddingLeft: '24px',
                  color: '#444',
                  lineHeight: '1.6',
                }}>
                  <span style={{ fontWeight: 'bold', marginRight: '8px' }}>A:</span>
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
    );
  };

  // Footerセクションレンダリング
  const renderFooterSection = (sectionKey: string, section: any, index: number, sectionStyle: React.CSSProperties) => {
    const { texts = [], items = [], copyright } = section;

    return (
      <footer key={`${sectionKey}-${index}`} style={sectionStyle}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          {texts.map((text: any, i: number) => (
            <div key={i} style={{
              fontSize: parseFontSize(text.fontSize),
              color: text.color,
              fontWeight: text.fontWeight === 'bold' ? 'bold' : 'normal',
              marginBottom: text.marginBottom || '16px',
            }}>{text.content}</div>
          ))}

          {items.length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginBottom: '24px', flexWrap: 'wrap' }}>
              {items.map((link: any, i: number) => (
                <a key={i} href={link.url} style={{
                  color: '#FFFFFF',
                  textDecoration: 'none',
                  fontSize: '14px',
                  opacity: 0.8,
                }}>
                  {link.text}
                </a>
              ))}
            </div>
          )}

          {copyright && (
            <div style={{ fontSize: '14px', color: '#FFFFFF', opacity: 0.6, marginTop: '24px' }}>
              {copyright}
            </div>
          )}
        </div>
      </footer>
    );
  };

  // フォントサイズをパース
  const parseFontSize = (fontSize: string | undefined): string => {
    if (!fontSize) return '16px';
    if (fontSize.includes('px') || fontSize.includes('rem') || fontSize.includes('em')) {
      return fontSize;
    }
    // Tailwindクラス名の場合
    const sizeMap: Record<string, string> = {
      'text-xs': '0.75rem',
      'text-sm': '0.875rem',
      'text-base': '1rem',
      'text-lg': '1.125rem',
      'text-xl': '1.25rem',
      'text-2xl': '1.5rem',
      'text-3xl': '1.875rem',
      'text-4xl': '2.25rem',
      'text-5xl': '3rem',
      'text-6xl': '3.75rem',
    };
    return sizeMap[fontSize] || fontSize;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                ← ダッシュボード
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">YAMLレンダラー</h1>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => {
                  const sections = parsedData?.sections || {};
                  const htmlContent = Object.entries(sections).map(([key, section]: [string, any]) => {
                    return `<!-- Section: ${key} -->\n${renderSectionToHTML(key, section)}`;
                  }).join('\n\n');

                  const fullHTML = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${parsedData?.meta?.title || 'Landing Page'}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; }
  </style>
</head>
<body>
${htmlContent}
</body>
</html>`;

                  const blob = new Blob([fullHTML], { type: 'text/html' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'landing-page.html';
                  a.click();
                }}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                HTMLダウンロード
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* YAML入力エリア */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">YAMLテンプレート入力</h2>
                <Link
                  href="/advanced-yaml-generator"
                  className="text-sm text-indigo-600 hover:text-indigo-700"
                >
                  🤖 高度YAML生成へ
                </Link>
              </div>

              {/* 編集ガイド */}
              {parsedData && parsedData.design_tokens && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                  <div className="font-semibold text-blue-900 mb-1">✏️ 編集ガイド</div>
                  <div className="text-blue-800 space-y-1">
                    <div>• <code className="bg-blue-100 px-1 rounded">{`{{変数名}}`}</code> 部分を編集してテキストを変更</div>
                    <div>• デザイントークン（色・フォント・スペース）は自動適用されます</div>
                    <div>• 変更は即座にライブプレビューに反映されます</div>
                  </div>
                </div>
              )}

              {/* デザイントークン表示 */}
              {parsedData && parsedData.design_tokens && (
                <details className="mb-4">
                  <summary className="cursor-pointer text-sm font-semibold text-gray-700 hover:text-indigo-600">
                    🎨 デザイントークン (クリックで表示)
                  </summary>
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs font-mono space-y-2">
                    {parsedData.design_tokens.colors && (
                      <div>
                        <div className="font-bold text-gray-700 mb-1">Colors:</div>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(parsedData.design_tokens.colors).slice(0, 6).map(([key, value]: [string, any]) => (
                            <div key={key} className="flex items-center gap-2 bg-white px-2 py-1 rounded border border-gray-200">
                              <div style={{ width: '16px', height: '16px', backgroundColor: value, borderRadius: '4px', border: '1px solid #ccc' }}></div>
                              <span className="text-gray-600">{key}: {value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {parsedData.design_tokens.spacing && (
                      <div>
                        <div className="font-bold text-gray-700 mb-1">Spacing:</div>
                        <div className="text-gray-600">{JSON.stringify(parsedData.design_tokens.spacing).slice(0, 100)}...</div>
                      </div>
                    )}
                    {parsedData.design_tokens.typography && (
                      <div>
                        <div className="font-bold text-gray-700 mb-1">Typography:</div>
                        <div className="text-gray-600">{parsedData.design_tokens.typography['font-primary'] || parsedData.design_tokens.typography.font_primary}</div>
                      </div>
                    )}
                  </div>
                </details>
              )}

              <textarea
                value={yamlText}
                onChange={(e) => {
                  setYamlText(e.target.value);
                  parseYAML(e.target.value);
                }}
                className="w-full h-[calc(100vh-450px)] border border-gray-300 rounded-lg p-4 font-mono text-sm resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="YAMLを貼り付けてプレビュー表示...

# 編集ガイド
# このテンプレートでは以下の項目を編集できます:
#   [features]セクション
#   - テキスト1: &quot;だから学んで終わりにならない...&quot;
#   - テキスト2: &quot;アイデアソンとはアイデアマラソンの造語です。次々...&quot;
#
# 画像からYAMLを生成したい場合は、上の「🤖 高度YAML生成へ」リンクをクリックしてください。"
              />
              {parseError && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  ❌ {parseError}
                </div>
              )}
            </div>
          </div>

          {/* プレビューエリア */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold">ライブプレビュー</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Tailwind CSSスタイルを完全再現
                </p>
              </div>
              <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                {parsedData && parsedData.sections ? (
                  <div className="bg-white">
                    {Object.entries(parsedData.sections).map(([key, section]: [string, any], index) =>
                      renderSection(key, section, index)
                    )}
                  </div>
                ) : (
                  <div className="p-12 text-center text-gray-500">
                    <p className="text-lg mb-2">YAMLを入力するとプレビューが表示されます</p>
                    <p className="text-sm text-gray-400">
                      左側のテキストエリアにYAMLを貼り付けてください
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// セクションをHTMLに変換（ダウンロード用）
function renderSectionToHTML(sectionKey: string, section: any): string {
  if (!section) return '';

  const layout = section.layout || {};
  const background = section.background || {};
  const texts = section.texts || [];
  const buttons = section.buttons || [];
  const items = section.items || [];

  let backgroundStyle = '';
  if (background.type === 'gradient' && background.gradient) {
    const { from, to, direction } = background.gradient;
    const gradientDirection = direction === 'to-bottom' ? 'to bottom' :
                             direction === 'to-right' ? 'to right' : 'to bottom';
    backgroundStyle = `background: linear-gradient(${gradientDirection}, ${from}, ${to});`;
  } else if (background.color) {
    backgroundStyle = `background-color: ${background.color};`;
  }

  let html = `<section style="padding: ${layout.padding || '80px 20px'}; ${backgroundStyle} text-align: ${layout.alignment || 'left'};">
  <div style="max-width: ${layout.maxWidth || layout.max_width || '1200px'}; margin: 0 auto;">`;

  // テキスト
  texts.forEach((text: any) => {
    const fontSize = text.fontSize?.replace('text-', '') || 'base';
    const fontSizeMap: any = {
      '5xl': '3rem', '4xl': '2.25rem', '3xl': '1.875rem', '2xl': '1.5rem',
      'xl': '1.25rem', 'lg': '1.125rem', 'base': '1rem', 'sm': '0.875rem'
    };

    const tag = text.role === 'headline' ? 'h1' : text.role === 'subheadline' ? 'h2' : 'p';
    html += `
    <${tag} style="color: ${text.color || '#000'}; font-size: ${fontSizeMap[fontSize] || '1rem'}; font-weight: ${text.fontWeight === 'bold' ? 700 : text.fontWeight === 'semibold' ? 600 : 400}; text-align: ${text.alignment || 'left'}; margin-bottom: 20px;">
      ${text.content}
    </${tag}>`;
  });

  // ボタン
  buttons.forEach((btn: any) => {
    const borderRadius = btn.borderRadius === 'rounded-full' ? '9999px' :
                        btn.borderRadius === 'rounded-lg' ? '12px' : '8px';
    html += `
    <button style="background-color: ${btn.bgColor}; color: ${btn.textColor}; padding: ${btn.size === 'large' ? '16px 48px' : '12px 36px'}; border-radius: ${borderRadius}; border: none; font-size: 1.125rem; font-weight: 600; cursor: pointer; box-shadow: ${btn.shadow ? '0 4px 6px rgba(0,0,0,0.1)' : 'none'}; margin-top: 20px;">
      ${btn.text}
    </button>`;
  });

  // アイテム
  if (items.length > 0) {
    html += `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; margin-top: 40px;">`;
    items.forEach((item: any) => {
      html += `
      <div style="background: #fff; padding: 24px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        ${item.icon ? `<div style="font-size: 2.5rem; margin-bottom: 12px;">${item.icon}</div>` : ''}
        ${item.title ? `<h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 8px;">${item.title}</h3>` : ''}
        ${item.description ? `<p style="color: #666; line-height: 1.6;">${item.description}</p>` : ''}
      </div>`;
    });
    html += `
    </div>`;
  }

  html += `
  </div>
</section>`;

  return html;
}
