import { Module } from "@nestjs/common";
import { AppConfigModule } from "../config/config.module";
import { DynamoModule } from "../db/dynamo.module";
import { InboxModule } from "../inbox/inbox.module";
import { createHandler } from "./bootstrap";

@Module({ imports: [AppConfigModule, DynamoModule, InboxModule] })
class InboxLambdaModule {}

export const handler = createHandler(InboxLambdaModule);
