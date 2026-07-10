import { Module } from "@nestjs/common";
import { AppConfigModule } from "./config/config.module";
import { PrismaModule } from "./prisma/prisma.module";
import { HealthController } from "./health/health.controller";
@Module({ imports: [AppConfigModule, PrismaModule], controllers: [HealthController] })
export class AppModule {}
