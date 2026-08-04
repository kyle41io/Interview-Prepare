// Builds an API Gateway HTTP API v2.0 event, the shape every service's Lambda
// e2e suite invokes its handler with. Lifted unchanged from the monolith's
// lambda-progress.e2e-spec.ts, which the other four suites used to import it
// from — a cross-service test import once the monolith split, hence the move
// here.
//
// Plain CommonJS rather than TypeScript on purpose: jest does not transform
// anything under node_modules, and this package is consumed through the
// workspace symlink. api-event.d.ts carries the types.
function apiEvent(method, path, opts = {}) {
  return {
    version: "2.0",
    routeKey: `${method} ${path}`,
    rawPath: path,
    rawQueryString: "",
    headers: {
      ...(opts.token ? { authorization: opts.token } : {}),
      ...(opts.body ? { "content-type": "application/json" } : {}),
      // For guards that read something other than authorization — inbox's
      // CronGuard wants x-cron-secret. API Gateway lower-cases header names
      // before invoking the handler, so callers must pass them lower-cased.
      ...(opts.headers || {}),
    },
    requestContext: {
      http: { method, path, sourceIp: "127.0.0.1", protocol: "HTTP/1.1", userAgent: "jest" },
      requestId: "test", stage: "$default", routeKey: `${method} ${path}`,
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    isBase64Encoded: false,
  };
}

module.exports = { apiEvent };
