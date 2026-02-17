'use client';

import React from 'react';
import Image from 'next/image';
import { ChartTheme } from './StockChartTheme';

type DomToImageApi = {
  toSvg: (node: Node, options?: unknown) => Promise<string>;
  toPng: (node: Node, options?: unknown) => Promise<string>;
};

let domToImagePromise: Promise<DomToImageApi> | null = null;

const loadDomToImage = (): Promise<DomToImageApi> => {
  if (!domToImagePromise) {
    domToImagePromise = import('dom-to-image').then((module) => {
      return (module.default ?? module) as unknown as DomToImageApi;
    });
  }

  return domToImagePromise;
};

interface CompanyInfo {
  companyName: string;
  changePrice: number;
  changePercent: number;
  currentPrice: number;
}

interface StockChartImageProps {
  chartContainerRef: React.RefObject<HTMLDivElement | null>;
  colors: {
    background: string;
    gridColor: string;
    [key: string]: string;
  };
  pcHeight: {
    upper: number;
    lower: number;
  };
  tabletHeight: {
    upper: number;
    lower: number;
  };
  mobileHeight: {
    upper: number;
    lower: number;
  };
  company_name: boolean;
  companyInfo: CompanyInfo | null;
  code: string;
  theme: ChartTheme;
  imageUrl: string;
}

// チャートを画像として出力する関数（高画質版・白色鮮明化対応）
export const exportAsImage = async (
  chartContainerRef: React.RefObject<HTMLDivElement | null>,
  colors: { background: string; gridColor: string },
  pcHeight: { upper: number; lower: number },
  tabletHeight: { upper: number; lower: number },
  mobileHeight: { upper: number; lower: number },
  company_name: boolean,
  companyInfo: CompanyInfo | null
): Promise<string> => {
  if (!chartContainerRef.current) {
    throw new Error('Chart container not found');
  }

  try {
    const container = chartContainerRef.current;
    const domtoimage = await loadDomToImage();

    // フォントの読み込みを待つ
    if (typeof document !== 'undefined') {
      await document.fonts.ready;
    }

    // レンダリングの完了を待つ
    if (typeof requestAnimationFrame !== 'undefined') {
      await new Promise(resolve => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setTimeout(resolve, 500);
          });
        });
      });
    }

    // 上段と下段のチャートの高さを計算（ヘッダーの高さを増加）
    const w = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const upperHeight = w >= 1024 ? pcHeight.upper : w >= 640 ? tabletHeight.upper : mobileHeight.upper;
    const lowerHeight = w >= 1024 ? pcHeight.lower : w >= 640 ? tabletHeight.lower : mobileHeight.lower;
    const headerHeight = company_name && companyInfo ? 80 : 0; // 高さを増加（60→80）
    const totalHeight = upperHeight + lowerHeight + headerHeight + 8;

    // 高画質化のための前処理
    const originalTransform = container.style.transform;
    container.style.transform = 'scale(1)';
    container.style.transformOrigin = 'top left';

    // 背景色を確実に不透明にする
    const solidBackgroundColor = colors.background.startsWith('#')
      ? colors.background
      : colors.background === 'transparent'
        ? '#000000'
        : colors.background;

    // SVGとして一度出力してから高解像度PNGに変換（最高画質・白色鮮明化）
    try {
      // まずSVGとして出力
      const svgOptions = {
        bgcolor: solidBackgroundColor,
        height: totalHeight,
        width: container.offsetWidth,
        style: {
          'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          'font-rendering': 'optimizeLegibility',
          '-webkit-font-smoothing': 'antialiased',
          '-moz-osx-font-smoothing': 'grayscale',
          'text-rendering': 'geometricPrecision',
          'shape-rendering': 'geometricPrecision',
          'transform': 'none',
          'will-change': 'auto',
          'opacity': '1', // 透過を無効化
          'background-color': solidBackgroundColor, // 背景色を確実に設定
          'mix-blend-mode': 'normal' // 混合モードをノーマルに
        },
        filter: (node: Node) => {
          if (node.nodeType === Node.TEXT_NODE) return true;
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            if (element.tagName === 'SCRIPT' || element.tagName === 'STYLE') return false;
            const computedStyle = window.getComputedStyle(element);
            if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') return false;
          }
          return true;
        },
        cacheBust: true
      };

      const svgDataUrl = await domtoimage.toSvg(container, svgOptions);

      // SVGをCanvasに描画して高解像度PNGに変換
      const img = new window.Image();
      const scale = 8;

      return new Promise<string>((resolve, reject) => {
        img.onload = () => {
          const canvas = document.createElement('canvas');
          // アルファチャンネルを無効化して透過を防ぐ
          const ctx = canvas.getContext('2d', {
            alpha: false, // 透過を完全に無効化
            desynchronized: false,
            willReadFrequently: false,
            colorSpace: 'srgb' // 色空間を明示的に指定
          });

          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }

          canvas.width = container.offsetWidth * scale;
          canvas.height = totalHeight * scale;

          // アンチエイリアシングを有効化
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // 背景色を確実に塗りつぶし（透過防止）
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = solidBackgroundColor;
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // 混合モードを通常に設定
          ctx.globalCompositeOperation = 'source-over';

          // スケーリングして描画
          ctx.scale(scale, scale);
          ctx.drawImage(img, 0, 0);

          // 最高品質でPNGに変換（透過なし）
          const pngDataUrl = canvas.toDataURL('image/png', 1.0);
          resolve(pngDataUrl);
        };

        img.onerror = () => {
          reject(new Error('Failed to load SVG image'));
        };

        img.src = svgDataUrl;
      });

    } catch (svgError) {
      console.warn('SVG conversion failed, falling back to direct PNG:', svgError);

      // SVG変換が失敗した場合は、直接PNG出力（高解像度設定・白色鮮明化）
      const pngOptions = {
        bgcolor: solidBackgroundColor,
        height: totalHeight,
        width: container.offsetWidth,
        style: {
          'font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          'font-rendering': 'optimizeLegibility',
          '-webkit-font-smoothing': 'antialiased',
          '-moz-osx-font-smoothing': 'grayscale',
          'text-rendering': 'geometricPrecision',
          'transform': 'none',
          'transform-origin': 'top left',
          'line-height': 'normal',
          'opacity': '1', // 透過を無効化
          'background-color': solidBackgroundColor,
          'mix-blend-mode': 'normal'
        },
        quality: 1,
        scale: 16,
        cacheBust: true,
        filter: (node: Node) => {
          if (node.nodeType === Node.TEXT_NODE) return true;
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            if (element.tagName === 'SCRIPT' || element.tagName === 'STYLE') return false;
            const computedStyle = window.getComputedStyle(element);
            if (computedStyle.display === 'none') return false;
          }
          return true;
        }
      };

      const dataUrl = await domtoimage.toPng(container, pngOptions);

      // 元のスタイルを復元
      container.style.transform = originalTransform;

      return dataUrl;
    }

  } catch (error) {
    console.error('Error exporting chart as image with dom-to-image:', error);

    // フォールバック: html2canvasを使用（白色鮮明化対応）
    try {
      const html2canvas = (await import('html2canvas')).default;

      const canvas = await html2canvas(chartContainerRef.current, {
        backgroundColor: colors.background === 'transparent' ? '#000000' : colors.background,
        scale: 8,
        logging: false,
        useCORS: true,
        allowTaint: false,
        imageTimeout: 0,
        windowWidth: chartContainerRef.current.scrollWidth,
        windowHeight: chartContainerRef.current.scrollHeight,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
        // foreignObjectRenderingを無効化して透過問題を回避
        foreignObjectRendering: false,
        // テキストレンダリングの最適化
        onclone: (clonedDoc) => {
          // 全体のスタイルを最適化
          const style = clonedDoc.createElement('style');
          style.textContent = `
            * {
              -webkit-font-smoothing: antialiased !important;
              -moz-osx-font-smoothing: grayscale !important;
              text-rendering: geometricPrecision !important;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
              opacity: 1 !important;
              background-color: ${colors.background} !important;
              mix-blend-mode: normal !important;
            }
            text {
              paint-order: stroke fill !important;
              opacity: 1 !important;
            }
            svg {
              background-color: ${colors.background} !important;
            }
            /* 白色要素を確実に不透明にする */
            [fill="white"], [fill="#ffffff"], [fill="#FFFFFF"] {
              opacity: 1 !important;
            }
            /* テキスト要素の透過を防ぐ */
            text, tspan, .recharts-text {
              opacity: 1 !important;
              fill-opacity: 1 !important;
            }
          `;
          clonedDoc.head.appendChild(style);

          // 背景を確実に設定
          clonedDoc.body.style.backgroundColor = colors.background;
          clonedDoc.documentElement.style.backgroundColor = colors.background;

          const container = clonedDoc.body.querySelector('[class*="mt-2"]');
          if (container) {
            const htmlContainer = container as HTMLElement;
            htmlContainer.style.backgroundColor = colors.background;
            htmlContainer.style.opacity = '1';

            const textElements = container.querySelectorAll('*');
            textElements.forEach((el) => {
              const htmlEl = el as HTMLElement;
              if (htmlEl.style) {
                htmlEl.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
                htmlEl.style.lineHeight = 'normal';
                htmlEl.style.setProperty('-webkit-font-smoothing', 'antialiased');
                htmlEl.style.setProperty('-moz-osx-font-smoothing', 'grayscale');
                htmlEl.style.textRendering = 'geometricPrecision';
                htmlEl.style.opacity = '1'; // 透過を無効化
                htmlEl.style.mixBlendMode = 'normal'; // 混合モードをノーマル

                // 白色要素の透過を防ぐ
                const fill = htmlEl.getAttribute('fill');
                if (fill === 'white' || fill === '#ffffff' || fill === '#FFFFFF') {
                  htmlEl.style.fillOpacity = '1';
                  htmlEl.style.opacity = '1';
                }

                if (htmlEl.textContent && htmlEl.textContent.trim()) {
                  htmlEl.style.transform = 'translateZ(0)';
                  htmlEl.style.backfaceVisibility = 'hidden';
                }
              }
            });
          }
        }
      });

      // Canvas の画質を最大化し、透過を無効化
      const ctx = canvas.getContext('2d', { alpha: false });
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.globalCompositeOperation = 'source-over';
      }

      // 透過なしでPNGとして出力
      return canvas.toDataURL('image/png', 1.0);
    } catch (fallbackError) {
      console.error('Fallback with html2canvas also failed:', fallbackError);
      throw new Error('Failed to export chart as image');
    }
  }
};

// 価格変化に基づく色と矢印を取得する関数
const getPriceChangeStyle = (changePrice: number, theme: ChartTheme) => {
  const isPositive = changePrice >= 0;

  // テーマに応じた色の設定（blackテーマがダークテーマ）
  const colors = {
    positive: theme === 'black' ? '#22c55e' : '#16a34a', // 緑色（上昇）
    negative: theme === 'black' ? '#ef4444' : '#dc2626', // 赤色（下降）
  };

  return {
    color: isPositive ? colors.positive : colors.negative,
    arrow: isPositive ? '↑' : '↓'
  };
};

// 数値をフォーマットする関数
const formatPrice = (price: number) => {
  return new Intl.NumberFormat('ja-JP', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  }).format(price);
};

// 画像表示用コンポーネント
export const StockChartImage: React.FC<StockChartImageProps> = ({
  colors,
  code,
  company_name,
  companyInfo,
  theme,
  imageUrl
}) => {
  // 価格変化のスタイルを取得
  const priceChangeStyle = companyInfo ? getPriceChangeStyle(companyInfo.changePrice, theme) : null;

  // テキストの色を決定（テーマに応じて）
  const textColor = theme === 'black' ? '#ffffff' : '#000000';

  return (
    <div className="mt-2" style={{ width: '100%', backgroundColor: colors.background, opacity: 1 }}>
      {/* 会社情報ヘッダー（改修版） */}
      {company_name && companyInfo && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: colors.background,
            borderBottom: `1px solid ${colors.gridColor}`,
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
          }}
        >
          {/* 会社名 */}
          <div
            style={{
              fontSize: '18px',
              fontWeight: '600',
              color: textColor,
              marginBottom: '8px', // 改行のためのマージン
              lineHeight: '1.2'
            }}
          >
            {companyInfo.companyName} ({code})
          </div>

          {/* 現在値と矢印 */}
          {priceChangeStyle && (
            <div
              style={{
                fontSize: '16px',
                fontWeight: '500',
                color: priceChangeStyle.color,
                lineHeight: '1.2',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>¥{formatPrice(companyInfo.currentPrice)}</span>
              <span style={{ fontSize: '14px' }}>{priceChangeStyle.arrow}</span>
            </div>
          )}
        </div>
      )}

      {/* チャート画像 */}
      <div style={{ position: 'relative', width: '100%', backgroundColor: colors.background }}>
        <Image
          src={imageUrl}
          alt={`Stock chart for ${code}`}
          className="w-full"
          width={3200}
          height={2400}
          style={{
            imageRendering: 'auto',
            WebkitFontSmoothing: 'antialiased',
            display: 'block',
            lineHeight: 0,
            transform: 'translateZ(0)',
            backfaceVisibility: 'hidden',
            opacity: 1, // 透過を無効化
            mixBlendMode: 'normal' // 混合モードをノーマル
          }}
          priority
          quality={100}
          unoptimized
        />
      </div>
    </div>
  );
};
