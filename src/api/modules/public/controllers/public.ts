import {
  CacheProvider,
  CacheProviderWithProxiedClientType,
  Controller,
  ControllerError,
  DatabaseProvider,
  RedisClientType,
  ResponseFormatter,
  SingletonClassType,
  StoreProviderEvents,
} from "@greeneyesai/api-utils";
import { Request, Response, NextFunction } from "express";
import * as yup from "yup";
import { UserModelType, UserModelTypeStatic } from "../../../lib/models/user";
import { MemoryModelTypeStatic } from "../../../lib/models/memory";
import { GeminiAssistant } from "../assistants/gemini";
import { resolvePersonality } from "../personalities/resolver";
import { RequestWithFile } from "../../../lib/middlewares/multer";

export class PublicController extends Controller {
  public static get Dependencies(): [
    SingletonClassType<CacheProvider>,
    SingletonClassType<DatabaseProvider>,
    SingletonClassType<GeminiAssistant>
  ] {
    return [CacheProvider, DatabaseProvider, GeminiAssistant];
  }

  protected subscriberClient: RedisClientType | null = null;
  protected publisherClient: RedisClientType | null = null;

  constructor(
    protected cacheProvider: CacheProviderWithProxiedClientType,
    protected databaseProvider: DatabaseProvider,
    protected geminiAssistant: GeminiAssistant
  ) {
    super();
  }

  public async createOrFetchUser(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const schema: yup.Schema = yup.object({
        username: yup.string().min(1).max(256).required("Username missing"),
        personality: yup
          .string()
          .oneOf(["Charlie", "Tolkien", "Stewie", "Neutral"])
          .required("Personality missing"),
      });

      await schema.validate(req.body, { strict: true });

      const UserModel: UserModelTypeStatic =
        this.databaseProvider.getModelByName("user")!;

      let user: UserModelType | null = await UserModel.findOne({
        where: { username: req.body.username! as string },
      });

      if (!user) {
        user = await UserModel.createWithUsernameAndPersonality(
          req.body.username!,
          req.body.personality!
        );
      } else {
        user = await user.update({ personality: req.body.personality! })!;
      }

      res.json(new ResponseFormatter(user.getPublicView()).toResponse());
    } catch (e) {
      console.error(e);
      const err = (
        e instanceof ControllerError
          ? e
          : ControllerError.createFromError(e as Error)
      ).clone();
      return next(err);
    }
  }

  public async getUserById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = req.params.id;

      const UserModel: UserModelTypeStatic =
        this.databaseProvider.getModelByName("user")!;

      const user = await UserModel.findOne({
        where: { id },
      });

      if (!user) {
        const err = new ControllerError("User not found");
        res.status(404);
        res.json(new ResponseFormatter(err).toErrorResponse());
        return;
      }

      res.json(new ResponseFormatter(user.getPublicView()).toResponse());
    } catch (e) {
      const err = (
        e instanceof ControllerError
          ? e
          : ControllerError.createFromError(e as Error)
      ).clone();
      return next(err);
    }
  }

  public async changePersonalityForUser(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const schema: yup.Schema = yup.object({
        personality: yup
          .string()
          .oneOf(["Charlie", "Tolkien", "Stewie", "Neutral"])
          .required("Personality missing"),
      });

      await schema.validate(req.body, { strict: true });

      const id = req.params.id;

      const UserModel: UserModelTypeStatic =
        this.databaseProvider.getModelByName("user")!;

      const user = await UserModel.findOne({
        where: { id },
      });

      if (!user) {
        const err = new ControllerError("User not found");
        res.status(404);
        res.json(new ResponseFormatter(err).toErrorResponse());
        return;
      }

      await user.update({ personality: req.body.personality! });

      res.json(new ResponseFormatter(true).toResponse());
    } catch (e) {
      const err = (
        e instanceof ControllerError
          ? e
          : ControllerError.createFromError(e as Error)
      ).clone();
      return next(err);
    }
  }

  public async getMemoryForUser(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = req.params.id;

      const UserModel: UserModelTypeStatic =
        this.databaseProvider.getModelByName("user")!;

      const user = await UserModel.findOne({
        where: { id },
      });

      if (!user) {
        const err = new ControllerError("User not found");
        res.status(404);
        res.json(new ResponseFormatter(err).toErrorResponse());
        return;
      }

      const MemoryModel: MemoryModelTypeStatic =
        this.databaseProvider.getModelByName("memory")!;

      const entries = await MemoryModel.findAll({
        where: {
          userId: user.get("objectId")! as string,
          hidden: false,
        },
      });

      res.json(
        new ResponseFormatter(
          entries.map((e) => e.getPublicView())
        ).toResponse()
      );
    } catch (e) {
      const err = (
        e instanceof ControllerError
          ? e
          : ControllerError.createFromError(e as Error)
      ).clone();
      return next(err);
    }
  }

  public async promptByUser(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const schema: yup.Schema = yup.object({
        prompt: yup.string().min(1).required("Prompt missing"),
      });

      await schema.validate(req.body, { strict: true });

      const id = req.params.id;

      const UserModel: UserModelTypeStatic =
        this.databaseProvider.getModelByName("user")!;

      const user = await UserModel.findOne({
        where: { id },
      });

      if (!user) {
        const err = new ControllerError("User not found");
        res.status(404);
        res.json(new ResponseFormatter(err).toErrorResponse());
        return;
      }

      const result = await this.geminiAssistant.generate(
        user.get("objectId")! as number,
        req.body.prompt,
        {
          personality: resolvePersonality(user.get("personality")! as string),
          onData: (c) => this.processChunk(id, c),
        }
      );

      res.json(new ResponseFormatter(result).toResponse());
    } catch (e) {
      const err = (
        e instanceof ControllerError
          ? e
          : ControllerError.createFromError(e as Error)
      ).clone();
      return next(err);
    }
  }

  public async uploadFileForUser(
    req: RequestWithFile,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = req.params.id;

      const UserModel: UserModelTypeStatic =
        this.databaseProvider.getModelByName("user")!;

      const user = await UserModel.findOne({
        where: { id },
      });

      if (!user) {
        const err = new ControllerError("User not found");
        res.status(404);
        res.json(new ResponseFormatter(err).toErrorResponse());
        return;
      }

      const result = await this.geminiAssistant.addFileToMemoryAndSummarizeIt(
        user.get("objectId")! as number,
        req.file,
        {
          personality: resolvePersonality(user.get("personality")! as string),
          onData: (c) => this.processChunk(id, c),
        }
      );

      res.json(new ResponseFormatter(result).toResponse());
    } catch (e) {
      const err = (
        e instanceof ControllerError
          ? e
          : ControllerError.createFromError(e as Error)
      ).clone();
      return next(err);
    }
  }

  protected processChunk(userId: string, chunk: string): void {
    this.cacheProvider.publish!(`CHANNEL_${userId}`, chunk);
  }

  public async eventSourceForUser(
    req: RequestWithFile,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.params.userId;

      const headers = {
        "Content-Type": "text/event-stream",
        Connection: "keep-alive",
        "Cache-Control": "no-cache",
      };

      res.writeHead(200, headers);
      req.on("close", async () => {
        await this.cacheProvider!.unsubscribe!(`CHANNEL_${userId}`);
        res.end();
      });

      this.cacheProvider!.subscribe!(`CHANNEL_${userId}`, (event: string) => {
        const data = `data: ${event}\n\n`;
        res.write(data);
      });
    } catch (e) {
      const err = (
        e instanceof ControllerError
          ? e
          : ControllerError.createFromError(e as Error)
      ).clone();
      return next(err);
    }
  }
}
