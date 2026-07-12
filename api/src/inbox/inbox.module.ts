import { Module } from "@nestjs/common";
import { InboxService } from "./inbox.service";
import { NotificationsController } from "./notifications.controller";
import { RemindersController } from "./reminders.controller";

@Module({
  providers: [InboxService],
  controllers: [NotificationsController, RemindersController],
  exports: [InboxService],
})
export class InboxModule {}
