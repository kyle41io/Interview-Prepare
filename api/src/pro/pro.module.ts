import { Module } from "@nestjs/common";
import { ProService } from "./pro.service";
import { ProController } from "./pro.controller";
import { BillingModule } from "../billing/billing.module";
@Module({ imports: [BillingModule], controllers: [ProController], providers: [ProService] })
export class ProContentModule {}
