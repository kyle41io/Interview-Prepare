import { Module } from "@nestjs/common";
import { AppConfigModule } from "@ip/config";
import { DynamoModule } from "@ip/dynamo";
import { ChatModule } from "./chat/chat.module";

@Module({ imports: [AppConfigModule, DynamoModule, ChatModule] })
export class ChatAppModule {}
