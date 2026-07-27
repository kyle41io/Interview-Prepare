import { Module } from "@nestjs/common";
import { AppConfigModule } from "../config/config.module";
import { DynamoModule } from "../db/dynamo.module";
import { ProgressModule } from "../progress/progress.module";
import { HealthController } from "../health/health.controller";
import { createHandler } from "./bootstrap";

@Module({ imports: [AppConfigModule, DynamoModule, ProgressModule], controllers: [HealthController] })
class ProgressLambdaModule {}

export const handler = createHandler(ProgressLambdaModule);
