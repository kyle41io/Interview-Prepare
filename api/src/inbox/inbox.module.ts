import { Module } from "@nestjs/common";
import { InboxService } from "./inbox.service";
import { NotificationsController } from "./notifications.controller";
import { RemindersController } from "./reminders.controller";
import { GoogleService } from "./google.service";
import { GmailAccountService } from "./gmail-account.service";
import { GmailController } from "./gmail.controller";

@Module({
  providers: [InboxService, GoogleService, GmailAccountService],
  controllers: [NotificationsController, RemindersController, GmailController],
  exports: [InboxService],
})
export class InboxModule {}
