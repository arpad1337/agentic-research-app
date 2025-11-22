import {
  IRoute,
  IRouteFactory,
  ILoggerInstance,
  ProviderDefinitionType,
  IDatabaseConfig,
  CacheProvider,
  ICacheConfig,
  LoggerAccessor,
  DatabaseProvider,
  ApplicationEvents,
  NativeMiddleware,
  Cryptography,
  ICryptographyConfig,
  LogLevel,
} from "@greeneyesai/api-utils";
import * as BodyParserMiddleware from "body-parser";
import { AgenticResearchAppAPIApplication } from "./lib/agentic-research-app";
import { CommonModule, PublicModule } from "./modules";
import { Config } from "./lib/config";
import {
  DatabaseSynchronizer,
  IDatabaseSynchronizerConfig,
} from "./lib/providers/database-synchronizer";

const logger: ILoggerInstance =
  Config.ApplicationConfig.ENV === "development"
    ? LoggerAccessor.setLogLevel(LogLevel.DEBUG).consoleLogger
    : LoggerAccessor.logger;

export async function createApp(): Promise<AgenticResearchAppAPIApplication> {
  try {
    const routeFactory: IRouteFactory = {
      create(): IRoute[] {
        const commonRoutes = CommonModule.createRoutes();
        const publicRoutes = PublicModule.createRoutes();
        logger.info(`Routes created successfully.`);
        return [...commonRoutes, ...publicRoutes];
      },
    };

    const databaseProviderDefinition: ProviderDefinitionType<
      DatabaseProvider,
      IDatabaseConfig
    > = {
      class: DatabaseProvider,
      config: Config.DatabaseConfig,
    };

    const cacheProviderDefinition: ProviderDefinitionType<
      CacheProvider,
      ICacheConfig
    > = {
      class: CacheProvider,
      config: Config.CacheConfig,
    };

    const cryptographyDefinition: ProviderDefinitionType<
      Cryptography,
      ICryptographyConfig
    > = {
      class: Cryptography,
      config: Config.EncryptionConfig,
    };

    const databaseSynchronizerDefinition: ProviderDefinitionType<
      DatabaseSynchronizer,
      IDatabaseSynchronizerConfig
    > = {
      class: DatabaseSynchronizer,
      config: ["user"],
    };

    const providers: ProviderDefinitionType<any, any>[] = [
      databaseProviderDefinition,
      cacheProviderDefinition,
      cryptographyDefinition,
      databaseSynchronizerDefinition,
    ];

    const bodyParserMiddleware: NativeMiddleware = BodyParserMiddleware.json({
      limit: "32mb",
    });

    logger.info(
      `[START] Running release version "${Config.ApplicationConfig.commitSHA}"`,
      {
        token: AgenticResearchAppAPIApplication.ApplicationName,
      }
    );

    const app: AgenticResearchAppAPIApplication =
      new AgenticResearchAppAPIApplication(Config.ApplicationConfig.port)
        .attachToContext(process)
        .setLoggerInterface(logger)
        .addNativeMiddleware(bodyParserMiddleware);

    if (!process.env.CI) {
      app.configureProviders(providers);
    } else {
      cryptographyDefinition.class.instance.configure(Config.EncryptionConfig);
    }

    app.mountRoutes(routeFactory);

    // REMIX
    await app.enableStaticServer();

    app.once(
      ApplicationEvents.Closing,
      (_app: AgenticResearchAppAPIApplication) => {
        logger.info(
          `[END] Terminating release version "${Config.ApplicationConfig.commitSHA}"`,
          {
            token: AgenticResearchAppAPIApplication.ApplicationName,
          }
        );
      }
    );
    return app;
  } catch (e) {
    throw e;
  }
}

export async function main() {
  try {
    const app = await createApp();
    await app.listen();
  } catch (e) {
    logger.error(e, () => process.exit(1));
  }
}
