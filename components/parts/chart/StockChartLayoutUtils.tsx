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

export interface TooltipArea {
  x: number;
  y: number;
  width: number;
  height: number;
  dataIndex?: number;
}

// 動的なマージン計算（緩和版）
const calculateDynamicMargins = (candleWidth: number, chartHeight: number) => {
  return {
    xMargin: Math.max(candleWidth * 0.35, 6), // キャンドル幅の35%、最小6px（以前は50%、最小10px）
    yMargin: Math.max(chartHeight * 0.015, 10), // チャート高さの1.5%、最小10px（以前は2%、最小15px）
    lineMargin: 3 // 移動平均線用のマージン（5から3に削減）
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
  
  // 各データポイントのロウソク足のみをチェック（移動平均線は無視）
  data.forEach((item, index) => {
    const xPos = actualChartPositions?.[index] || (containerWidth / data.length) * (index + 0.5);
    const highY = chartHeight * (1 - (item.high - yAxisMin) / yAxisRange);
    const lowY = chartHeight * (1 - (item.low - yAxisMin) / yAxisRange);
    
    grid.forEach((cell, cellIndex) => {
      // ロウソク足の範囲内かチェック
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

// 指定された位置に140×60のtooltip領域を確保できるかチェック（緩和版）
const canPlaceTooltip = (
  x: number,
  y: number,
  emptyCells: GridCell[],
  occupiedAreas: TooltipArea[],
  containerWidth: number,
  chartHeight: number,
  overlapTolerance: number = 0.25 // 25%の重なりまで許容
): boolean => {
  const tooltipWidth = 140;
  const tooltipHeight = 60;
  
  // 境界チェック
  if (x < 0 || y < 0 || x + tooltipWidth > containerWidth || y + tooltipHeight > chartHeight) {
    return false;
  }
  
  // 他のtooltipとの重なりチェック（これは厳密にチェック）
  for (const area of occupiedAreas) {
    if (x < area.x + area.width &&
        x + tooltipWidth > area.x &&
        y < area.y + area.height &&
        y + tooltipHeight > area.y) {
      return false;
    }
  }
  
  // tooltip領域内の非空白セルの割合をチェック（部分的な重なりを許容）
  let nonEmptyCellCount = 0;
  let totalCellCount = 0;
  
  for (const cell of emptyCells) {
    // セルとtooltip領域が重なるかチェック
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
  
  // 重なっているセルのうち、非空白セルの割合が許容範囲内かチェック
  if (totalCellCount > 0) {
    const nonEmptyRatio = nonEmptyCellCount / totalCellCount;
    return nonEmptyRatio <= overlapTolerance;
  }
  
  return true;
};

// 全ての可能なtooltip配置領域を見つける
export const findAllPossibleTooltipAreas = (
  emptyCells: GridCell[],
  containerWidth: number,
  chartHeight: number
): TooltipArea[] => {
  const tooltipWidth = 140;
  const tooltipHeight = 60;
  const stepSize = 15; // 検索ステップサイズを20から15に削減
  const possibleAreas: TooltipArea[] = [];
  const occupiedAreas: TooltipArea[] = [];
  
  // グリッド全体を走査して配置可能な場所を探す（右から左へ）
  for (let y = 0; y < chartHeight - tooltipHeight; y += stepSize) {
    // 右から左へ探索（右詰め）
    for (let x = containerWidth - tooltipWidth; x >= 0; x -= stepSize) {
      if (canPlaceTooltip(x, y, emptyCells, occupiedAreas, containerWidth, chartHeight, 0.25)) {
        const area: TooltipArea = {
          x,
          y,
          width: tooltipWidth,
          height: tooltipHeight
        };
        possibleAreas.push(area);
        occupiedAreas.push(area);
      }
    }
  }
  
  return possibleAreas;
};

// tooltip配置計算（テスト版：全ての可能な領域に配置）
export const calculateTooltipZonesTest = (
  data: ExtendedChartData[],
  actualChartPositions: number[],
  containerWidth: number,
  chartHeight: number
): TooltipZone[] => {
  // 空白セルを検出
  const emptyCells = detectEmptyGridCells(
    data,
    containerWidth,
    chartHeight,
    actualChartPositions,
    30, // より細かいグリッド
    20
  );
  
  // 全ての可能なtooltip領域を見つける
  const possibleAreas = findAllPossibleTooltipAreas(
    emptyCells,
    containerWidth,
    chartHeight
  );
  
  // TooltipZone形式に変換（テスト用なのでindexは連番）
  const zones: TooltipZone[] = possibleAreas.map((area, index) => ({
    index: index % data.length, // データインデックスを循環
    zone: index,
    xPosition: area.x,
    yPosition: area.y,
    isTop: area.y < chartHeight / 2
  }));
  
  return zones;
};

// 実際の運用版：ニュースがあるデータポイントの近くに配置
export const calculateTooltipZones = (
  tooltipIndices: number[],
  actualChartPositions: number[],
  containerWidth: number,
  data: ExtendedChartData[],
  chartHeight: number,
  minDistanceFromCandle: number = 25 // 60から25に削減
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
  
  const allValues = data.flatMap(d => [d.high, d.low]);
  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const valueRange = maxValue - minValue;
  const padding = valueRange * 0.1;
  const yAxisMin = minValue - padding;
  const yAxisMax = maxValue + padding;
  const yAxisRange = yAxisMax - yAxisMin;
  
  const zones: TooltipZone[] = [];
  const occupiedAreas: TooltipArea[] = [];
  const maxTooltips = window.innerWidth < 768 ? 3 : 6; // 表示数を増やす（2→3、4→6）
  
  // 各ニュースポイントに対して最適な配置を見つける
  tooltipIndices.slice(0, maxTooltips).forEach((index) => {
    const dataItem = data[index];
    const xPos = actualChartPositions[index] || ((containerWidth / data.length) * (index + 0.5));
    const centerValue = (dataItem.high + dataItem.low) / 2;
    const centerY = chartHeight * (1 - (centerValue - yAxisMin) / yAxisRange);
    
    // ニュースポイントの近くで配置可能な場所を探す（右側優先）
    let bestPosition: { x: number, y: number, distance: number, xOffset: number } | null = null;
    const searchRadius = 250; // 200から250に拡大
    const stepSize = 8; // 10から8に削減（より細かく探索）
    const overlapTolerance = 0.35; // 35%の重なりまで許容
    
    // 右側を優先して探索
    for (let dy = -searchRadius; dy <= searchRadius; dy += stepSize) {
      // 右から左へ探索（dx: searchRadius → -searchRadius）
      for (let dx = searchRadius; dx >= -searchRadius; dx -= stepSize) {
        const testX = xPos + dx - 70; // tooltip中心を調整
        const testY = centerY + dy - 30;
        
        if (canPlaceTooltip(testX, testY, emptyCells, occupiedAreas, containerWidth, chartHeight, overlapTolerance)) {
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance >= minDistanceFromCandle) {
            // 右側を優先：同じ距離なら右側（dx > 0）を選択
            if (!bestPosition || 
                (distance < bestPosition.distance) || 
                (distance === bestPosition.distance && dx > bestPosition.xOffset)) {
              bestPosition = { x: testX, y: testY, distance, xOffset: dx };
            }
          }
        }
      }
    }
    
    if (bestPosition) {
      zones.push({
        index,
        zone: zones.length,
        xPosition: bestPosition.x,
        yPosition: bestPosition.y,
        isTop: bestPosition.y < centerY
      });
      
      occupiedAreas.push({
        x: bestPosition.x,
        y: bestPosition.y,
        width: 140,
        height: 60,
        dataIndex: index
      });
    }
  });
  
  return zones;
};

// デバッグ用：グリッドと配置領域の可視化
export const debugVisualizeLayout = (
  canvas: HTMLCanvasElement,
  emptyCells: GridCell[],
  tooltipAreas: TooltipArea[]
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
  
  // tooltip領域を描画
  tooltipAreas.forEach((area, index) => {
    ctx.fillStyle = 'rgba(0, 0, 255, 0.2)';
    ctx.fillRect(area.x, area.y, area.width, area.height);
    ctx.strokeStyle = 'rgba(0, 0, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(area.x, area.y, area.width, area.height);
    
    // 領域番号を表示
    ctx.fillStyle = 'blue';
    ctx.font = '12px Arial';
    ctx.fillText(`#${index}`, area.x + 5, area.y + 15);
  });
};