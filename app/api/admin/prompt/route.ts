import { Database } from '@/lib/database/Mysql';
import { NextRequest } from 'next/server';
import { RowDataPacket } from 'mysql2';

interface BaseRecord extends RowDataPacket {
  id: number;
}

interface PromptItem extends BaseRecord {
  prompt: string;
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
    const operation: DatabaseOperation<PromptItem> = await request.json();
    const db = Database.getInstance();

    switch (operation.type) {
      case 'select': {
        if (Array.isArray(operation.data) && operation.table) {
          const fields = operation.data.join(', ');
          let query = `SELECT ${fields} FROM ${operation.table}`;
          const params: (string | number | boolean | null)[] = [];
          
          if (operation.conditions) {
            const conditions = Object.entries(operation.conditions);
            const whereClause = conditions
              .map(([key]) => `${key} = ?`)
              .join(' AND ');
            query += ' WHERE ' + whereClause;
            params.push(...Object.values(operation.conditions));
          }

          const results = await db.select<PromptItem>(query, params);
          return Response.json({ 
            success: true, 
            data: results 
          } as DatabaseResponse<PromptItem[]>);
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