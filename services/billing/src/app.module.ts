import { Module } from "@nestjs/common";
import { AppConfigModule } from "@ip/config";
import { DynamoModule } from "@ip/dynamo";
import { BillingModule } from "./billing/billing.module";
import { ProContentModule } from "./pro/pro.module";

@Module({ imports: [AppConfigModule, DynamoModule, BillingModule, ProContentModule] })
export class BillingAppModule {}
