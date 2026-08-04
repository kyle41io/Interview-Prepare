import { createHandler } from "@ip/config";
import { ChatAppModule } from "../app.module";

export const handler = createHandler(ChatAppModule);
