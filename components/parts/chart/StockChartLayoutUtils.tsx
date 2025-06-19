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

// 空白セル検出
export const detectEmptyGridCells = (
  data: ExtendedChartData[],
  containerWidth: number,
  chartHeight: number,
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
  data.forEach((item, index) => {
    const xPos = (containerWidth / data.length) * (index + 0.5);
    const highY = chartHeight * (1 - (item.high - yAxisMin) / yAxisRange);
    const lowY = chartHeight * (1 - (item.low - yAxisMin) / yAxisRange);
    const ma5Y = !isNaN(item.ma5) ? chartHeight * (1 - (item.ma5 - yAxisMin) / yAxisRange) : null;
    const ma25Y = !isNaN(item.ma25) ? chartHeight * (1 - (item.ma25 - yAxisMin) / yAxisRange) : null;
    const ma75Y = !isNaN(item.ma75) ? chartHeight * (1 - (item.ma75 - yAxisMin) / yAxisRange) : null;
    grid.forEach((cell, cellIndex) => {
      const candleWidth = Math.min(containerWidth / data.length * 1.2, 8);
      const xMargin = candleWidth / 2 + 20;
      if (xPos - xMargin <= cell.x + cell.width && xPos + xMargin >= cell.x) {
        const yMargin = 25;
        if (highY - yMargin <= cell.y + cell.height && lowY + yMargin >= cell.y) {
          grid[cellIndex].isEmpty = false;
        }
        const lineMargin = 15;
        [ma5Y, ma25Y, ma75Y].forEach(maY => {
          if (maY !== null && maY - lineMargin <= cell.y + cell.height && maY + lineMargin >= cell.y) {
            grid[cellIndex].isEmpty = false;
          }
        });
      }
    });
  });
  return grid.filter(cell => cell.isEmpty);
};

// 最適な空白セルを見つける
export const findOptimalEmptyCell = (
  targetX: number,
  targetY: number,
  emptyCells: GridCell[],
  occupiedPositions: { x: number, y: number, width: number, height: number }[],
  minDistanceFromTarget: number = 50
): GridCell | null => {
  if (emptyCells.length === 0) return null;
  const tooltipWidth = 140;
  const tooltipHeight = 60;
  const minDistance = 50;
  const availableCells = emptyCells.filter(cell => {
    const distanceFromTarget = Math.sqrt(
      Math.pow(cell.centerX - targetX, 2) + Math.pow(cell.centerY - targetY, 2)
    );
    if (distanceFromTarget < minDistanceFromTarget) {
      return false;
    }
    return !occupiedPositions.some(pos => {
      const xOverlap = Math.abs(cell.centerX - pos.x) < (tooltipWidth + pos.width) / 2 + minDistance;
      const yOverlap = Math.abs(cell.centerY - pos.y) < (tooltipHeight + pos.height) / 2 + minDistance;
      return xOverlap && yOverlap;
    });
  });
  if (availableCells.length === 0) {
    const relaxedCells = emptyCells.filter(cell => {
      const distanceFromTarget = Math.sqrt(
        Math.pow(cell.centerX - targetX, 2) + Math.pow(cell.centerY - targetY, 2)
      );
      return distanceFromTarget >= minDistanceFromTarget * 0.6;
    });
    if (relaxedCells.length === 0) {
      return emptyCells.reduce((best, cell) => {
        const minDistToOthers = occupiedPositions.reduce((minDist, pos) => {
          const dist = Math.sqrt(
            Math.pow(cell.centerX - pos.x, 2) + Math.pow(cell.centerY - pos.y, 2)
          );
          return Math.min(minDist, dist);
        }, Infinity);
        const bestMinDist = occupiedPositions.reduce((minDist, pos) => {
          const dist = Math.sqrt(
            Math.pow(best.centerX - pos.x, 2) + Math.pow(best.centerY - pos.y, 2)
          );
          return Math.min(minDist, dist);
        }, Infinity);
        return minDistToOthers > bestMinDist ? cell : best;
      });
    }
    availableCells.push(...relaxedCells);
  }
  return availableCells.reduce((closest, cell) => {
    const distance = Math.sqrt(
      Math.pow(cell.centerX - targetX, 2) + Math.pow(cell.centerY - targetY, 2)
    );
    const closestDistance = Math.sqrt(
      Math.pow(closest.centerX - targetX, 2) + Math.pow(closest.centerY - targetY, 2)
    );
    return distance < closestDistance ? cell : closest;
  });
};

// ツールチップ配置計算
export const calculateTooltipZones = (
  tooltipIndices: number[],
  actualChartPositions: number[],
  containerWidth: number,
  data: ExtendedChartData[],
  chartHeight: number
): TooltipZone[] => {
  const emptyCells = detectEmptyGridCells(data, containerWidth, chartHeight, 16, 10);
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
  tooltipIndices.slice(0, 4).forEach((index, i) => {
    const dataItem = data[index];
    const xPos = actualChartPositions[index] || ((containerWidth / data.length) * (index + 0.5));
    const centerValue = (dataItem.high + dataItem.low) / 2;
    const centerY = chartHeight * (1 - (centerValue - yAxisMin) / yAxisRange);
    const optimalCell = findOptimalEmptyCell(xPos, centerY, emptyCells, occupiedPositions, 60);
    if (optimalCell) {
      const tooltipX = optimalCell.centerX - 70;
      const tooltipY = optimalCell.centerY - 30;
      zones.push({
        index,
        zone: i,
        xPosition: tooltipX + 70,
        yPosition: tooltipY,
        isTop: optimalCell.centerY < centerY
      });
      occupiedPositions.push({
        x: optimalCell.centerX,
        y: optimalCell.centerY,
        width: 140,
        height: 60
      });
    } else {
      const isTop = centerY > chartHeight / 2;
      const yPosition = isTop ? -10 : chartHeight - 25;
      zones.push({
        index,
        zone: i,
        xPosition: xPos,
        yPosition,
        isTop
      });
      occupiedPositions.push({
        x: xPos,
        y: yPosition + 30,
        width: 140,
        height: 60
      });
    }
  });
  return zones;
}; 