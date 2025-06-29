import { ExtendedChartData } from './types/StockChartTypes';
import { getDefaultTooltipIndices } from './StockChartTooltip';

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
  distance?: number; // ロウソク足からの距離を追加
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
  tooltipMargin: number = 30  // 20 → 30
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

// ロウソク足の中心位置を計算
const getCandleCenter = (
  dataItem: ExtendedChartData,
  dataIndex: number,
  actualChartPositions: number[],
  containerWidth: number,
  chartHeight: number,
  data: ExtendedChartData[]
): { x: number; y: number } => {
  const allValues = data.flatMap(d => [d.high, d.low]);
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const valueRange = maxValue - minValue;
  const padding = valueRange * 0.1;
  const yAxisMin = minValue - padding;
  const yAxisMax = maxValue + padding;
  const yAxisRange = yAxisMax - yAxisMin;
  
  const xPos = actualChartPositions[dataIndex] || (containerWidth / data.length) * (dataIndex + 0.5);
  const centerValue = (dataItem.high + dataItem.low) / 2;
  const yPos = chartHeight * (1 - (centerValue - yAxisMin) / yAxisRange);
  
  return { x: xPos, y: yPos };
};

// 特定のロウソク足から最も近い空白領域を探す
const findClosestTooltipArea = (
  candleCenter: { x: number; y: number },
  emptyCells: GridCell[],
  occupiedAreas: TooltipArea[],
  containerWidth: number,
  chartHeight: number
): TooltipArea | null => {
  const tooltipWidth = 140;
  const tooltipHeight = 60;
  const stepSize = 10; // より細かく探索
  const possibleAreas: TooltipArea[] = [];
  
  // 全ての可能な位置を探索
  for (let x = 0; x <= containerWidth - tooltipWidth; x += stepSize) {
    for (let y = 0; y <= chartHeight - tooltipHeight; y += stepSize) {
      if (canPlaceTooltip(x, y, emptyCells, occupiedAreas, containerWidth, chartHeight, 0.25, 30)) {
        // ツールチップの中心とロウソク足の中心の距離を計算
        const tooltipCenterX = x + tooltipWidth / 2;
        const tooltipCenterY = y + tooltipHeight / 2;
        const distance = Math.sqrt(
          Math.pow(tooltipCenterX - candleCenter.x, 2) + 
          Math.pow(tooltipCenterY - candleCenter.y, 2)
        );
        
        possibleAreas.push({
          x,
          y,
          width: tooltipWidth,
          height: tooltipHeight,
          distance
        });
      }
    }
  }
  
  // 距離でソートして最も近いものを返す
  possibleAreas.sort((a, b) => (a.distance || 0) - (b.distance || 0));
  return possibleAreas.length > 0 ? possibleAreas[0] : null;
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

// メイン関数：各ロウソク足から最も近い空白領域に配置
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
  
  // 変動率と最新記事を考慮してニュースインデックスを取得
  const newsIndices = getDefaultTooltipIndices(data);
  
  // 最新記事を優先するため、インデックスを降順（大きい順）にソート
  // これにより、新しい日付の記事から先に良い位置を確保できる
  const sortedNewsIndices = [...newsIndices].sort((a, b) => b - a);
  
  const limitedNewsIndices = maxNewsTooltips 
    ? sortedNewsIndices.slice(0, maxNewsTooltips)
    : sortedNewsIndices;
  
  const zones: TooltipZone[] = [];
  const occupiedAreas: TooltipArea[] = [];
  
  // Y軸の値計算用
  const allValues = data.flatMap(d => [d.high, d.low]);
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const valueRange = maxValue - minValue;
  const padding = valueRange * 0.1;
  const yAxisMin = minValue - padding;
  const yAxisMax = maxValue + padding;
  const yAxisRange = yAxisMax - yAxisMin;
  
  // 最新記事から順に、各ロウソク足から最も近い空白領域を探して配置
  limitedNewsIndices.forEach((newsIndex) => {
    const dataItem = data[newsIndex];
    const candleCenter = getCandleCenter(
      dataItem,
      newsIndex,
      actualChartPositions,
      containerWidth,
      chartHeight,
      data
    );
    
    // このロウソク足から最も近い空白領域を探す
    const closestArea = findClosestTooltipArea(
      candleCenter,
      emptyCells,
      occupiedAreas,
      containerWidth,
      chartHeight
    );
    
    if (closestArea) {
      // X座標の重複を回避
      const adjustedX = adjustXPositionIfNeeded(closestArea.x, zones, containerWidth);
      
      const centerValue = (dataItem.high + dataItem.low) / 2;
      const candleY = chartHeight * (1 - (centerValue - yAxisMin) / yAxisRange);
      
      zones.push({
        index: newsIndex,
        zone: zones.length,
        xPosition: adjustedX,
        yPosition: closestArea.y,
        isTop: closestArea.y < candleY,
        isNewsTooltip: true
      });
      
      // 占有領域に追加
      occupiedAreas.push({
        x: adjustedX,
        y: closestArea.y,
        width: closestArea.width,
        height: closestArea.height
      });
    }
  });
  
  // 元の順番（日付順）に戻してソート
  zones.sort((a, b) => a.index - b.index);
  
  // zone番号を再割り当て
  zones.forEach((zone, index) => {
    zone.zone = index;
  });
  
  // 残った空白領域を表示する場合
  if (showEmptyAreas) {
    const tooltipWidth = 140;
    const tooltipHeight = 60;
    const stepSize = 15;
    
    for (let x = 0; x <= containerWidth - tooltipWidth; x += stepSize) {
      for (let y = 0; y <= chartHeight - tooltipHeight; y += stepSize) {
        if (canPlaceTooltip(x, y, emptyCells, occupiedAreas, containerWidth, chartHeight, 0.25, 30)) {
          const adjustedX = adjustXPositionIfNeeded(x, zones, containerWidth);
          
          zones.push({
            index: -1,
            zone: zones.length,
            xPosition: adjustedX,
            yPosition: y,
            isTop: y < chartHeight / 2,
            isNewsTooltip: false
          });
          
          occupiedAreas.push({
            x: adjustedX,
            y,
            width: tooltipWidth,
            height: tooltipHeight
          });
        }
      }
    }
  }
  
  return zones;
};

// デバッグ用：配置順序と距離を可視化
export const debugVisualizeLayoutWithDistance = (
  canvas: HTMLCanvasElement,
  emptyCells: GridCell[],
  zones: TooltipZone[],
  data: ExtendedChartData[],
  actualChartPositions: number[],
  containerWidth: number,
  chartHeight: number
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
  
  // ゾーンとロウソク足の接続線を描画
  zones.forEach((zone, index) => {
    if (zone.isNewsTooltip && zone.index >= 0) {
      const candleCenter = getCandleCenter(
        data[zone.index],
        zone.index,
        actualChartPositions,
        containerWidth,
        chartHeight,
        data
      );
      
      // ロウソク足からツールチップへの線を描画
      ctx.strokeStyle = 'rgba(255, 0, 255, 0.5)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(candleCenter.x, candleCenter.y);
      ctx.lineTo(zone.xPosition + 70, zone.yPosition + 30); // ツールチップの中心
      ctx.stroke();
      ctx.setLineDash([]);
    }
    
    // ツールチップ領域を描画
    const opacity = 0.8 - (index * 0.05);
    ctx.fillStyle = zone.isNewsTooltip 
      ? `rgba(255, 0, 0, ${Math.max(0.2, opacity)})` 
      : `rgba(0, 0, 255, ${Math.max(0.2, opacity)})`;
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
};