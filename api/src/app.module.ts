import { Module } from "@nestjs/common";
import { AppConfigModule } from "./config/config.module";
import { DynamoModule } from "./db/dynamo.module";
import { HealthController } from "./health/health.controller";
import { ProgressModule } from "./progress/progress.module";
import { BillingModule } from "./billing/billing.module";
@Module({ imports: [AppConfigModule, DynamoModule, ProgressModule, BillingModule], controllers: [HealthController] })
export class AppModule {}
