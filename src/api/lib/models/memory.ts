import { BIGINT, BOOLEAN, JSON, TEXT } from "sequelize";
import {
  DatabaseModelError,
  IParanoidAttributes,
  ITimestampsAttributes,
  Model,
  ModelStatic,
  ISchema,
  ModelTraitStatic,
  DatabaseProvider,
  ModelDefinition,
  DatabaseModelHelper,
  ModelTrait,
} from "@greeneyesai/api-utils";

export class MemoryModelError extends DatabaseModelError<MemoryModelTypeStatic> {}

export const TABLE_NAME = "memory";

export const TABLE_FIELDS = {
  id: {
    type: BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    field: "user_id",
    type: BIGINT,
    allowNull: false,
  },
  content: {
    type: TEXT,
    allowNull: false,
  },
  response: {
    type: TEXT,
    allowNull: false,
  },
  embedding: {
    type: JSON,
    allowNull: true,
    get(this: MemoryModelType) {
      const value = this.getDataValue("embedding");
      return value ? (value as number[]) : null;
    },
  },
  hidden: {
    type: BOOLEAN,
    defaultValue: false,
    allowNull: false,
  }
};

export interface IMemory
  extends ISchema,
    IParanoidAttributes,
    ITimestampsAttributes {
  objectId?: number;
  userId: number;
  content: string;
  response: string;
  embedding: number[] | null;
}

export interface IMemoryPublicView {
  content: string;
  response: string;
  createdAt: string;
}

export type ViewsTraitType = ModelTrait<
  IMemory,
  {
    getPublicView(): IMemoryPublicView;
  }
>;

export type StaticHelpersTraitType = ModelTraitStatic<
  IMemory,
  {
    createWithContentAndResponseAndEmbedding(
      this: MemoryModelTypeStatic,
      userId: number,
      content: string,
      response: string,
      embedding: number[] | null,
      hidden: boolean,
    ): Promise<MemoryModelType>;
    getResultsByEmbedding(
      this: MemoryModelTypeStatic,
      userId: number,
      embedding: number[] | null,
      limit: number | undefined
    ): Promise<MemoryModelType[]>;
  }
>;

export const ViewsTrait: ViewsTraitType = {
  getPublicView: function (): IMemoryPublicView {
    const json = DatabaseModelHelper.PATCHED_GETTER(this);
    delete json.objectId;
    delete json.userId;
    delete json.embedding;
    delete json.deletedAt;
    return json;
  },
};

export type MemoryModelType = Model<IMemory> & ViewsTraitType;

export type MemoryModelTypeStatic = ModelStatic<MemoryModelType> &
  StaticHelpersTraitType;

export function factory(
  databaseProvider: DatabaseProvider
): MemoryModelTypeStatic {
  const model: ModelDefinition = DatabaseModelHelper.buildModel(
    // Table name
    TABLE_NAME,
    // Schema
    TABLE_FIELDS,
    // Traits
    [
      DatabaseModelHelper.PARANOID_MODEL_SETTINGS, // deletedAt
      DatabaseModelHelper.TIMESTAMPS_SETTINGS, // createdAt / updatedAt
    ]
  );

  const MemoryModel: ModelStatic<Model<IMemory>> =
    databaseProvider.connection!.define("Memory", model.schema, model.settings);

  const StaticHelpersTrait: StaticHelpersTraitType = {
    createWithContentAndResponseAndEmbedding: async function (
      userId: number,
      content: string,
      response: string,
      embedding: number[] | null,
      hidden: boolean = false,
    ): Promise<MemoryModelType> {
      return this.create({
        userId,
        content,
        response,
        embedding,
        hidden,
      });
    },
    getResultsByEmbedding: async function (
      userId: number,
      embedding: number[] | null,
      limit: number = 5
    ): Promise<MemoryModelType[]> {
      if (!embedding) {
        return [];
      }

      const sql = `
        SELECT *
        FROM memory
        WHERE user_id = $1
        ORDER BY embedding <-> '[${embedding!.toString()}]'
        LIMIT $2;
      `;

      const results = await this.sequelize!.query(sql, {
        bind: [userId, limit],
        model: MemoryModel as MemoryModelTypeStatic,
        mapToModel: true,
      });

      return results ? results : [];
    },
  };

  DatabaseModelHelper.attachTraitToModel(MemoryModel, ViewsTrait);
  DatabaseModelHelper.attachTraitToModelStatic(MemoryModel, StaticHelpersTrait);

  return MemoryModel as MemoryModelTypeStatic;
}
