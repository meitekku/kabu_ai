// チャート画像生成ユーティリティ
export function generateStockChartSVG(): string {
  
  // リアルタイムの株価データ風の値を生成
  const basePrice = 2450;
  const dataPoints = [];
  
  for (let i = 0; i < 15; i++) {
    const variation = (Math.random() - 0.5) * 200;
    const price = Math.max(1000, basePrice + variation + (i * 10));
    dataPoints.push({
      x: 60 + (i * 46),
      y: 350 - ((price - 1000) / 2000 * 250),
      price: Math.round(price)
    });
  }
  
  const currentPrice = dataPoints[dataPoints.length - 1].price;
  const priceChange = currentPrice - basePrice;
  const priceChangePercent = ((priceChange / basePrice) * 100).toFixed(1);
  
  const polylinePoints = dataPoints.map(p => `${p.x},${p.y}`).join(' ');
  
  return `
    <svg width="800" height="400" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="400" fill="#ffffff"/>
      
      <!-- グリッド線 -->
      <defs>
        <pattern id="grid" width="50" height="25" patternUnits="userSpaceOnUse">
          <path d="M 50 0 L 0 0 0 25" fill="none" stroke="#f0f0f0" stroke-width="1"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
      
      <!-- 背景のグラデーション -->
      <defs>
        <linearGradient id="priceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style="stop-color:#e3f2fd;stop-opacity:0.8" />
          <stop offset="100%" style="stop-color:#ffffff;stop-opacity:0.2" />
        </linearGradient>
      </defs>
      
      <!-- タイトル -->
      <text x="400" y="25" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#1976d2">
        サンプル株式会社（1234） - 株価チャート
      </text>
      
      <!-- 現在値表示 -->
      <text x="400" y="45" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="${priceChange >= 0 ? '#4caf50' : '#f44336'}">
        現在値: ${currentPrice.toLocaleString()}円 (${priceChange >= 0 ? '+' : ''}${priceChange.toLocaleString()}円/ ${priceChange >= 0 ? '+' : ''}${priceChangePercent}%)
      </text>
      
      <!-- Y軸 -->
      <line x1="60" y1="60" x2="60" y2="350" stroke="#666" stroke-width="2"/>
      
      <!-- X軸 -->
      <line x1="60" y1="350" x2="740" y2="350" stroke="#666" stroke-width="2"/>
      
      <!-- Y軸ラベル -->
      <text x="45" y="85" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#666">3,000</text>
      <text x="45" y="122" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#666">2,750</text>
      <text x="45" y="159" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#666">2,500</text>
      <text x="45" y="196" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#666">2,250</text>
      <text x="45" y="233" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#666">2,000</text>
      <text x="45" y="270" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#666">1,750</text>
      <text x="45" y="307" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#666">1,500</text>
      <text x="45" y="344" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#666">1,250</text>
      
      <!-- X軸ラベル -->
      <text x="106" y="370" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#666">9:00</text>
      <text x="198" y="370" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#666">10:30</text>
      <text x="290" y="370" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#666">12:00</text>
      <text x="382" y="370" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#666">13:30</text>
      <text x="474" y="370" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#666">15:00</text>
      <text x="566" y="370" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#666">16:30</text>
      <text x="658" y="370" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#666">18:00</text>
      
      <!-- 価格帯の背景色 -->
      <polygon fill="url(#priceGradient)" points="${polylinePoints} 740,350 60,350" opacity="0.3"/>
      
      <!-- 株価ライン -->
      <polyline fill="none" stroke="#1976d2" stroke-width="3" points="${polylinePoints}"/>
      
      <!-- データポイント -->
      ${dataPoints.map(point => `
        <circle cx="${point.x}" cy="${point.y}" r="4" fill="#1976d2" stroke="#ffffff" stroke-width="2">
          <title>${point.price.toLocaleString()}円</title>
        </circle>
      `).join('')}
      
      <!-- 移動平均線（25MA） -->
      <polyline fill="none" stroke="#ff9800" stroke-width="2" stroke-dasharray="5,5" points="
        ${dataPoints.map((point, i) => {
          const avgY = point.y + (Math.sin(i * 0.5) * 20);
          return `${point.x},${avgY}`;
        }).join(' ')}
      "/>
      
      <!-- 凡例 -->
      <rect x="520" y="70" width="250" height="85" fill="white" stroke="#ddd" stroke-width="1" rx="5" opacity="0.95"/>
      
      <!-- 現在価格ライン -->
      <line x1="520" y1="90" x2="550" y2="90" stroke="#1976d2" stroke-width="3"/>
      <text x="560" y="95" font-family="Arial, sans-serif" font-size="12" fill="#333">現在価格</text>
      
      <!-- 移動平均線ライン -->
      <line x1="520" y1="110" x2="550" y2="110" stroke="#ff9800" stroke-width="2" stroke-dasharray="3,3"/>
      <text x="560" y="115" font-family="Arial, sans-serif" font-size="12" fill="#333">25日移動平均</text>
      
      <!-- 統計情報 -->
      <text x="530" y="135" font-family="Arial, sans-serif" font-size="11" fill="#666">高値: ${Math.max(...dataPoints.map(p => p.price)).toLocaleString()}円</text>
      <text x="530" y="150" font-family="Arial, sans-serif" font-size="11" fill="#666">安値: ${Math.min(...dataPoints.map(p => p.price)).toLocaleString()}円</text>
      
      <!-- 時刻表示 -->
      <text x="20" y="390" font-family="Arial, sans-serif" font-size="10" fill="#999">
        生成時刻: ${now.toLocaleTimeString('ja-JP')}
      </text>
    </svg>
  `;
}

// より高度なチャート生成（ローソク足風）
export function generateCandlestickChartSVG(): string {
  const basePrice = 2450;
  const candles = [];
  
  // 過去30日間のローソク足データを生成
  for (let i = 0; i < 30; i++) {
    const open = basePrice + (Math.random() - 0.5) * 300;
    const close = open + (Math.random() - 0.5) * 150;
    const high = Math.max(open, close) + Math.random() * 100;
    const low = Math.min(open, close) - Math.random() * 100;
    
    candles.push({
      x: 80 + (i * 20),
      open: Math.round(open),
      high: Math.round(high),
      low: Math.round(low),
      close: Math.round(close),
      isUp: close > open
    });
  }
  
  const maxPrice = Math.max(...candles.map(c => c.high));
  const minPrice = Math.min(...candles.map(c => c.low));
  const priceRange = maxPrice - minPrice;
  
  return `
    <svg width="800" height="500" xmlns="http://www.w3.org/2000/svg">
      <rect width="800" height="500" fill="#fafafa"/>
      
      <!-- タイトル -->
      <text x="400" y="25" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#333">
        サンプル株式会社 - 30日間ローソク足チャート
      </text>
      
      <!-- Y軸とX軸 -->
      <line x1="70" y1="50" x2="70" y2="400" stroke="#333" stroke-width="1"/>
      <line x1="70" y1="400" x2="750" y2="400" stroke="#333" stroke-width="1"/>
      
      <!-- ローソク足 -->
      ${candles.map((candle) => {
        const highY = 50 + ((maxPrice - candle.high) / priceRange) * 350;
        const lowY = 50 + ((maxPrice - candle.low) / priceRange) * 350;
        const openY = 50 + ((maxPrice - candle.open) / priceRange) * 350;
        const closeY = 50 + ((maxPrice - candle.close) / priceRange) * 350;
        
        const bodyTop = Math.min(openY, closeY);
        const bodyHeight = Math.abs(openY - closeY);
        const color = candle.isUp ? '#4caf50' : '#f44336';
        
        return `
          <!-- ヒゲ -->
          <line x1="${candle.x}" y1="${highY}" x2="${candle.x}" y2="${lowY}" stroke="${color}" stroke-width="1"/>
          <!-- 実体 -->
          <rect x="${candle.x - 6}" y="${bodyTop}" width="12" height="${Math.max(bodyHeight, 1)}" fill="${candle.isUp ? color : color}" stroke="${color}"/>
        `;
      }).join('')}
      
      <!-- 価格ラベル -->
      ${Array.from({length: 8}, (_, i) => {
        const price = maxPrice - (priceRange / 7) * i;
        const y = 50 + (350 / 7) * i;
        return `<text x="60" y="${y + 5}" text-anchor="end" font-family="Arial, sans-serif" font-size="10" fill="#666">${Math.round(price).toLocaleString()}</text>`;
      }).join('')}
      
      <!-- 日付ラベル -->
      ${candles.filter((_, i) => i % 5 === 0).map((candle, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (30 - (i * 5)));
        return `<text x="${candle.x}" y="420" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#666">${date.getMonth() + 1}/${date.getDate()}</text>`;
      }).join('')}
      
      <!-- 統計情報 -->
      <rect x="520" y="60" width="200" height="120" fill="white" stroke="#ddd" stroke-width="1" rx="5" opacity="0.95"/>
      <text x="530" y="80" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#333">市場統計</text>
      <text x="530" y="100" font-family="Arial, sans-serif" font-size="11" fill="#666">期間高値: ${maxPrice.toLocaleString()}円</text>
      <text x="530" y="115" font-family="Arial, sans-serif" font-size="11" fill="#666">期間安値: ${minPrice.toLocaleString()}円</text>
      <text x="530" y="130" font-family="Arial, sans-serif" font-size="11" fill="#666">現在値: ${candles[candles.length - 1].close.toLocaleString()}円</text>
      <text x="530" y="145" font-family="Arial, sans-serif" font-size="11" fill="#666">出来高: 1,234,567株</text>
      <text x="530" y="160" font-family="Arial, sans-serif" font-size="11" fill="#666">時価総額: 1,250億円</text>
    </svg>
  `;
}