import { ExtendedChartData } from './types/StockChartTypes';

// 空白セル・ツールチップ配置関連の型定義
export interface TooltipZone {
  index: number;
  zone: number;
  xPosition: number;
  yPosition: number;
  isTop: boolean;
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

// 動的なマージン計算
const calculateDynamicMargins = (candleWidth: number, chartHeight: number) => {
  return {
    xMargin: Math.max(candleWidth + 20, 30), // キャンドル幅 + 余白、最小30px
    yMargin: Math.max(chartHeight * 0.04, 25), // チャート高さの4%、最小25px
    lineMargin: 20 // 移動平均線用のマージン
  };
};

// 空白セル検出（修正版）
export const detectEmptyGridCells = (
  data: ExtendedChartData[],
  containerWidth: number,
  chartHeight: number,
  actualChartPositions?: number[], // 実際の描画位置を追加
  gridColumns: number = 12,
  gridRows: number = 8
): GridCell[] => {
  const cellWidth = containerWidth / gridColumns;
  const cellHeight = chartHeight / gridRows;
  const grid: GridCell[] = [];
  const allValues = data.flatMap(d => [d.high, d.low, d.ma5, d.ma25, d.ma75].filter(v => !isNaN(v)));
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
  
  // 実際のキャンドル幅を計算（データ点数に基づく）
  const actualCandleWidth = Math.min(containerWidth / data.length * 0.8, 12);
  const margins = calculateDynamicMargins(actualCandleWidth, chartHeight);
  
  // 各データポイントに対して占有領域を設定
  data.forEach((item, index) => {
    // 実際の描画位置を使用（提供されていない場合は計算）
    const xPos = actualChartPositions?.[index] || (containerWidth / data.length) * (index + 0.5);
    
    const highY = chartHeight * (1 - (item.high - yAxisMin) / yAxisRange);
    const lowY = chartHeight * (1 - (item.low - yAxisMin) / yAxisRange);
    const ma5Y = !isNaN(item.ma5) ? chartHeight * (1 - (item.ma5 - yAxisMin) / yAxisRange) : null;
    const ma25Y = !isNaN(item.ma25) ? chartHeight * (1 - (item.ma25 - yAxisMin) / yAxisRange) : null;
    const ma75Y = !isNaN(item.ma75) ? chartHeight * (1 - (item.ma75 - yAxisMin) / yAxisRange) : null;
    
    grid.forEach((cell, cellIndex) => {
      // X軸方向の判定（実際のキャンドル幅 + マージン）
      if (xPos - margins.xMargin <= cell.x + cell.width && xPos + margins.xMargin >= cell.x) {
        // Y軸方向の判定（高値から安値の範囲 + マージン）
        if (highY - margins.yMargin <= cell.y + cell.height && lowY + margins.yMargin >= cell.y) {
          grid[cellIndex].isEmpty = false;
        }
        
        // 移動平均線の判定
        [ma5Y, ma25Y, ma75Y].forEach(maY => {
          if (maY !== null && maY - margins.lineMargin <= cell.y + cell.height && maY + margins.lineMargin >= cell.y) {
            grid[cellIndex].isEmpty = false;
          }
        });
      }
    });
  });
  
  return grid.filter(cell => cell.isEmpty);
};

// 右から順に最適な空白セルを見つける（修正版）
export const findOptimalEmptyCellFromRight = (
  targetX: number,
  targetY: number,
  emptyCells: GridCell[],
  occupiedPositions: { x: number, y: number, width: number, height: number }[],
  minDistanceFromCandle: number = 50
): GridCell | null => {
  if (emptyCells.length === 0) return null;
  
  const tooltipWidth = 140;
  const tooltipHeight = 60;
  const minDistanceFromOthers = 20; // 他のツールチップとの最小距離
  
  // 右から順にソート
  const sortedCells = [...emptyCells].sort((a, b) => b.centerX - a.centerX);
  
  // 利用可能なセルをフィルタリング
  const availableCells = sortedCells.filter(cell => {
    // キャンドルスティックからの距離チェック
    const distanceFromTarget = Math.sqrt(
      Math.pow(cell.centerX - targetX, 2) + Math.pow(cell.centerY - targetY, 2)
    );
    if (distanceFromTarget < minDistanceFromCandle) {
      return false;
    }
    
    // 他のツールチップとの重なりチェック
    return !occupiedPositions.some(pos => {
      const xOverlap = Math.abs(cell.centerX - pos.x) < (tooltipWidth + pos.width) / 2 + minDistanceFromOthers;
      const yOverlap = Math.abs(cell.centerY - pos.y) < (tooltipHeight + pos.height) / 2 + minDistanceFromOthers;
      return xOverlap && yOverlap;
    });
  });
  
  // 右から順に、Y座標が近いものを優先
  if (availableCells.length > 0) {
    return availableCells.reduce((best, cell) => {
      const cellYDistance = Math.abs(cell.centerY - targetY);
      const bestYDistance = Math.abs(best.centerY - targetY);
      
      // 同じX座標帯でY距離が近いものを選択
      if (Math.abs(cell.centerX - best.centerX) < 50) {
        return cellYDistance < bestYDistance ? cell : best;
      }
      // より右にあるものを優先
      return cell.centerX > best.centerX ? cell : best;
    });
  }
  
  // 利用可能なセルがない場合は、距離制約を緩和して再度検索
  const relaxedCells = sortedCells.filter(cell => {
    const distanceFromTarget = Math.sqrt(
      Math.pow(cell.centerX - targetX, 2) + Math.pow(cell.centerY - targetY, 2)
    );
    return distanceFromTarget >= minDistanceFromCandle * 0.6;
  });
  
  if (relaxedCells.length > 0) {
    return relaxedCells[0];
  }
  
  // それでも見つからない場合は、最も右のセルを返す
  return sortedCells[0];
};

// ツールチップ配置計算（修正版）
export const calculateTooltipZones = (
  tooltipIndices: number[],
  actualChartPositions: number[],
  containerWidth: number,
  data: ExtendedChartData[],
  chartHeight: number,
  minDistanceFromCandle: number = 60 // デフォルト距離を少し増やす
): TooltipZone[] => {
  // グリッドの解像度を上げてより細かい配置を可能に
  const emptyCells = detectEmptyGridCells(
    data, 
    containerWidth, 
    chartHeight, 
    actualChartPositions, // 実際の描画位置を渡す
    20, // グリッド列数
    12  // グリッド行数
  );
  
  const allValues = data.flatMap(d => [d.high, d.low]);
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const valueRange = maxValue - minValue;
  const padding = valueRange * 0.1;
  const yAxisMin = minValue - padding;
  const yAxisMax = maxValue + padding;
  const yAxisRange = yAxisMax - yAxisMin;
  
  const zones: TooltipZone[] = [];
  const occupiedPositions: { x: number, y: number, width: number, height: number }[] = [];
  
  // スマホサイズ（768px未満）の場合は2つまで、それ以外は4つまで表示
  const maxTooltips = window.innerWidth < 768 ? 2 : 4;
  
  // インデックスを日付順（新しい順）で処理
  const sortedTooltipData = tooltipIndices.slice(0, maxTooltips).map((index) => ({
    index,
    xPos: actualChartPositions[index] || ((containerWidth / data.length) * (index + 0.5))
  })).sort((a, b) => b.index - a.index);
  
  // 最大X位置の制約を設定
  let maxAllowedX = containerWidth - 70;
  
  sortedTooltipData.forEach(({ index, xPos }, sortedIndex) => {
    const dataItem = data[index];
    const centerValue = (dataItem.high + dataItem.low) / 2;
    const centerY = chartHeight * (1 - (centerValue - yAxisMin) / yAxisRange);
    
    // 利用可能な空白セルを右側の制約内でフィルタリング
    const constrainedEmptyCells = emptyCells.filter(cell => cell.centerX <= maxAllowedX);
    
    const optimalCell = findOptimalEmptyCellFromRight(
      xPos, 
      centerY, 
      constrainedEmptyCells, 
      occupiedPositions, 
      minDistanceFromCandle
    );
    
    if (optimalCell) {
      let tooltipX = Math.min(optimalCell.centerX - 70, maxAllowedX - 70);
      const tooltipY = optimalCell.centerY - 30;
      
      // x軸の重なりチェック
      const minXDistance = 50; // 十分な間隔を確保
      const overlappingTooltip = zones.find(z => 
        Math.abs(z.xPosition - (tooltipX + 70)) < minXDistance
      );
      
      if (overlappingTooltip && sortedIndex === 1) {
        tooltipX = overlappingTooltip.xPosition - 70 - minXDistance - 70;
        tooltipX = Math.max(10, tooltipX);
      }
      
      zones.push({
        index,
        zone: sortedIndex,
        xPosition: tooltipX + 70,
        yPosition: tooltipY,
        isTop: optimalCell.centerY < centerY
      });
      
      occupiedPositions.push({
        x: tooltipX + 70,
        y: optimalCell.centerY,
        width: 140,
        height: 60
      });
      
      // 次のツールチップの最大X位置を更新
      maxAllowedX = Math.min(maxAllowedX, tooltipX + 70 - minXDistance);
    } else {
      // フォールバック：安全な位置に配置
      const safeOffset = 80; // 十分な距離を確保
      
      let xPosition = Math.min(
        Math.min(xPos + safeOffset, maxAllowedX),
        containerWidth - 70
      );
      
      const minXDistance = 50;
      zones.forEach(existingZone => {
        if (Math.abs(existingZone.xPosition - xPosition) < minXDistance) {
          xPosition = existingZone.xPosition - minXDistance - 70;
        }
      });
      
      xPosition = Math.max(70, xPosition);
      
      const isTop = centerY > chartHeight / 2;
      const yPosition = isTop ? centerY - 100 : centerY + 40;
      
      zones.push({
        index,
        zone: sortedIndex,
        xPosition,
        yPosition: Math.max(10, Math.min(chartHeight - 70, yPosition)),
        isTop
      });
      
      occupiedPositions.push({
        x: xPosition,
        y: yPosition + 30,
        width: 140,
        height: 60
      });
      
      maxAllowedX = Math.min(maxAllowedX, xPosition - minXDistance);
    }
  });
  
  // zonesを元の順序で返す
  return zones.sort((a, b) => a.index - b.index);
};

// デバッグ用：グリッドセルの可視化（開発時のみ使用）
export const debugVisualizeCells = (cells: GridCell[], canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  cells.forEach(cell => {
    ctx.fillStyle = cell.isEmpty ? 'rgba(0, 255, 0, 0.2)' : 'rgba(255, 0, 0, 0.2)';
    ctx.fillRect(cell.x, cell.y, cell.width, cell.height);
    ctx.strokeStyle = cell.isEmpty ? 'green' : 'red';
    ctx.strokeRect(cell.x, cell.y, cell.width, cell.height);
  });
};