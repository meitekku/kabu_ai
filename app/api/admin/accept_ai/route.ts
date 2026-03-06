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
            query = `SELECT ${fields} FROM ${operation.table} p LEFT JOIN post_code pc ON p.id = pc.post_id LEFT JOIN ranking_yahoo_post ryp ON pc.code = ryp.code`;
          } else {
            const fields = operation.data.join(', ');
            query = `SELECT ${fields} FROM ${operation.table}`;
          }
          const params: (string | number | boolean | null)[] = [];
          const conditionParts: string[] = [];

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

          // site=72の記事を除外
          if (operation.table === 'post') {
            if (operation.data.includes('code')) {
              conditionParts.push(`p.site != ?`);
            } else {
              conditionParts.push(`site != ?`);
            }
            params.push(72);
          }

          // 現在時刻を取得して、15:30以降かどうかで条件を切り替え
          const now = new Date();
          const currentHour = now.getHours();
          const currentMinute = now.getMinutes();

          if (currentHour > 15 || (currentHour === 15 && currentMinute >= 30)) {
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
            if (operation.table === 'post' && operation.data.includes('code')) {
              conditionParts.push(`DATE(p.created_at) = CURDATE()`);
            } else {
              conditionParts.push(`DATE(created_at) = CURDATE()`);
            }
          }

          if (conditionParts.length > 0) {
            query += ' WHERE ' + conditionParts.join(' AND ');
          }

          if (operation.table === 'post' && operation.data.includes('code')) {
            query += ' ORDER BY COALESCE(ryp.id, 99999) ASC, p.created_at ASC LIMIT 50';
          } else {
            query += ' ORDER BY created_at ASC LIMIT 50';
          }

          const results = await db.select<NewsItem>(query, params);

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
          const updateParams: (string | number | boolean | null)[] = [
            ...Object.values(operation.data),
            ...Object.values(operation.conditions)
          ];

          const affectedRows = await db.update(query, updateParams);
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
          const deleteParams = Object.values(operation.conditions) as (string | number | boolean | null)[];

          const affectedRows = await db.delete(query, deleteParams);
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
