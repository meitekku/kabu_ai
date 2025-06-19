import { getDefaultTooltipIndices } from './StockChartTooltip';
import { calculateTooltipZones, TooltipZone } from './StockChartLayoutUtils';
import { ExtendedChartData } from './types/StockChartTypes';

export const recordChartPosition = (actualChartPositionsRef: React.MutableRefObject<number[]>, index: number, xCoordinate: number) => {
  const positions = actualChartPositionsRef.current;
  if (positions.length <= index) {
    for (let i = positions.length; i <= index; i++) {
      positions[i] = 0;
    }
  }
  positions[index] = xCoordinate;
  actualChartPositionsRef.current = positions;
};

export const captureAllChartPositions = (
  chartContainerRef: React.RefObject<HTMLDivElement>,
  containerWidth: number,
  data: ExtendedChartData[],
  setTooltipZones: (zones: TooltipZone[]) => void
) => {
  if (!chartContainerRef.current || !containerWidth || data.length === 0) return;
  const svgElement = chartContainerRef.current.querySelector('svg');
  if (!svgElement) return;
  const barElements = svgElement.querySelectorAll('g[class*="recharts-bar"] .recharts-bar-rectangle');
  if (barElements.length > 0) {
    const newPositions = new Array(data.length).fill(0);
    barElements.forEach((element, idx) => {
      if (idx < data.length) {
        const rect = element.getBoundingClientRect();
        const containerRect = chartContainerRef.current ? chartContainerRef.current.getBoundingClientRect() : { left: 0 };
        const relativeX = rect.left - containerRect.left + (rect.width / 2);
        newPositions[idx] = relativeX;
      }
    });
    const defaultIndices = getDefaultTooltipIndices(data);
    const chartHeight = window.innerWidth >= 768 ? 192 : 128;
    const zones = calculateTooltipZones(
      defaultIndices,
      newPositions,
      containerWidth,
      data,
      chartHeight
    );
    setTooltipZones(zones);
    return newPositions;
  }
};

export const handleResize = (
  setContainerWidth: (w: number) => void,
  actualChartPositionsRef: React.MutableRefObject<number[]>,
  setIsChartReady: (b: boolean) => void,
  containerWidth: number,
  data: ExtendedChartData[],
  captureAllChartPositions: () => void
) => (width: number) => {
  setContainerWidth(width);
  actualChartPositionsRef.current = [];
  setIsChartReady(false);
  if (width > 0 && data.length > 0) {
    setTimeout(() => {
      captureAllChartPositions();
      setIsChartReady(true);
    }, 1500);
  }
}; 