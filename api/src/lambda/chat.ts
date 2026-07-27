import { Module } from "@nestjs/common";
import { AppConfigModule } from "../config/config.module";
import { DynamoModule } from "../db/dynamo.module";
import { ChatModule } from "../chat/chat.module";
import { createHandler } from "./bootstrap";

@Module({ imports: [AppConfigModule, DynamoModule, ChatModule] })
class ChatLambdaModule {}

export const handler = createHandler(ChatLambdaModule);
