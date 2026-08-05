import { NestFactory } from "@nestjs/core";
import type { Handler } from "aws-lambda";
import { hydrateSecretsFromSsm } from "@ip/config";
import { InboxAppModule } from "../app.module";
import { ScanService } from "../inbox/scan.service";

// This entrypoint boots its own isolated Nest application context (no HTTP
// adapter, no serverless-express). @Global() modules only propagate within a
// single bootstrapped graph, so AppConfigModule and DynamoModule — both
// transitive dependencies of ScanService via InboxModule — must be part of the
// graph bootstrapped here. InboxAppModule imports exactly those three modules,
// so this entrypoint shares it with the HTTP one instead of declaring its own
// identical copy.
let ctx: Awaited<ReturnType<typeof NestFactory.createApplicationContext>> | undefined;

// The scheduler sends an empty event. Invoking by hand with {"debug": true}
// returns a per-message trace of what the scanner saw and decided — the AWS
// replacement for the old `POST /gmail-scan?debug=1` Supabase function.
export const handler: Handler = async (event?: { debug?: boolean }) => {
  if (!ctx) {
    // Same SSM secret hydration as the HTTP lambdas (@ip/config's bootstrap):
    // must run before the Nest context — and its ConfigModule — initializes.
    await hydrateSecretsFromSsm();
    ctx = await NestFactory.createApplicationContext(InboxAppModule, {
      logger: ["error", "warn"],
    });
  }
  const scan = ctx.get(ScanService, { strict: false });
  const result = await scan.scanAll({ debug: !!event?.debug });
  return { ok: true, ...result };
};
