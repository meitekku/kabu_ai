// テーマ関連の型定義
export type ChartTheme = 'default' | 'black';

// 色変換関数：青色を緑色に変換
export const convertBlueToGreen = (color: string): string => {
  // 青系の色を緑色に変換
  if (color === '#0000ff' || color === '#0000FF' || color === 'blue') {
    return '#00aa00'; // 緑色に変換
  }
  if (color === '#4169e1' || color === '#4169E1') { // Royal Blue
    return '#32cd32'; // Lime Green
  }
  if (color === '#1e90ff' || color === '#1E90FF') { // Dodger Blue
    return '#00ff00'; // Pure Green
  }
  if (color === '#00bfff' || color === '#00BFFF') { // Deep Sky Blue
    return '#00ff7f'; // Spring Green
  }
  return color; // 青系でない場合はそのまま返す
};

// テーマに基づく色設定を取得
export const getThemeColors = (theme: ChartTheme) => {
  const isBlackTheme = theme === 'black';
  return {
    background: isBlackTheme ? '#0f0f1e' : '#ffffff',
    text: isBlackTheme ? '#ffffff' : '#000000',
    textSecondary: isBlackTheme ? '#b8b8c8' : '#666666',
    gridColor: isBlackTheme ? '#1f1f33' : '#e0e0e0',
    tooltipBg: isBlackTheme ? 'rgba(15, 15, 30, 0.3)' : 'rgba(255, 255, 255, 0.65)',
    tooltipBorder: isBlackTheme ? '#ffffff' : '#cccccc',
    infoBg: isBlackTheme ? 'rgba(15, 15, 30, 0.85)' : 'rgba(255, 255, 255, 0.8)',
    emptyAreaBg: isBlackTheme ? 'rgba(31, 31, 51, 0.8)' : 'rgba(243, 244, 246, 0.8)',
    emptyAreaBorder: isBlackTheme ? '#3d3d5a' : '#d1d5db',
    emptyAreaText: isBlackTheme ? '#9898b8' : '#6b7280',
    loadingBg: isBlackTheme ? '#1f1f33' : '#e5e7eb',
    errorText: isBlackTheme ? '#ff6b6b' : '#ef4444',
    lineConnector: isBlackTheme ? '#ffffff' : '#000000',
    ma5Color: isBlackTheme ? '#ffd700' : '#00ff00',
    ma25Color: isBlackTheme ? '#ff8c00' : '#ff0000',
    ma75Color: isBlackTheme ? '#ff6347' : '#0000ff',
    volumeUpFill: isBlackTheme ? '#ffd700' : '#ffcccc',
    volumeUpStroke: isBlackTheme ? '#ffc700' : '#ff0000',
    volumeDownFill: isBlackTheme ? '#ffd700' : '#ccccff',
    volumeDownStroke: isBlackTheme ? '#ffc700' : '#0000ff'
  };
}; 