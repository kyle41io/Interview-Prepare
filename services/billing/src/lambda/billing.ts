import { createHandler } from "@ip/config";
import { BillingAppModule } from "../app.module";

export const handler = createHandler(BillingAppModule);
