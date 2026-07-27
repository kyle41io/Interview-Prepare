import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Type } from "@nestjs/common";
import serverlessExpress from "@codegenie/serverless-express";
import type { Handler } from "aws-lambda";

/**
 * Builds a Lambda handler that lazily bootstraps a scoped Nest app on the
 * first (cold) invocation and caches it for warm reuse. CORS is handled at
 * the API Gateway layer, so it is not enabled here (avoids double headers).
 */
export function createHandler(rootModule: Type<unknown>): Handler {
  let cached: Handler | undefined;
  return async (event, context, callback) => {
    if (!cached) {
      const app = await NestFactory.create(rootModule, { logger: ["error", "warn"] });
      app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
      await app.init();
      const expressApp = app.getHttpAdapter().getInstance();
      cached = serverlessExpress({ app: expressApp });
    }
    return cached(event, context, callback);
  };
}
