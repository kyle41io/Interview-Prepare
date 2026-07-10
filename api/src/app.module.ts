import { Module } from "@nestjs/common";
import { AppConfigModule } from "./config/config.module";
import { DynamoModule } from "./db/dynamo.module";
import { HealthController } from "./health/health.controller";
import { ProgressModule } from "./progress/progress.module";
import { BillingModule } from "./billing/billing.module";
import { ProContentModule } from "./pro/pro.module";
@Module({ imports: [AppConfigModule, DynamoModule, ProgressModule, BillingModule, ProContentModule], controllers: [HealthController] })
export class AppModule {}
