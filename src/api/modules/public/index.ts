import {
  CorsMiddleware,
  HttpMethod,
  IRoute,
  RouteBuilder,
  createRouteBuilder,
} from "@greeneyesai/api-utils";
import { LogRequestPathMiddleware } from "../../lib/middlewares/log-request-path";
import { RequestIpMiddleware } from "../../lib/middlewares/request-ip";
import { RateLimitingMiddleware } from "../../lib/middlewares/rate-limiting";
import { RequestIdExtendedMiddleware } from "../../lib/middlewares/request-id-extended";
import { PublicController } from "./controllers/public";
import { MulterMiddleware } from "../../lib/middlewares/multer";

export namespace PublicModule {
  export function createRoutes(): IRoute[] {
    const publicAPIRouteBuilder: RouteBuilder = createRouteBuilder("/api/v1", [
      new CorsMiddleware({
        wildcard: "*"
      }),
      new RequestIdExtendedMiddleware({
        headerName: "x-correlation-id",
        returnRequestToken: "correlationId",
      }),
      new LogRequestPathMiddleware(),
      RequestIpMiddleware.create(),
      RateLimitingMiddleware.create(),
    ]);

    const publicRoutes = [
      publicAPIRouteBuilder(
        "/user",
        HttpMethod.POST,
        PublicController,
        "createOrFetchUser",
        []
      ),
      publicAPIRouteBuilder(
        "/user/:id",
        HttpMethod.GET,
        PublicController,
        "getUserById",
        []
      ),
      publicAPIRouteBuilder(
        "/user/:id/live-feed",
        HttpMethod.GET,
        PublicController,
        "eventSourceForUser",
        []
      ),
      publicAPIRouteBuilder(
        "/user/:id",
        HttpMethod.POST,
        PublicController,
        "changePersonalityForUser",
        []
      ),
      publicAPIRouteBuilder(
        "/user/:id/chat",
        HttpMethod.GET,
        PublicController,
        "getMemoryForUser",
        []
      ),
      publicAPIRouteBuilder(
        "/user/:id/chat",
        HttpMethod.POST,
        PublicController,
        "promptByUser",
        []
      ),
      publicAPIRouteBuilder(
        "/user/:id/chat/file",
        HttpMethod.POST,
        PublicController,
        "uploadFileForUser",
        [MulterMiddleware.create()]
      ),
    ];

    return [...publicRoutes];
  }
}
