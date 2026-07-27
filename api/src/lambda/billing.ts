import { Module } from "@nestjs/common";
import { AppConfigModule } from "../config/config.module";
import { DynamoModule } from "../db/dynamo.module";
import { BillingModule } from "../billing/billing.module";
import { ProContentModule } from "../pro/pro.module";
import { createHandler } from "./bootstrap";

@Module({ imports: [AppConfigModule, DynamoModule, BillingModule, ProContentModule] })
class BillingLambdaModule {}

export const handler = createHandler(BillingLambdaModule);
