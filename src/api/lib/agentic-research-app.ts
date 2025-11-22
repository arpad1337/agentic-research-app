import {
  Application,
  ApplicationEvents,
  ExecutionContext,
  ILoggerInstance,
  ProviderDefinitionType,
  IRouteFactory,
  StoreProvider,
  StoreProviderEvents,
} from "@greeneyesai/api-utils";
import { createRequestHandler } from "@remix-run/express";
import { ServerBuild } from "@remix-run/node";
import { once } from "events";
import * as express from "express";

const path = require("path");
const appDir = path.dirname(require.main!.filename);

export class AgenticResearchAppAPIApplication extends Application {
  public static get ApplicationName() {
    return "AgenticResearchAppAPI";
  }

  public ApplicationName() {
    return AgenticResearchAppAPIApplication.ApplicationName;
  }

  public allowCors(): this {
    this.app.disable("trust proxy");
    return super.allowCors();
  }

  public setLoggerInterface(loggerInstance: ILoggerInstance): this {
    return super
      .setLoggerInterface(loggerInstance)
      .bindHandlerToContextEvents(
        ["uncaughtException", "unhandledRejection"],
        (
          _app: AgenticResearchAppAPIApplication,
          _context: ExecutionContext,
          err: Error
        ) => {
          _app.logger?.error(err, {
            token: AgenticResearchAppAPIApplication.ApplicationName,
          });
        }
      )
      .once(
        ApplicationEvents.Closed,
        (_app: AgenticResearchAppAPIApplication) => {
          _app.getLoggerInterface()?.info(`Application closed.`, {
            token: AgenticResearchAppAPIApplication.ApplicationName,
          });
          _app.logger?.onExit && _app.logger?.onExit();
          !!_app.getContext() &&
            _app.getContext()!.exit &&
            _app.getContext()!.exit!();
        }
      )
      .bindHandlerToContextEvents(
        ["SIGTERM", "SIGUSR2"],
        (_app: AgenticResearchAppAPIApplication) => {
          _app.logger?.debug(`Received SIGTERM...`, {
            token: AgenticResearchAppAPIApplication.ApplicationName,
          });
          _app.notify("sigtermFromOS").close();
        }
      )
      .disableApplicationSignature()
      .allowCors();
  }

  public async enableStaticServer() {
    const app = this.app;

    app.use(express.static(path.resolve(appDir, "../../build/client")));

    // @ts-ignore
    const build = await import(path.resolve(appDir, "../../build/server/index.mjs"));

    app.all("*", createRequestHandler({ build }));

    return this.addErrorHandlers();
  }

  protected addErrorHandlers() {
    return this.addRouteNotFoundHandler().addDefaultErrorHandler([
      "SequelizeDatabaseError",
      "DataCloneError",
      "connect ECONNREFUSED" /* Axios */,
      "StoreProviderError",
    ]);
  }

  public mountRoutes(factory: IRouteFactory): this {
    return super
      .mountRoutes(factory)
      .once(
        ApplicationEvents.Listening,
        (_app: AgenticResearchAppAPIApplication) => {
          _app.logger?.info(`Application launched on port ${_app.getPort()}.`, {
            token: AgenticResearchAppAPIApplication.ApplicationName,
          });
        }
      );
  }

  public configureProviders(
    providers: ProviderDefinitionType<any, any>[]
  ): this {
    super.configureProviders(providers);
    (async (
      _app: AgenticResearchAppAPIApplication,
      _providers: ProviderDefinitionType<any, any>[]
    ) => {
      await Promise.all(
        _providers
          .filter(
            (providerDefinition: ProviderDefinitionType<any, any>): boolean =>
              providerDefinition.class.instance instanceof StoreProvider
          )
          .map(
            (
              providerDefinition: ProviderDefinitionType<
                StoreProvider<any>,
                any
              >
            ): Promise<void> =>
              once(
                providerDefinition.class.instance,
                StoreProviderEvents.Connected
              ) as unknown as Promise<void>
          )
      );
      _app.logger?.info(`Store providers connected.`, {
        token: AgenticResearchAppAPIApplication.ApplicationName,
      });
    })(this, providers);
    return this;
  }
}
