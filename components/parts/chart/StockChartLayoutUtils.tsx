import { ExtendedChartData } from './types/StockChartTypes';

// 空白セル・ツールチップ配置関連の型定義
export interface TooltipZone {
  index: number;
  zone: number;
  xPosition: number;
  yPosition: number;
  isTop: boolean;
  isNewsTooltip?: boolean;
}

export interface GridCell {
  x: number;
  y: number;
  width: number;
  height: number;
  isEmpty: boolean;
  centerX: number;
  centerY: number;
}

export interface TooltipArea {
  x: number;
  y: number;
  width: number;
  height: number;
  dataIndex?: number;
  priority?: number; // 配置優先度を追加
}

// 動的なマージン計算（緩和版）
const calculateDynamicMargins = (candleWidth: number, chartHeight: number) => {
  return {
    xMargin: Math.max(candleWidth * 0.35, 6),
    yMargin: Math.max(chartHeight * 0.015, 10),
    lineMargin: 3
  };
};

// 空白セル検出（移動平均線は除外）
export const detectEmptyGridCells = (
  data: ExtendedChartData[],
  containerWidth: number,
  chartHeight: number,
  actualChartPositions?: number[],
  gridColumns: number = 20,
  gridRows: number = 15
): GridCell[] => {
  const cellWidth = containerWidth / gridColumns;
  const cellHeight = chartHeight / gridRows;
  const grid: GridCell[] = [];
  const allValues = data.flatMap(d => [d.high, d.low]);
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const valueRange = maxValue - minValue;
  const padding = valueRange * 0.1;
  const yAxisMin = minValue - padding;
  const yAxisMax = maxValue + padding;
  const yAxisRange = yAxisMax - yAxisMin;
  
  // グリッドセルの初期化
  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridColumns; col++) {
      const x = col * cellWidth;
      const y = row * cellHeight;
      grid.push({
        x,
        y,
        width: cellWidth,
        height: cellHeight,
        isEmpty: true,
        centerX: x + cellWidth / 2,
        centerY: y + cellHeight / 2
      });
    }
  }
  
  // 実際のキャンドル幅を計算
  const actualCandleWidth = Math.min(containerWidth / data.length * 0.8, 12);
  const margins = calculateDynamicMargins(actualCandleWidth, chartHeight);
  
  // 各データポイントのロウソク足のみをチェック
  data.forEach((item, index) => {
    const xPos = actualChartPositions?.[index] || (containerWidth / data.length) * (index + 0.5);
    const highY = chartHeight * (1 - (item.high - yAxisMin) / yAxisRange);
    const lowY = chartHeight * (1 - (item.low - yAxisMin) / yAxisRange);
    
    grid.forEach((cell, cellIndex) => {
      if (xPos - margins.xMargin <= cell.x + cell.width && 
          xPos + margins.xMargin >= cell.x &&
          highY - margins.yMargin <= cell.y + cell.height && 
          lowY + margins.yMargin >= cell.y) {
        grid[cellIndex].isEmpty = false;
      }
    });
  });
  
  return grid;
};

// 指定された位置に140×60のtooltip領域を確保できるかチェック
const canPlaceTooltip = (
  x: number,
  y: number,
  emptyCells: GridCell[],
  occupiedAreas: TooltipArea[],
  containerWidth: number,
  chartHeight: number,
  overlapTolerance: number = 0.25,
  tooltipMargin: number = 20
): boolean => {
  const tooltipWidth = 140;
  const tooltipHeight = 60;
  
  // 境界チェック
  if (x < 0 || y < 0 || x + tooltipWidth > containerWidth || y + tooltipHeight > chartHeight) {
    return false;
  }
  
  // 他のtooltipとの重なりチェック
  for (const area of occupiedAreas) {
    if (x < area.x + area.width + tooltipMargin &&
        x + tooltipWidth + tooltipMargin > area.x &&
        y < area.y + area.height + tooltipMargin &&
        y + tooltipHeight + tooltipMargin > area.y) {
      return false;
    }
  }
  
  // tooltip領域内の非空白セルの割合をチェック
  let nonEmptyCellCount = 0;
  let totalCellCount = 0;
  
  for (const cell of emptyCells) {
    if (x < cell.x + cell.width &&
        x + tooltipWidth > cell.x &&
        y < cell.y + cell.height &&
        y + tooltipHeight > cell.y) {
      totalCellCount++;
      if (!cell.isEmpty) {
        nonEmptyCellCount++;
      }
    }
  }
  
  if (totalCellCount > 0) {
    const nonEmptyRatio = nonEmptyCellCount / totalCellCount;
    return nonEmptyRatio <= overlapTolerance;
  }
  
  return true;
};

// 改良版：右上を最優先に配置領域を探索
export const findAllPossibleTooltipAreasRightTopFirst = (
  emptyCells: GridCell[],
  containerWidth: number,
  chartHeight: number
): TooltipArea[] => {
  const tooltipWidth = 140;
  const tooltipHeight = 60;
  const stepSize = 15;
  const possibleAreas: TooltipArea[] = [];
  const occupiedAreas: TooltipArea[] = [];
  
  // 探索開始位置（右上）
  const startX = containerWidth - tooltipWidth;
  const startY = 0;
  
  // 優先順位カウンター
  let priority = 0;
  
  // 右から左へ列ごとに探索
  for (let x = startX; x >= 0; x -= stepSize) {
    // 各列で上から下へ探索
    for (let y = startY; y <= chartHeight - tooltipHeight; y += stepSize) {
      if (canPlaceTooltip(x, y, emptyCells, occupiedAreas, containerWidth, chartHeight, 0.25, 20)) {
        const area: TooltipArea = {
          x,
          y,
          width: tooltipWidth,
          height: tooltipHeight,
          priority: priority++ // 発見順に優先度を付与
        };
        possibleAreas.push(area);
        occupiedAreas.push(area);
      }
    }
  }
  
  // 優先度順にソート（既に右上優先で探索しているため、基本的には発見順）
  return possibleAreas.sort((a, b) => (a.priority || 0) - (b.priority || 0));
};

// ニュースデータの取得と優先順位付け（最新記事を優先）
const getNewsDataIndicesLatestFirst = (data: ExtendedChartData[]): number[] => {
  const indices: number[] = [];
  
  // ニュース記事があるインデックスを収集
  data.forEach((item, index) => {
    if (item.articles && item.articles.length > 0) {
      indices.push(index);
    }
  });
  
  // 最新順にソート（インデックスが大きいほど新しい）
  return indices.sort((a, b) => b - a);
};

// X座標の重複を回避する関数
const adjustXPositionIfNeeded = (
  x: number,
  existingZones: TooltipZone[],
  containerWidth: number,
  tooltipWidth: number = 140,
  xOffset: number = 15
): number => {
  let adjustedX = x;
  const xTolerance = 5; // X座標が同じとみなす許容範囲
  
  // 既存のゾーンのX座標をチェック
  const existingXPositions = existingZones.map(zone => zone.xPosition);
  
  // 同じX座標（許容範囲内）のゾーンがあるかチェック
  while (existingXPositions.some(existingX => Math.abs(existingX - adjustedX) < xTolerance)) {
    // 左にずらす
    adjustedX -= xOffset;
    
    // コンテナの左端を超えないようにする
    if (adjustedX < 0) {
      // 右にずらしてみる
      adjustedX = x + xOffset;
      // 右端を超える場合は元の位置に戻す
      if (adjustedX + tooltipWidth > containerWidth) {
        adjustedX = x;
        break;
      }
    }
  }
  
  return adjustedX;
};

// メイン関数：右上優先で最新記事を配置（X座標重複回避版）
export const calculateTooltipZones = (
  data: ExtendedChartData[],
  actualChartPositions: number[],
  containerWidth: number,
  chartHeight: number,
  showEmptyAreas: boolean = false,
  maxNewsTooltips?: number
): TooltipZone[] => {
  // 空白セルを検出
  const emptyCells = detectEmptyGridCells(
    data,
    containerWidth,
    chartHeight,
    actualChartPositions,
    30,
    20
  );
  
  // 右上優先で可能な配置領域を見つける
  const possibleAreas = findAllPossibleTooltipAreasRightTopFirst(
    emptyCells,
    containerWidth,
    chartHeight
  );
  
  // 最新記事優先でニュースインデックスを取得
  const newsIndices = getNewsDataIndicesLatestFirst(data);
  const limitedNewsIndices = maxNewsTooltips 
    ? newsIndices.slice(0, maxNewsTooltips)
    : newsIndices;
  
  const zones: TooltipZone[] = [];
  
  // Y軸の値計算用
  const allValues = data.flatMap(d => [d.high, d.low]);
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const valueRange = maxValue - minValue;
  const padding = valueRange * 0.1;
  const yAxisMin = minValue - padding;
  const yAxisMax = maxValue + padding;
  const yAxisRange = yAxisMax - yAxisMin;
  
  // 最新記事から順に、右上優先で配置
  limitedNewsIndices.forEach((newsIndex, i) => {
    if (i >= possibleAreas.length) return;
    
    const area = possibleAreas[i];
    const dataItem = data[newsIndex];
    const centerValue = (dataItem.high + dataItem.low) / 2;
    const candleY = chartHeight * (1 - (centerValue - yAxisMin) / yAxisRange);
    
    // X座標の重複を回避
    const adjustedX = adjustXPositionIfNeeded(area.x, zones, containerWidth);
    
    zones.push({
      index: newsIndex,
      zone: zones.length,
      xPosition: adjustedX,
      yPosition: area.y,
      isTop: area.y < candleY,
      isNewsTooltip: true
    });
  });
  
  // 残った空白領域を表示する場合
  if (showEmptyAreas) {
    const usedAreaCount = zones.length;
    for (let i = usedAreaCount; i < possibleAreas.length; i++) {
      const area = possibleAreas[i];
      
      // 空白領域でもX座標の重複を回避
      const adjustedX = adjustXPositionIfNeeded(area.x, zones, containerWidth);
      
      zones.push({
        index: -1,
        zone: zones.length,
        xPosition: adjustedX,
        yPosition: area.y,
        isTop: area.y < chartHeight / 2,
        isNewsTooltip: false
      });
    }
  }
  
  return zones;
};

// デバッグ用：配置順序を可視化（X座標調整を反映）
export const debugVisualizeLayoutWithPriority = (
  canvas: HTMLCanvasElement,
  emptyCells: GridCell[],
  tooltipAreas: TooltipArea[],
  actualZones?: TooltipZone[]
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  // グリッドセルを描画
  emptyCells.forEach(cell => {
    ctx.fillStyle = cell.isEmpty ? 'rgba(0, 255, 0, 0.1)' : 'rgba(255, 0, 0, 0.1)';
    ctx.fillRect(cell.x, cell.y, cell.width, cell.height);
    ctx.strokeStyle = cell.isEmpty ? 'rgba(0, 255, 0, 0.3)' : 'rgba(255, 0, 0, 0.3)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(cell.x, cell.y, cell.width, cell.height);
  });
  
  // 実際のゾーン配置を描画（X座標調整後）
  if (actualZones) {
    actualZones.forEach((zone, index) => {
      const opacity = 0.8 - (index * 0.05);
      ctx.fillStyle = `rgba(0, 0, 255, ${Math.max(0.2, opacity)})`;
      ctx.fillRect(zone.xPosition, zone.yPosition, 140, 60);
      ctx.strokeStyle = zone.isNewsTooltip ? 'rgba(255, 0, 0, 0.8)' : 'rgba(0, 0, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(zone.xPosition, zone.yPosition, 140, 60);
      
      // 優先度番号を表示
      ctx.fillStyle = 'white';
      ctx.fillRect(zone.xPosition + 2, zone.yPosition + 2, 30, 20);
      ctx.fillStyle = zone.isNewsTooltip ? 'red' : 'blue';
      ctx.font = 'bold 14px Arial';
      ctx.fillText(`${index + 1}`, zone.xPosition + 8, zone.yPosition + 16);
    });
  } else {
    // tooltip領域を優先度順に色分けして描画
    tooltipAreas.forEach((area, index) => {
      const opacity = 0.8 - (index * 0.05);
      ctx.fillStyle = `rgba(0, 0, 255, ${Math.max(0.2, opacity)})`;
      ctx.fillRect(area.x, area.y, area.width, area.height);
      ctx.strokeStyle = 'rgba(0, 0, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(area.x, area.y, area.width, area.height);
      
      // 優先度番号を表示
      ctx.fillStyle = 'white';
      ctx.fillRect(area.x + 2, area.y + 2, 30, 20);
      ctx.fillStyle = 'blue';
      ctx.font = 'bold 14px Arial';
      ctx.fillText(`${index + 1}`, area.x + 8, area.y + 16);
    });
  }
};