import {
    MongoClient,
    Db,
    Collection,
    Filter,
    FindOptions,
    InsertOneResult,
    UpdateFilter,
    UpdateOptions,
    UpdateResult,
    DeleteResult,
    WithId,
    ClientSession,
    OptionalUnlessRequiredId,
  } from 'mongodb';
  
  /**
   * MongoDB データベース操作用クラス (シングルトンパターン)
   */
  export class MongoDatabase {
    private static instance: MongoDatabase;
    private client: MongoClient;
    private db: Db | null = null;
  
    private constructor() {
      this.client = new MongoClient(process.env.MONGODB_URI ?? '');
    }
  
    /**
     * シングルトンインスタンスを取得する
     */
    public static getInstance(): MongoDatabase {
      if (!MongoDatabase.instance) {
        MongoDatabase.instance = new MongoDatabase();
      }
      return MongoDatabase.instance;
    }
  
    /**
     * MongoDB に接続し、Db インスタンスを初期化する
     */
    public async connect(): Promise<void> {
      try {
        if (!this.db) {
          await this.client.connect();
          this.db = this.client.db(process.env.MONGODB_NAME);
          console.log('MongoDB connected');
        }
      } catch (error) {
        console.error('MongoDB connection error:', error);
        throw new Error(error instanceof Error ? error.message : 'Unknown error occurred');
      }
    }
  
    /**
     * 取得した Db インスタンスを返す
     */
    public getDb(): Db {
      if (!this.db) {
        throw new Error('Database not initialized. Call connect() first.');
      }
      return this.db;
    }
  
    /**
     * Collection インスタンスを取得する共通メソッド
     * @param collectionName - 対象のコレクション名
     */
    private getCollection<T extends object>(collectionName: string): Collection<T> {
      return this.getDb().collection<T>(collectionName);
    }
  
    /**
     * SELECT操作 (find)
     * @param collectionName - コレクション名
     * @param filter - 検索条件
     * @param options - 検索オプション
     * @returns ドキュメント配列 (必ず `_id` が付与される)
     */
    public async find<T extends object>(
      collectionName: string,
      filter: Filter<T> = {},
      options?: FindOptions<T>
    ): Promise<WithId<T>[]> {
      try {
        // find() の返り値型は WithId<T> ( = T & { _id: ObjectId } )
        const cursor = this.getCollection<T>(collectionName).find(filter, options);
        const results = await cursor.toArray(); // Promise<WithId<T>[]>
        return results;
      } catch (error) {
        console.error('Find error:', error);
        throw new Error(error instanceof Error ? error.message : 'Unknown error occurred');
      }
    }
  
    /**
     * INSERT操作 (insertOne)
     * @param collectionName - コレクション名
     * @param document - 挿入するドキュメント
     * @returns 挿入されたドキュメントの _id (string か null)
     */
    public async insert<T extends object>(
      collectionName: string,
      document: OptionalUnlessRequiredId<T>
    ): Promise<string | null> {
      try {
        const result: InsertOneResult<T> = await this.getCollection<T>(collectionName)
          .insertOne(document);
  
        // insertedId が undefined になり得る型定義なので、null 判定で返しておく
        return result.insertedId ? result.insertedId.toString() : null;
      } catch (error) {
        console.error('Insert error:', error);
        throw new Error(error instanceof Error ? error.message : 'Unknown error occurred');
      }
    }
  
    /**
     * UPDATE操作 (updateOne)
     * @returns 更新されたドキュメント数
     */
    public async update<T extends object>(
      collectionName: string,
      filter: Filter<T>,
      update: UpdateFilter<T>,
      options?: UpdateOptions
    ): Promise<number> {
      try {
        const result: UpdateResult = await this.getCollection<T>(collectionName)
          .updateOne(filter, update, options);
        return result.modifiedCount;
      } catch (error) {
        console.error('Update error:', error);
        throw new Error(error instanceof Error ? error.message : 'Unknown error occurred');
      }
    }
  
    /**
     * DELETE操作 (deleteOne)
     * @returns 削除されたドキュメント数
     */
    public async delete<T extends object>(
      collectionName: string,
      filter: Filter<T>
    ): Promise<number> {
      try {
        const result: DeleteResult = await this.getCollection<T>(collectionName)
          .deleteOne(filter);
        return result.deletedCount ?? 0;
      } catch (error) {
        console.error('Delete error:', error);
        throw new Error(error instanceof Error ? error.message : 'Unknown error occurred');
      }
    }
  
    /**
     * トランザクション実行
     */
    public async transaction<T>(callback: (session: ClientSession) => Promise<T>): Promise<T> {
      const session = this.client.startSession();
      session.startTransaction();
      try {
        const result = await callback(session);
        await session.commitTransaction();
        return result;
      } catch (error) {
        await session.abortTransaction();
        console.error('Transaction error:', error);
        throw new Error(error instanceof Error ? error.message : 'Unknown error occurred');
      } finally {
        await session.endSession();
      }
    }
  }