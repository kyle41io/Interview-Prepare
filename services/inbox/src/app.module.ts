import { Module } from "@nestjs/common";
import { AppConfigModule } from "@ip/config";
import { DynamoModule } from "@ip/dynamo";
import { InboxModule } from "./inbox/inbox.module";

@Module({ imports: [AppConfigModule, DynamoModule, InboxModule] })
export class InboxAppModule {}
