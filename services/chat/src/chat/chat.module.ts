import { Module } from "@nestjs/common";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { QuotaService } from "./quota.service";
import { ProviderService } from "./provider.service";
import { BillingModule } from "@ip/billing-service";
@Module({ imports: [BillingModule], controllers: [ChatController], providers: [ChatService, QuotaService, ProviderService], exports: [ProviderService] })
export class ChatModule {}
