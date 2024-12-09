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
          const fields = operation.data.join(', ');
          let query = `SELECT ${fields} FROM ${operation.table}`;
          const params: (string | number | boolean | null)[] = [];

          if (operation.conditions) {
            const conditions = Object.entries(operation.conditions);
            if (conditions.length > 0) {
              query += ' WHERE ' + conditions.map(([key]) => `${key} = ?`).join(' AND ');
              params.push(...Object.values(operation.conditions));
            }
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