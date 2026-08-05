import { createHandler } from "@ip/config";
import { ContentAppModule } from "../app.module";

export const handler = createHandler(ContentAppModule);
