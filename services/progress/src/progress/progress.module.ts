import { Module } from "@nestjs/common";
import { AuthModule } from "@ip/auth";
import { ProgressService } from "./progress.service";
import { ProgressController, SettingsController } from "./progress.controller";

@Module({
  imports: [AuthModule],
  controllers: [ProgressController, SettingsController],
  providers: [ProgressService],
})
export class ProgressModule {}
