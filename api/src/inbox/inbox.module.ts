import { Module } from "@nestjs/common";
import { InboxService } from "./inbox.service";
import { NotificationsController } from "./notifications.controller";
import { RemindersController } from "./reminders.controller";
import { GoogleService } from "./google.service";
import { GmailAccountService } from "./gmail-account.service";
import { GmailController } from "./gmail.controller";
import { CronGuard } from "./cron.guard";
import { ScanService } from "./scan.service";
import { ChatModule } from "../chat/chat.module";

@Module({
  imports: [ChatModule], // ProviderService for classify
  providers: [InboxService, GoogleService, GmailAccountService, ScanService, CronGuard],
  controllers: [NotificationsController, RemindersController, GmailController],
  exports: [InboxService],
})
export class InboxModule {}
