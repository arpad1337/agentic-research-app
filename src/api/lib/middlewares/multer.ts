import { Middleware, NativeMiddleware } from "@greeneyesai/api-utils";
import { Request, Response, NextFunction } from "express";
import multer, { Multer } from "multer";

export type RequestWithFile = Request & { file?: Multer.File };

export class MulterMiddleware extends Middleware {
  public static create(): MulterMiddleware {
    const multerMiddleware = multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 50 * 1024 * 1024,
      },
    }).single("file");

    return new this(multerMiddleware);
  }

  protected constructor(protected _wrappedMiddleware: NativeMiddleware) {
    super();
  }

  public handle(req: Request, res: Response, next: NextFunction) {
    return this._wrappedMiddleware(req, res, next);
  }
}
