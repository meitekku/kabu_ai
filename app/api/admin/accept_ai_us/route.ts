import { Database } from '@/lib/database/Mysql';
import { NextRequest } from 'next/server';
import { RowDataPacket } from 'mysql2';

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

export async function POST(request: NextRequest) {
  try {
    const operation: DatabaseOperation<NewsItem> = await request.json();
    const db = Database.getInstance();

    switch (operation.type) {
      case 'select': {
        if (Array.isArray(operation.data) && operation.table) {
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
          const conditionParts: string[] = [];

          // US記事のみ: site IN (80, 81)
          if (operation.table === 'post' && operation.data.includes('code')) {
            conditionParts.push(`p.site IN (?, ?)`);
          } else {
            conditionParts.push(`site IN (?, ?)`);
          }
          params.push(80, 81);

          // accept=0 (未承認のみ)
          if (operation.conditions) {
            for (const [key, value] of Object.entries(operation.conditions)) {
              if (operation.table === 'post' && operation.data.includes('code')) {
                conditionParts.push(`p.${key} = ?`);
              } else {
                conditionParts.push(`${key} = ?`);
              }
              params.push(value);
            }
          }

          // 24時間ウィンドウ
          if (operation.table === 'post' && operation.data.includes('code')) {
            conditionParts.push(`p.created_at >= NOW() - INTERVAL 24 HOUR`);
          } else {
            conditionParts.push(`created_at >= NOW() - INTERVAL 24 HOUR`);
          }

          query += ' WHERE ' + conditionParts.join(' AND ');

          if (operation.table === 'post' && operation.data.includes('code')) {
            query += ' ORDER BY p.created_at DESC LIMIT 50';
          } else {
            query += ' ORDER BY created_at DESC LIMIT 50';
          }

          const results = await db.select<NewsItem>(query, params);

          return Response.json({
            success: true,
            data: results
          } as DatabaseResponse<NewsItem[]>);
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
    console.error('US Database operation error:', error);
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'データベース操作中にエラーが発生しました'
      } as DatabaseResponse<never>,
      { status: 500 }
    );
  }
}
