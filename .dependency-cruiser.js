// Enforces the one rule that makes this a microservices repo rather than a
// monorepo with extra folders: a service may not reach into another service.
// Shared code belongs in packages/*. Sharing code is fine in microservices;
// sharing data is not.
module.exports = {
  forbidden: [
    {
      name: "no-cross-service",
      severity: "error",
      comment:
        "services/* must not import from services/*. Extract shared code to packages/*.",
      from: { path: "^services/([^/]+)/" },
      to: {
        path: "^services/(?!$1)([^/]+)/",
        // TWO DATED EXCEPTIONS, each removed by a named sub-project. This
        // allowlist is deliberately visible and shrinking: deleting the last
        // entry in P5 is the provable moment database-per-service is achieved.
        //
        // 1. chat -> billing (entitlement). Removed in P5, when entitlement
        //    becomes an event-sourced read model owned by chat.
        // 2. inbox -> chat (ProviderService, the LLM client). Removed in P4,
        //    when ProviderService moves to packages/ai as @ip/ai. This was
        //    never a domain dependency — the shared thing is infrastructure.
        pathNot: [
          "^services/billing/src/index\\.ts$",
          "^services/chat/src/index\\.ts$",
        ],
      },
    },
    // The two rules below scope each barrel exception to the one service that
    // is allowed to use it. Without them, `pathNot` above would exempt those
    // barrels for every service — a sixth service could import billing's on
    // day one and the suite would stay green.
    {
      name: "billing-barrel-is-for-chat-only",
      severity: "error",
      comment:
        "Only services/chat may import @ip/billing-service, and only until P5.",
      from: { path: "^services/", pathNot: "^services/(billing|chat)/" },
      to: { path: "^services/billing/src/index\\.ts$" },
    },
    {
      name: "chat-barrel-is-for-inbox-only",
      severity: "error",
      comment:
        "Only services/inbox may import @ip/chat-service, and only until P4.",
      from: { path: "^services/", pathNot: "^services/(chat|inbox)/" },
      to: { path: "^services/chat/src/index\\.ts$" },
    },
    {
      name: "no-package-to-service",
      severity: "error",
      comment:
        "packages/* is infrastructural and must never know about a domain service.",
      from: { path: "^packages/" },
      to: { path: "^services/" },
    },
  ],
  allowed: [],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    // Not a service's own tsconfig — see tsconfig.depcruise.json's "//" note.
    tsConfig: { fileName: "tsconfig.depcruise.json" },
    exclude: { path: "\\.spec\\.ts$|/test/|/dist/|/dist-lambda/" },
  },
};
