import { createHandler } from "@ip/config";
import { ProgressAppModule } from "../app.module";

export const handler = createHandler(ProgressAppModule);
