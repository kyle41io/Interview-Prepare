import { Module } from "@nestjs/common";
import { AppConfigModule } from "@ip/config";
import { DynamoModule } from "@ip/dynamo";
import { HealthController } from "./health/health.controller";
import { ProgressModule } from "./progress/progress.module";

@Module({ imports: [AppConfigModule, DynamoModule, ProgressModule], controllers: [HealthController] })
export class ProgressAppModule {}
