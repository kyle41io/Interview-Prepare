// ChatModule is exported for @ip/inbox-service, which needs ProviderService
// (the LLM client) for message classification. This was never a domain
// dependency — ProviderService is infrastructure. P4 extracts it to @ip/ai and
// this export disappears.
export { ChatModule } from "./chat/chat.module";
export { ProviderService } from "./chat/provider.service";
