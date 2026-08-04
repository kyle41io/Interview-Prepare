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
    {
      name: "no-unresolvable",
      severity: "error",
      comment:
        "An import that does not resolve is a broken file. nest build excludes " +
        "scripts/ and jest never loads them, so without this rule a script can " +
        "sit unbuildable on main indefinitely — which is exactly what happened " +
        "to the three backfill scripts after keys.ts moved to packages/dynamo.",
      from: {},
      to: { couldNotResolve: true },
    },
  ],
  // The canary for the rules above. Every forbidden rule here matches on source
  // paths, and every one of them goes silently inert if tsconfig.depcruise.json
  // stops mapping @ip/* to src/index.ts: the imports then resolve through the
  // workspace symlink into dist/, which `exclude` drops, so a repo with real
  // violations reports zero and exits 0. Asserting that one known @ip/* import
  // is present *as a source path* fails loudly in that case instead. Pick any
  // service→package edge; progress -> @ip/auth is the least likely to move.
  required: [
    {
      name: "depcruise-tsconfig-canary",
      severity: "error",
      comment:
        "progress.module.ts imports @ip/auth. If this rule fails, the boundary " +
        "rules are not being enforced — check tsconfig.depcruise.json's paths, " +
        "not this file.",
      module: { path: "^services/progress/src/progress/progress\\.module\\.ts$" },
      to: { path: "^packages/auth/src/" },
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
