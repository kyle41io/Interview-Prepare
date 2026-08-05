import { createHandler } from "@ip/config";
import { InboxAppModule } from "../app.module";

export const handler = createHandler(InboxAppModule);
