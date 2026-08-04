import { Module } from "@nestjs/common";
import { AppConfigModule } from "@ip/config";
import { ContentModule } from "./content/content.module";
import { HealthController } from "./health/health.controller";

@Module({
  imports: [AppConfigModule, ContentModule],
  controllers: [HealthController],
})
export class ContentAppModule {}
