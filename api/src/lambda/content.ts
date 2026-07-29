import { Module } from "@nestjs/common";
import { AppConfigModule } from "../config/config.module";
import { ContentModule } from "../content/content.module";
import { HealthController } from "../health/health.controller";
import { createHandler } from "./bootstrap";

@Module({
  imports: [AppConfigModule, ContentModule],
  controllers: [HealthController],
})
class ContentLambdaModule {}

export const handler = createHandler(ContentLambdaModule);
