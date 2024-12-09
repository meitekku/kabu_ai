import mysql, { Pool, PoolConnection, ResultSetHeader, RowDataPacket, OkPacket } from 'mysql2/promise';

export type SqlValue = string | number | boolean | null | Date;
export interface DatabaseRecord {
  [key: string]: SqlValue;
}

export interface QueryCondition {
  [key: string]: SqlValue;
}

export interface DatabaseOperation {
  type: 'select' | 'insert' | 'update' | 'delete' | 'raw';
  table?: string;
  data?: DatabaseRecord | string[];
  conditions?: QueryCondition;
  sql?: string;
  params?: SqlValue[];
}

export interface DatabaseConfig {
  host: string;
  database: string;
  user: string;
  password: string;
  port?: number;
  connectionLimit?: number;
}

export type QueryResult<T> = T extends RowDataPacket[] ? T :
  T extends ResultSetHeader ? T :
  T extends OkPacket ? T :
  never;

export class DatabaseService {
  private pool: Pool;
  private static instance: DatabaseService;

  private constructor(config: DatabaseConfig) {
    this.pool = mysql.createPool({
      host: config.host,
      database: config.database,
      user: config.user,
      password: config.password,
      port: config.port || 3306,
      waitForConnections: true,
      connectionLimit: config.connectionLimit || 10,
      queueLimit: 0
    });
  }

  public static getInstance(config?: DatabaseConfig): DatabaseService {
    if (!DatabaseService.instance && config) {
      DatabaseService.instance = new DatabaseService(config);
    }
    return DatabaseService.instance;
  }

  public async testConnection(): Promise<boolean> {
    try {
      const connection = await this.pool.getConnection();
      connection.release();
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }

  public async executeOperation<T extends RowDataPacket[] | ResultSetHeader | OkPacket>(
    operation: DatabaseOperation
  ): Promise<QueryResult<T>> {
    try {
      this.validateOperation(operation);
      const params: SqlValue[] = [];
      let query: string;

      switch (operation.type) {
        case 'raw':
          if (!operation.sql) throw new Error('SQL query is required for raw operation');
          return await this.executeRawQuery<T>(operation.sql, operation.params || []);

        case 'select':
          if (!operation.table) throw new Error('Table name is required');
          query = this.buildSelectQuery(
            operation.table,
            operation.data as string[],
            operation.conditions,
            params
          );
          break;

        case 'insert':
          if (!operation.table) throw new Error('Table name is required');
          query = this.buildInsertQuery(
            operation.table,
            operation.data as DatabaseRecord,
            params
          );
          break;

        case 'update':
          if (!operation.table) throw new Error('Table name is required');
          query = this.buildUpdateQuery(
            operation.table,
            operation.data as DatabaseRecord,
            operation.conditions,
            params
          );
          break;

        case 'delete':
          if (!operation.table) throw new Error('Table name is required');
          query = this.buildDeleteQuery(
            operation.table,
            operation.conditions,
            params
          );
          break;

        default:
          throw new Error('Invalid operation type');
      }

      return await this.executeQuery<T>(query, params);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private async executeQuery<T extends RowDataPacket[] | ResultSetHeader | OkPacket>(
    query: string,
    params: SqlValue[]
  ): Promise<QueryResult<T>> {
    const [rows] = await this.pool.execute<T>(query, params);
    return rows as QueryResult<T>;
  }

  public async executeRawQuery<T extends RowDataPacket[] | ResultSetHeader | OkPacket>(
    sql: string,
    params: SqlValue[] = []
  ): Promise<QueryResult<T>> {
    try {
      const [rows] = await this.pool.execute<T>(sql, params);
      return rows as QueryResult<T>;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  public async executeTransaction<T>(
    callback: (connection: PoolConnection) => Promise<T>
  ): Promise<T> {
    const connection = await this.pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw this.handleError(error);
    } finally {
      connection.release();
    }
  }

  private validateOperation(operation: DatabaseOperation): void {
    if (operation.type !== 'raw' && !operation.table) {
      throw new Error('Table name is required');
    }

    if (operation.type === 'insert' && !operation.data) {
      throw new Error('Data is required for insert operation');
    }

    if (operation.type === 'update' && (!operation.data || !operation.conditions)) {
      throw new Error('Data and conditions are required for update operation');
    }

    if (operation.type === 'raw' && !operation.sql) {
      throw new Error('SQL query is required for raw operation');
    }
  }

  private buildSelectQuery(
    table: string,
    columns: string[] = ['*'],
    conditions?: QueryCondition,
    params: SqlValue[] = []
  ): string {
    const cols = columns.join(', ');
    let query = `SELECT ${cols} FROM ${table}`;

    if (conditions && Object.keys(conditions).length > 0) {
      const whereClause = Object.entries(conditions)
        .map(([key]) => `${key} = ?`)
        .join(' AND ');
      Object.values(conditions).forEach(value => params.push(value));
      query += ` WHERE ${whereClause}`;
    }

    return query;
  }

  private buildInsertQuery(
    table: string,
    data: DatabaseRecord,
    params: SqlValue[]
  ): string {
    const columns = Object.keys(data);
    const values = Object.values(data);
    
    values.forEach(value => params.push(value));
    const placeholders = new Array(values.length).fill('?').join(', ');

    return `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
  }

  private buildUpdateQuery(
    table: string,
    data: DatabaseRecord,
    conditions: QueryCondition | undefined,
    params: SqlValue[]
  ): string {
    const setClause = Object.entries(data)
      .map(([key]) => `${key} = ?`)
      .join(', ');
    Object.values(data).forEach(value => params.push(value));

    let query = `UPDATE ${table} SET ${setClause}`;

    if (conditions && Object.keys(conditions).length > 0) {
      const whereClause = Object.entries(conditions)
        .map(([key]) => `${key} = ?`)
        .join(' AND ');
      Object.values(conditions).forEach(value => params.push(value));
      query += ` WHERE ${whereClause}`;
    }

    return query;
  }

  private buildDeleteQuery(
    table: string,
    conditions: QueryCondition | undefined,
    params: SqlValue[]
  ): string {
    let query = `DELETE FROM ${table}`;

    if (conditions && Object.keys(conditions).length > 0) {
      const whereClause = Object.entries(conditions)
        .map(([key]) => `${key} = ?`)
        .join(' AND ');
      Object.values(conditions).forEach(value => params.push(value));
      query += ` WHERE ${whereClause}`;
    }

    return query;
  }

  private handleError(error: unknown): Error {
    console.error('Database operation error:', error);
    if (error instanceof Error) {
      return error;
    }
    return new Error('Internal database error');
  }
}