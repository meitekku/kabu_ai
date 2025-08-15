import { Database } from '@/lib/database/Mysql';
import { NextRequest } from 'next/server';
import { RowDataPacket } from 'mysql2';
import { promises as fs } from 'fs';
import path from 'path';

interface BaseRecord extends RowDataPacket {
  id: number;
  created_at?: string;
  updated_at?: string;
}

interface NewsItem extends BaseRecord {
  title: string;
  content: string;
  accept: number;
}

interface CountResult extends BaseRecord {
  count: number;
}

interface DatabaseOperation<T extends BaseRecord> {
  type: 'select' | 'insert' | 'update' | 'delete';
  table: string;
  data?: Partial<T> | (keyof T)[];
  conditions?: Partial<T>;
}

interface DatabaseResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// サンプルデータクリーンアップ関数
async function cleanupSampleData(db: ReturnType<typeof Database.getInstance>): Promise<void> {
  try {
    const sampleDataTitles = [
      '【AI分析】注目銘柄の買い時シグナル発生',
      '市場急落時の対応戦略｜AIが推奨する銘柄選定',
      '週間パフォーマンス｜AI予測の的中率95%達成'
    ];
    
    // タイトルベースでサンプルデータを削除
    for (const title of sampleDataTitles) {
      try {
        await db.delete('DELETE FROM post WHERE title = ?', [title]);
      } catch (error) {
        console.log(`サンプルデータ削除エラー (${title}):`, error);
      }
    }
    
    // siteベースでもサンプルデータを削除
    try {
      await db.delete('DELETE FROM post WHERE site = ? OR site = ?', [999, 1]);
    } catch (error) {
      console.log('サンプルデータ削除エラー (site):', error);
    }
    
    console.log('サンプルデータのクリーンアップが完了しました');
  } catch (error) {
    console.log('サンプルデータクリーンアップ中にエラーが発生しました:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const operation: DatabaseOperation<NewsItem> = await request.json();
    const db = Database.getInstance();

    // API起動時にサンプルデータをクリーンアップ
    await cleanupSampleData(db);

    switch (operation.type) {
      case 'select': {
        if (Array.isArray(operation.data) && operation.table) {
          // postテーブルの場合は、post_codeテーブルとJOINしてcodeを取得
          let query: string;
          if (operation.table === 'post' && operation.data.includes('code')) {
            const fields = operation.data.map(field => {
              if (field === 'code') {
                return 'pc.code';
              }
              return `p.${field}`;
            }).join(', ');
            query = `SELECT ${fields} FROM ${operation.table} p LEFT JOIN post_code pc ON p.id = pc.post_id`;
          } else {
            const fields = operation.data.join(', ');
            query = `SELECT ${fields} FROM ${operation.table}`;
          }
          const params: (string | number | boolean | null)[] = [];
          
          // 複数条件を格納する配列を用意
          const conditionParts: string[] = [];

          // ユーザーからの条件があれば追加
          if (operation.conditions) {
            for (const [key, value] of Object.entries(operation.conditions)) {
              // postテーブルのJOINクエリの場合はプリフィックスを追加
              if (operation.table === 'post' && operation.data.includes('code')) {
                conditionParts.push(`p.${key} = ?`);
              } else {
                conditionParts.push(`${key} = ?`);
              }
              params.push(value);
            }
          }
          
          // site=72の記事を除外
          if (operation.table === 'post') {
            if (operation.data.includes('code')) {
              conditionParts.push(`p.site != ?`);
            } else {
              conditionParts.push(`site != ?`);
            }
            params.push(72);
          }

          // 実データが存在する場合はサンプルデータを除外
          if (operation.table === 'post') {
            // サンプルデータのタイトルパターン
            const sampleDataTitles = [
              '【AI分析】注目銘柄の買い時シグナル発生',
              '市場急落時の対応戦略｜AIが推奨する銘柄選定',
              '週間パフォーマンス｜AI予測の的中率95%達成'
            ];
            
            // 先にサンプルデータを強制削除（タイトルとsiteの両方で識別）
            try {
              // タイトルベースでサンプルデータを削除
              for (const title of sampleDataTitles) {
                await db.delete('DELETE FROM post WHERE title = ?', [title]);
              }
              // siteベースでもサンプルデータを削除
              await db.delete('DELETE FROM post WHERE site = ? OR site = ?', [999, 1]);
              console.log('既存のサンプルデータを削除しました');
            } catch (error) {
              console.log('サンプルデータの削除をスキップしました:', error);
            }
            
            // accept=0の実データ（site != 72 AND タイトルがサンプルではない）の存在をチェック
            let realDataQuery = 'SELECT COUNT(*) as count FROM post WHERE site != ?';
            const realDataParams: (string | number | boolean | null)[] = [72];
            
            // サンプルデータタイトルを除外
            for (const title of sampleDataTitles) {
              realDataQuery += ' AND title != ?';
              realDataParams.push(title);
            }
            
            // accept条件がある場合は、それも含めてチェック
            if (operation.conditions && operation.conditions.accept !== undefined) {
              realDataQuery += ' AND accept = ?';
              realDataParams.push(Number(operation.conditions.accept));
            }
            
            const realDataResults = await db.select<CountResult>(realDataQuery, realDataParams);
            const hasRealData = realDataResults[0]?.count > 0;
            
            if (hasRealData) {
              console.log('実データが存在するため、サンプルデータを除外します');
              
              // 実データがある場合はサンプルデータを除外（タイトルベース）
              for (const title of sampleDataTitles) {
                if (operation.data.includes('code')) {
                  conditionParts.push(`p.title != ?`);
                } else {
                  conditionParts.push(`title != ?`);
                }
                params.push(title);
              }
              
              // siteベースでも除外
              if (operation.data.includes('code')) {
                conditionParts.push(`p.site != ? AND p.site != ?`);
              } else {
                conditionParts.push(`site != ? AND site != ?`);
              }
              params.push(999, 1);
            }
          }

          // 現在時刻を取得して、15:30以降かどうかで条件を切り替え
          const now = new Date();
          const currentHour = now.getHours();
          const currentMinute = now.getMinutes();
          
          if (currentHour > 15 || (currentHour === 15 && currentMinute >= 30)) {
            // 15:30以降の場合：本日の15:30:00 の記事だけを取得
            // 日付部分を "YYYY-MM-DD" 形式に整形
            const year = now.getFullYear();
            const month = ('0' + (now.getMonth() + 1)).slice(-2);
            const day = ('0' + now.getDate()).slice(-2);
            const targetTimestamp = `${year}-${month}-${day} 15:30:00`;
            if (operation.table === 'post' && operation.data.includes('code')) {
              conditionParts.push(`p.created_at >= ?`);
            } else {
              conditionParts.push(`created_at >= ?`);
            }
            params.push(targetTimestamp);
          } else {
            // 15:30より前の場合：本日の全記事を取得（created_atの日付が本日）
            if (operation.table === 'post' && operation.data.includes('code')) {
              conditionParts.push(`DATE(p.created_at) = CURDATE()`);
            } else {
              conditionParts.push(`DATE(created_at) = CURDATE()`);
            }
          }

          // WHERE 節を付与
          query += ' WHERE ' + conditionParts.join(' AND ');

          const results = await db.select<NewsItem>(query, params);
          
          // データが0件の場合、データベース全体にデータが存在するかをチェック
          if (results.length === 0) {
            // サンプルデータのタイトルパターン（再定義）
            const sampleDataTitles = [
              '【AI分析】注目銘柄の買い時シグナル発生',
              '市場急落時の対応戦略｜AIが推奨する銘柄選定',
              '週間パフォーマンス｜AI予測の的中率95%達成'
            ];
            
            // postテーブルに実データが存在するかをチェック（site != 72 AND タイトルがサンプルではない）
            let existingDataQuery = 'SELECT COUNT(*) as count FROM post WHERE site != ?';
            const existingDataParams: (string | number | boolean | null)[] = [72];
            
            // サンプルデータタイトルを除外
            for (const title of sampleDataTitles) {
              existingDataQuery += ' AND title != ?';
              existingDataParams.push(title);
            }
            
            // accept条件がある場合は、それも含めてチェック
            if (operation.conditions && operation.conditions.accept !== undefined) {
              existingDataQuery += ' AND accept = ?';
              existingDataParams.push(Number(operation.conditions.accept));
            }
            
            const existingDataResults = await db.select<CountResult>(existingDataQuery, existingDataParams);
            const hasExistingData = existingDataResults[0]?.count > 0;
            
            // 実データが全く存在しない場合のみサンプルデータを生成
            if (!hasExistingData) {
              console.log('データベースに実データが存在しません。サンプルデータを生成します...');
              await generateSampleData(db);
              
              // サンプルデータ生成後、再度データを取得
              const updatedResults = await db.select<NewsItem>(query, params);
              return Response.json({ 
                success: true, 
                data: updatedResults 
              } as DatabaseResponse<NewsItem[]>);
            } else {
              console.log('実データが存在するため、サンプルデータは生成しません。');
            }
          }
          
          return Response.json({ 
            success: true, 
            data: results 
          } as DatabaseResponse<NewsItem[]>);
        }
        break;
      }

      case 'insert': {
        if (!Array.isArray(operation.data) && operation.data) {
          const fields = Object.keys(operation.data);
          const values = Object.values(operation.data);
          const query = `INSERT INTO ${operation.table} (${fields.join(', ')}) VALUES (${fields.map(() => '?').join(', ')})`;
          
          const insertId = await db.insert(query, values as (string | number | boolean | null)[]);
          return Response.json({ 
            success: true, 
            data: { insertId } 
          } as DatabaseResponse<{ insertId: number }>);
        }
        break;
      }

      case 'update': {
        if (!Array.isArray(operation.data) && operation.data && operation.conditions) {
          const updateFields = Object.entries(operation.data)
            .map(([key]) => `${key} = ?`)
            .join(', ');
          const conditions = Object.entries(operation.conditions);
          const whereClause = conditions
            .map(([key]) => `${key} = ?`)
            .join(' AND ');
          
          const query = `UPDATE ${operation.table} SET ${updateFields} WHERE ${whereClause}`;
          const params: (string | number | boolean | null)[] = [
            ...Object.values(operation.data),
            ...Object.values(operation.conditions)
          ];
          
          const affectedRows = await db.update(query, params);
          return Response.json({ 
            success: true, 
            data: { affectedRows } 
          } as DatabaseResponse<{ affectedRows: number }>);
        }
        break;
      }

      case 'delete': {
        if (operation.conditions) {
          const conditions = Object.entries(operation.conditions);
          const whereClause = conditions
            .map(([key]) => `${key} = ?`)
            .join(' AND ');
          
          const query = `DELETE FROM ${operation.table} WHERE ${whereClause}`;
          const params = Object.values(operation.conditions) as (string | number | boolean | null)[];
          
          const affectedRows = await db.delete(query, params);
          return Response.json({ 
            success: true, 
            data: { affectedRows } 
          } as DatabaseResponse<{ affectedRows: number }>);
        }
        break;
      }
    }

    return Response.json(
      { 
        success: false, 
        error: '無効な操作パラメータです' 
      } as DatabaseResponse<never>,
      { status: 400 }
    );

  } catch (error) {
    console.error('Database operation error:', error);
    return Response.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'データベース操作中にエラーが発生しました'
      } as DatabaseResponse<never>,
      { status: 500 }
    );
  }
}

// シンプルなSVGチャートを生成する関数
function generateSimpleSVGChart(): string {
  const now = new Date();
  const basePrice = 2450;
  const dataPoints = [];
  
  for (let i = 0; i < 10; i++) {
    const variation = (Math.random() - 0.5) * 150;
    const price = Math.max(1500, basePrice + variation + (i * 15));
    dataPoints.push({
      x: 80 + (i * 60),
      y: 300 - ((price - 1500) / 1500 * 200),
      price: Math.round(price)
    });
  }
  
  const currentPrice = dataPoints[dataPoints.length - 1].price;
  const priceChange = currentPrice - basePrice;
  const priceChangePercent = ((priceChange / basePrice) * 100).toFixed(1);
  const polylinePoints = dataPoints.map(p => `${p.x},${p.y}`).join(' ');
  
  return `
    <svg width="700" height="400" xmlns="http://www.w3.org/2000/svg">
      <rect width="700" height="400" fill="#ffffff"/>
      
      <!-- タイトル -->
      <text x="350" y="25" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#1976d2">
        サンプル株式会社（1234） - 株価チャート
      </text>
      
      <!-- 現在値表示 -->
      <text x="350" y="45" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="${priceChange >= 0 ? '#4CAF50' : '#f44336'}" font-weight="bold">
        現在値: ${currentPrice.toLocaleString()}円 (${priceChange >= 0 ? '+' : ''}${priceChange}円/ ${priceChange >= 0 ? '+' : ''}${priceChangePercent}%)
      </text>
      
      <!-- Y軸とX軸 -->
      <line x1="70" y1="70" x2="70" y2="320" stroke="#333" stroke-width="2"/>
      <line x1="70" y1="320" x2="650" y2="320" stroke="#333" stroke-width="2"/>
      
      <!-- 株価ライン -->
      <polyline fill="none" stroke="#4CAF50" stroke-width="3" points="${polylinePoints}"/>
      
      <!-- データポイント -->
      ${dataPoints.map(point => `
        <circle cx="${point.x}" cy="${point.y}" r="4" fill="#4CAF50" stroke="#ffffff" stroke-width="2">
          <title>${point.price.toLocaleString()}円</title>
        </circle>
      `).join('')}
      
      <!-- 統計情報 -->
      <rect x="500" y="70" width="180" height="80" fill="white" stroke="#ddd" stroke-width="1" rx="5" opacity="0.95"/>
      <text x="510" y="90" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#333">市場統計</text>
      <text x="510" y="110" font-family="Arial, sans-serif" font-size="11" fill="#666">高値: ${Math.max(...dataPoints.map(p => p.price)).toLocaleString()}円</text>
      <text x="510" y="125" font-family="Arial, sans-serif" font-size="11" fill="#666">安値: ${Math.min(...dataPoints.map(p => p.price)).toLocaleString()}円</text>
      <text x="510" y="140" font-family="Arial, sans-serif" font-size="11" fill="#666">出来高: 1,234,567株</text>
      
      <!-- 時刻表示 -->
      <text x="20" y="380" font-family="Arial, sans-serif" font-size="10" fill="#999">
        生成時刻: ${now.toLocaleTimeString('ja-JP')}
      </text>
    </svg>
  `;
}

// 株価チャート画像を生成する関数
async function generateSampleChartImage(): Promise<string> {
  try {
    // 修正済み: SVGチャート生成
    
    // タイムスタンプ付きのファイル名でSVG画像を保存
    const timestamp = Date.now();
    const filename = `sample_chart_${timestamp}.svg`;
    const filepath = path.join(process.cwd(), 'public', 'uploads', filename);
    
    // uploadsディレクトリが存在しない場合は作成
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    try {
      await fs.access(uploadsDir);
    } catch {
      await fs.mkdir(uploadsDir, { recursive: true });
    }
    
    // SVGチャートを生成してファイルに保存
    const svgChart = await generateDetailedSVGChart();
    await fs.writeFile(filepath, svgChart, 'utf8');
    
    console.log(`チャート画像を生成しました: ${filename}`);
    return `/uploads/${filename}`;
    
  } catch (error) {
    console.error('チャート画像生成エラー:', error);
    
    // エラーの場合はシンプルなSVGチャートを生成
    try {
      const timestamp = Date.now();
      const filename = `simple_chart_${timestamp}.svg`;
      const filepath = path.join(process.cwd(), 'public', 'uploads', filename);
      
      // シンプルなSVGチャートを生成
      const simpleChart = generateSimpleSVGChart();
      await fs.writeFile(filepath, simpleChart, 'utf8');
      
      console.log(`シンプルSVGチャート画像を生成しました: ${filename}`);
      return `/uploads/${filename}`;
      
    } catch (fallbackError) {
      console.error('代替チャート生成もエラー:', fallbackError);
      return '/uploads/default_chart.svg';
    }
  }
}

// より詳細なSVGチャートを生成する関数
async function generateDetailedSVGChart(): Promise<string> {
  try {
    const now = new Date();
    const basePrice = 2450;
    const dataPoints = [];
    
    for (let i = 0; i < 20; i++) {
      const variation = (Math.random() - 0.5) * 200;
      const trend = i * 8; // 上昇トレンド
      const price = Math.max(1500, basePrice + variation + trend);
      dataPoints.push({
        x: 70 + (i * 32),
        y: 320 - ((price - 1500) / 1500 * 220),
        price: Math.round(price)
      });
    }
    
    const currentPrice = dataPoints[dataPoints.length - 1].price;
    const priceChange = currentPrice - basePrice;
    const priceChangePercent = ((priceChange / basePrice) * 100).toFixed(1);
    const polylinePoints = dataPoints.map(p => `${p.x},${p.y}`).join(' ');
    
    // SVGでより詳細なチャートを生成
    return `
      <svg width="900" height="500" xmlns="http://www.w3.org/2000/svg">
        <rect width="900" height="500" fill="#ffffff"/>
        
        <!-- グリッド線 -->
        <defs>
          <pattern id="grid" width="40" height="25" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 25" fill="none" stroke="#f0f0f0" stroke-width="1"/>
          </pattern>
          <linearGradient id="priceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:#4CAF50;stop-opacity:0.3" />
            <stop offset="100%" style="stop-color:#4CAF50;stop-opacity:0.05" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        
        <!-- タイトル -->
        <text x="450" y="30" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#1976d2">
          サンプル株式会社（1234） - リアルタイム株価
        </text>
        
        <!-- 現在値表示 -->
        <text x="450" y="50" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="${priceChange >= 0 ? '#4CAF50' : '#f44336'}" font-weight="bold">
          現在値: ${currentPrice.toLocaleString()}円 (${priceChange >= 0 ? '+' : ''}${priceChange}円/ ${priceChange >= 0 ? '+' : ''}${priceChangePercent}%)
        </text>
        
        <!-- Y軸 -->
        <line x1="60" y1="80" x2="60" y2="380" stroke="#333" stroke-width="2"/>
        
        <!-- X軸 -->
        <line x1="60" y1="380" x2="780" y2="380" stroke="#333" stroke-width="2"/>
        
        <!-- Y軸ラベル -->
        <text x="50" y="105" text-anchor="end" font-family="Arial, sans-serif" font-size="11" fill="#666">3,200</text>
        <text x="50" y="130" text-anchor="end" font-family="Arial, sans-serif" font-size="11" fill="#666">3,000</text>
        <text x="50" y="155" text-anchor="end" font-family="Arial, sans-serif" font-size="11" fill="#666">2,800</text>
        <text x="50" y="180" text-anchor="end" font-family="Arial, sans-serif" font-size="11" fill="#666">2,600</text>
        <text x="50" y="205" text-anchor="end" font-family="Arial, sans-serif" font-size="11" fill="#666">2,400</text>
        <text x="50" y="230" text-anchor="end" font-family="Arial, sans-serif" font-size="11" fill="#666">2,200</text>
        <text x="50" y="255" text-anchor="end" font-family="Arial, sans-serif" font-size="11" fill="#666">2,000</text>
        <text x="50" y="280" text-anchor="end" font-family="Arial, sans-serif" font-size="11" fill="#666">1,800</text>
        <text x="50" y="305" text-anchor="end" font-family="Arial, sans-serif" font-size="11" fill="#666">1,600</text>
        
        <!-- X軸ラベル -->
        <text x="102" y="400" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#666">9:00</text>
        <text x="198" y="400" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#666">10:00</text>
        <text x="294" y="400" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#666">11:00</text>
        <text x="390" y="400" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#666">12:00</text>
        <text x="486" y="400" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#666">13:00</text>
        <text x="582" y="400" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#666">14:00</text>
        <text x="678" y="400" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#666">15:00</text>
        
        <!-- 価格帯の背景 -->
        <polygon fill="url(#priceGradient)" points="${polylinePoints} 710,380 70,380" opacity="0.6"/>
        
        <!-- 移動平均線 -->
        <polyline fill="none" stroke="#FF9800" stroke-width="2" stroke-dasharray="5,5" points="
          ${dataPoints.map((point, i) => {
            const avgY = point.y + (Math.sin(i * 0.3) * 15);
            return `${point.x},${avgY}`;
          }).join(' ')}
        "/>
        
        <!-- 株価ライン -->
        <polyline fill="none" stroke="#4CAF50" stroke-width="3" points="${polylinePoints}"/>
        
        <!-- データポイント -->
        ${dataPoints.map((point) => `
          <circle cx="${point.x}" cy="${point.y}" r="3" fill="#4CAF50" stroke="#ffffff" stroke-width="2">
            <title>${point.price.toLocaleString()}円</title>
          </circle>
        `).join('')}
        
        <!-- 最新価格ポイント -->
        <circle cx="${dataPoints[dataPoints.length - 1].x}" cy="${dataPoints[dataPoints.length - 1].y}" r="6" fill="#4CAF50" stroke="#ffffff" stroke-width="3"/>
        
        <!-- 情報パネル -->
        <rect x="620" y="80" width="250" height="140" fill="white" stroke="#ddd" stroke-width="1" rx="8" opacity="0.95"/>
        
        <!-- 凡例 -->
        <line x1="630" y1="100" x2="660" y2="100" stroke="#4CAF50" stroke-width="3"/>
        <text x="670" y="105" font-family="Arial, sans-serif" font-size="12" fill="#333">現在価格</text>
        
        <line x1="630" y1="120" x2="660" y2="120" stroke="#FF9800" stroke-width="2" stroke-dasharray="3,3"/>
        <text x="670" y="125" font-family="Arial, sans-serif" font-size="12" fill="#333">25日移動平均</text>
        
        <!-- 統計情報 -->
        <text x="630" y="145" font-family="Arial, sans-serif" font-size="11" fill="#666">始値: ${dataPoints[0].price.toLocaleString()}円</text>
        <text x="630" y="160" font-family="Arial, sans-serif" font-size="11" fill="#666">高値: ${Math.max(...dataPoints.map(p => p.price)).toLocaleString()}円</text>
        <text x="630" y="175" font-family="Arial, sans-serif" font-size="11" fill="#666">安値: ${Math.min(...dataPoints.map(p => p.price)).toLocaleString()}円</text>
        <text x="630" y="190" font-family="Arial, sans-serif" font-size="11" fill="#666">出来高: 1,234,567株</text>
        <text x="630" y="205" font-family="Arial, sans-serif" font-size="11" fill="#666">時価総額: 1,250億円</text>
        
        <!-- 市場情報 -->
        <rect x="620" y="240" width="250" height="100" fill="#f8f9fa" stroke="#ddd" stroke-width="1" rx="8"/>
        <text x="630" y="260" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#333">市場情報</text>
        <text x="630" y="280" font-family="Arial, sans-serif" font-size="11" fill="#666">• 日経平均: +1.2% (38,920円)</text>
        <text x="630" y="295" font-family="Arial, sans-serif" font-size="11" fill="#666">• TOPIX: +0.8% (2,745pt)</text>
        <text x="630" y="310" font-family="Arial, sans-serif" font-size="11" fill="#666">• 業種別: 情報通信業 +2.1%</text>
        <text x="630" y="325" font-family="Arial, sans-serif" font-size="11" fill="#666">• 取引時間: ${now.toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit'})}</text>
        
        <!-- AI分析コメント -->
        <rect x="70" y="420" width="600" height="60" fill="#e3f2fd" stroke="#1976d2" stroke-width="1" rx="8"/>
        <text x="80" y="440" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="#1976d2">📊 AI分析レポート</text>
        <text x="80" y="455" font-family="Arial, sans-serif" font-size="11" fill="#333">強気継続シグナル発生中。移動平均線上抜けによる上昇トレンド確認。</text>
        <text x="80" y="470" font-family="Arial, sans-serif" font-size="11" fill="#333">目標価格: ${Math.round(currentPrice * 1.15).toLocaleString()}円 (推奨アクション: 買い増し)</text>
      </svg>
    `;
    
  } catch (error) {
    console.error('チャート画像生成エラー:', error);
    // エラーの場合はデフォルト画像パスを返す
    return '/uploads/default_chart.svg';
  }
}

// サンプルデータを生成する関数
async function generateSampleData(db: ReturnType<typeof Database.getInstance>): Promise<void> {
  try {
    console.log('サンプルデータ生成を開始します...');
    
    // チャート画像を生成
    const chartImagePath = await generateSampleChartImage();
    
    // サンプル投稿データ
    const samplePosts = [
      {
        title: "【AI分析】注目銘柄の買い時シグナル発生",
        content: `本日のAI分析により、以下の銘柄で買い時シグナルが発生しました。

🔸 サンプル株式会社（1234）
・現在値: 2,450円（+5.2%）
・目標株価: 2,800円
・推奨アクション: 強気

📊 テクニカル分析
・移動平均線: ゴールデンクロス形成
・RSI: 60.5（適正範囲）
・MACD: 買いシグナル継続

💡 投資判断の根拠
✅ 四半期決算が市場予想を上回る
✅ 新製品発表による業績向上期待
✅ 業界全体の成長トレンド

⚠️ リスク要因
・為替変動の影響
・原材料価格の上昇
・競合他社の動向

📈 チャート分析
添付のチャートをご確認ください。明確な上昇トレンドが継続しています。

#株式投資 #AI分析 #買い時シグナル #テクニカル分析`,
        accept: 0,
        site: 999,
        created_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
      },
      {
        title: "市場急落時の対応戦略｜AIが推奨する銘柄選定",
        content: `市場全体が下落局面に入った際の投資戦略をAIが分析しました。

📉 現在の市場状況
・日経平均: -2.1%
・TOPIX: -1.8%
・マザーズ: -3.5%

🎯 推奨戦略
1️⃣ ディフェンシブ銘柄への資金移動
2️⃣ 高配当株の積極的な買い増し
3️⃣ 成長株の押し目買い機会

💎 注目ディフェンシブ銘柄
・公益株（電力・ガス）
・食品・生活必需品
・医薬品関連

📊 AIスコアリング結果
安定性: 85/100
成長性: 72/100
配当利回り: 3.8%

🔍 市場回復の兆候
・海外市場の反発
・金利動向の安定化
・企業業績の底堅さ

今回の調整は一時的なものと予想されます。中長期的な視点での投資継続を推奨します。

#市場分析 #ディフェンシブ投資 #AI投資戦略`,
        accept: 0,
        site: 999,
        created_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
      },
      {
        title: "週間パフォーマンス｜AI予測の的中率95%達成",
        content: `今週のAI予測結果をご報告いたします。

📈 今週の成績
・予測的中率: 95.2%
・推奨銘柄平均リターン: +8.7%
・ベンチマーク超過リターン: +3.1%

🏆 今週のベスト銘柄
1. テクノロジー株A: +15.3%
2. バイオ関連株B: +12.8%
3. 再生エネルギー株C: +10.2%

📊 セクター別パフォーマンス
・テクノロジー: +12.1%
・ヘルスケア: +8.9%
・金融: +4.2%
・不動産: +2.1%

🔮 来週の予測
AIモデルによる来週の市場予測:
・上昇確率: 78%
・予想変動率: ±2.5%
・注目テーマ: AI関連、環境技術

💡 投資家へのアドバイス
✅ ポートフォリオの定期的な見直し
✅ リスク分散の徹底
✅ 長期投資視点の維持

詳細な分析レポートは添付チャートをご参照ください。

#週間レポート #AI予測 #投資成績 #ポートフォリオ管理`,
        accept: 0,
        site: 999,
        created_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
      }
    ];

    // 投稿データを挿入
    for (const post of samplePosts) {
      try {
        // postテーブルに挿入
        const insertQuery = `
          INSERT INTO post (title, content, accept, site, created_at) 
          VALUES (?, ?, ?, ?, ?)
        `;
        const postId = await db.insert(insertQuery, [
          post.title,
          post.content,
          post.accept,
          post.site,
          post.created_at
        ]);

        // post_codeテーブルにチャート画像パスを挿入
        const codeInsertQuery = `
          INSERT INTO post_code (post_id, code) 
          VALUES (?, ?)
        `;
        await db.insert(codeInsertQuery, [postId, chartImagePath]);

        console.log(`サンプル投稿を挿入しました - ID: ${postId}, タイトル: ${post.title}`);
      } catch (error) {
        console.error('投稿挿入エラー:', error);
      }
    }

    console.log('サンプルデータ生成が完了しました');
    
  } catch (error) {
    console.error('サンプルデータ生成エラー:', error);
    throw error;
  }
}