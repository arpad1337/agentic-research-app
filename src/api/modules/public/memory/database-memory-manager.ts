import {
  DatabaseProvider,
  Singleton,
  SingletonClassType,
} from "@greeneyesai/api-utils";
import {
  MemoryModelType,
  MemoryModelTypeStatic,
} from "../../../lib/models/memory";

export class DatabaseMemoryManager extends Singleton {
  public static get Dependencies(): [SingletonClassType<DatabaseProvider>] {
    return [DatabaseProvider];
  }

  protected model: MemoryModelTypeStatic;

  constructor(protected databaseProvider: DatabaseProvider) {
    super();
    this.model = this.databaseProvider.getModelByName("memory")!;
  }

  async store(
    userId: number,
    userMessage: string,
    assistantMessage: string,
    embedding: number[],
    hidden: boolean = false
  ): Promise<MemoryModelType> {
    return await this.model.createWithContentAndResponseAndEmbedding(
      userId,
      userMessage,
      assistantMessage,
      embedding,
      hidden
    );
  }

  async query(
    userId: number,
    embedding: number[],
    limit: number = 5
  ): Promise<MemoryModelType[]> {
    return await this.model.getResultsByEmbedding(userId, embedding, limit);
  }
}
