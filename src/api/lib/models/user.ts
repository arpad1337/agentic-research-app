import { BIGINT, STRING } from "sequelize";
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
import * as yup from "yup";

export class UserModelError extends DatabaseModelError<UserModelTypeStatic> {}

export const TABLE_NAME = "user";

export const TABLE_FIELDS = {
  objectId: {
    field: "object_id",
    type: BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  id: {
    type: STRING(36),
    allowNull: false,
    validate: {
      isUUID: 4,
    },
  },
  username: {
    type: STRING(256),
    allowNull: false,
  },
  personality: {
    type: STRING(256),
    allowNull: false,
  },
};

export interface IUser
  extends ISchema,
    IParanoidAttributes,
    ITimestampsAttributes {
  objectId?: number;
  id: string;
  username: string;
  personality: string;
}

export interface IUserPublicView {
  id: string;
  email: string;
  username: string;
  personality: string;
}

export type ViewsTraitType = ModelTrait<
  IUser,
  {
    getPublicView(): IUserPublicView;
  }
>;

export type StaticHelpersTraitType = ModelTraitStatic<
  IUser,
  {
    createWithUsernameAndPersonality(
      this: UserModelTypeStatic,
      username: string,
      personality: string
    ): Promise<UserModelType>;
  }
>;

export type UserModelType = Model<IUser> & ViewsTraitType;

export type UserModelTypeStatic = ModelStatic<UserModelType> &
  StaticHelpersTraitType;

export const StaticHelpersTrait: StaticHelpersTraitType = {
  createWithUsernameAndPersonality: async function (
    username: string,
    personality: string
  ): Promise<UserModelType> {
    await yup
      .string()
      .min(1)
      .max(256)
      .required("Username missing")
      .validate(username, { strict: true });

    return this.create({
      id: crypto.randomUUID(),
      username,
      personality,
    });
  },
};

export const ViewsTrait: ViewsTraitType = {
  getPublicView: function (): IUserPublicView {
    const json = DatabaseModelHelper.PATCHED_GETTER(this);
    delete json.objectId;
    delete json.deletedAt;
    return json;
  },
};

export function factory(
  databaseProvider: DatabaseProvider
): UserModelTypeStatic {
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

  const UserModel: ModelStatic<Model<IUser>> =
    databaseProvider.connection!.define("User", model.schema, model.settings);

  DatabaseModelHelper.attachTraitToModel(UserModel, ViewsTrait);
  DatabaseModelHelper.attachTraitToModelStatic(UserModel, StaticHelpersTrait);

  return UserModel as UserModelTypeStatic;
}
