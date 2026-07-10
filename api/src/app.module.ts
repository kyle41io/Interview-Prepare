import { Module } from "@nestjs/common";
import { AppConfigModule } from "./config/config.module";
import { DynamoModule } from "./db/dynamo.module";
import { HealthController } from "./health/health.controller";
@Module({ imports: [AppConfigModule, DynamoModule], controllers: [HealthController] })
export class AppModule {}
