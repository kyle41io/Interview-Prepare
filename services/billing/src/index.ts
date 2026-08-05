// Exported for @ip/chat-service (entitlement) only: ChatModule imports
// BillingModule and ChatService injects BillingService. This cross-service
// import is a database-per-service violation preserved deliberately in P1 and
// removed in P5, when entitlement becomes an event-sourced read model owned by
// chat.
export { BillingModule } from "./billing/billing.module";
export { BillingService } from "./billing/billing.service";
