import { NestFactory } from "@nestjs/core";
import { Module } from "@nestjs/common";
import type { Handler } from "aws-lambda";
import { AppConfigModule } from "../config/config.module";
import { DynamoModule } from "../db/dynamo.module";
import { InboxModule } from "../inbox/inbox.module";
import { ScanService } from "../inbox/scan.service";
import { hydrateSecretsFromSsm } from "./secrets";

// This entrypoint boots its own isolated Nest application context (no HTTP
// adapter, no serverless-express). @Global() modules only propagate within a
// single bootstrapped graph, so AppConfigModule and DynamoModule — both
// transitive dependencies of ScanService via InboxModule — must be imported
// here explicitly, same as the HTTP lambdas do in bootstrap.ts consumers.
@Module({ imports: [AppConfigModule, DynamoModule, InboxModule] })
class GmailScanModule {}

let ctx: Awaited<ReturnType<typeof NestFactory.createApplicationContext>> | undefined;

export const handler: Handler = async () => {
  if (!ctx) {
    // Same SSM secret hydration as the HTTP lambdas (bootstrap.ts): must run
    // before the Nest context — and its ConfigModule — initializes.
    await hydrateSecretsFromSsm();
    ctx = await NestFactory.createApplicationContext(GmailScanModule, {
      logger: ["error", "warn"],
    });
  }
  const scan = ctx.get(ScanService, { strict: false });
  const result = await scan.scanAll();
  return { ok: true, ...result };
};
