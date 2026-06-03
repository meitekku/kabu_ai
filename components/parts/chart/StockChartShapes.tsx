import React from 'react';
import { RectangleProps } from 'recharts';
import { NewsArticle } from './types/StockChartTypes';

/* --------------------------------------------------
 * 型定義
 * -------------------------------------------------- */
interface CandleBodyProps extends RectangleProps {
  payload?: {
    index: number;
    articles?: NewsArticle[];
  };
}

/* --------------------------------------------------
 * ヒゲ（高値安値）描画用カスタムシェイプ
 * -------------------------------------------------- */
export const CandleWickShape: React.FC<RectangleProps> = (props) => {
  const { x, y, width, height, stroke, strokeWidth } = props;

  if (x == null || y == null || width == null || height == null) {
    return null;
  }

  const candleWidth = Math.min(width * 1.2, 8);
  const offset = width / 2;
  const adjustedX = x - offset;
  const cx = adjustedX + (candleWidth * 1.3);
  const top = height < 0 ? y + height : y;
  const bottom = height < 0 ? y : y + height;

  return (
    <line
      x1={cx}
      y1={top}
      x2={cx}
      y2={bottom}
      stroke={stroke}
      strokeWidth={strokeWidth ?? 1}
    />
  );
};

/* --------------------------------------------------
 * 実体（始値終値）描画用カスタムシェイプ
 * -------------------------------------------------- */
export const CandleBodyShape: React.FC<CandleBodyProps> = (props) => {
  const { x, y, width, height, fill, stroke } = props;

  if (x == null || y == null || width == null || height == null) {
    return null;
  }

  const candleWidth = Math.min(width * 1.2, 8);
  const offset = width / 2;
  const adjustedX = x - offset;
  const top = height < 0 ? y + height : y;
  const bodyHeight = Math.abs(height);

  return (
    <rect
      x={adjustedX}
      y={top}
      width={candleWidth}
      height={bodyHeight}
      fill={fill}
      stroke={stroke}
    />
  );
};

/* --------------------------------------------------
 * 出来高バー描画用カスタムシェイプ
 * -------------------------------------------------- */
export const VolumeBarShape: React.FC<RectangleProps> = (props) => {
  const { x, y, width, height, fill, stroke } = props;

  if (x == null || y == null || width == null || height == null) {
    return null;
  }

  const barWidth = Math.min(width * 1.2, 8);
  const offset = width / 2;
  const adjustedX = x - offset;

  return (
    <rect
      x={adjustedX}
      y={y}
      width={barWidth}
      height={height}
      fill={fill}
      stroke={stroke}
    />
  );
}; 