// src/lib/database.ts
import mysql from 'mysql2/promise';
import { RowDataPacket, ResultSetHeader, FieldPacket } from 'mysql2';

export class Database {
  private static instance: Database;
  private pool: mysql.Pool;

  private constructor() {
    this.pool = mysql.createPool({
      host: '133.130.102.77',
      user: 'meiteko',
      password: '***REMOVED_DB_PASSWORD***',
      database: 'kabu_ai',
      port: parseInt(process.env.DB_PORT || '3306'),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  // SELECT操作
  async select<T extends RowDataPacket>(
    query: string,
    params?: Array<string | number | boolean | null>
  ): Promise<T[]> {
    try {
      const [rows] = await this.pool.execute<T[]>(query, params);
      return rows;
    } catch (error) {
      console.error('Select error:', error);
      throw new Error(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }

  // INSERT操作
  async insert(
    query: string,
    params?: Array<string | number | boolean | null>
  ): Promise<number> {
    try {
      const [result] = await this.pool.execute<ResultSetHeader>(query, params);
      return result.insertId;
    } catch (error) {
      console.error('Insert error:', error);
      throw new Error(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }

  // UPDATE操作
  async update(
    query: string,
    params?: Array<string | number | boolean | null>
  ): Promise<number> {
    try {
      const [result] = await this.pool.execute<ResultSetHeader>(query, params);
      return result.affectedRows;
    } catch (error) {
      console.error('Update error:', error);
      throw new Error(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }

  // DELETE操作
  async delete(
    query: string,
    params?: Array<string | number | boolean | null>
  ): Promise<number> {
    try {
      const [result] = await this.pool.execute<ResultSetHeader>(query, params);
      return result.affectedRows;
    } catch (error) {
      console.error('Delete error:', error);
      throw new Error(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }

  // カスタムSQLクエリの実行
  async query<T extends RowDataPacket>(
    query: string,
    params?: Array<string | number | boolean | null>
  ): Promise<[T[], FieldPacket[]]> {
    try {
      return await this.pool.execute<T[]>(query, params);
    } catch (error) {
      console.error('Query error:', error);
      throw new Error(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  }

  // トランザクション実行
  async transaction<T>(
    callback: (connection: mysql.Connection) => Promise<T>
  ): Promise<T> {
    const connection = await this.pool.getConnection();
    await connection.beginTransaction();

    try {
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw new Error(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      connection.release();
    }
  }
}