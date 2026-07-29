import { build } from "esbuild";
import { existsSync } from "node:fs";

const entries = ["progress", "billing", "chat", "inbox", "gmail-scan", "content"];

// Runtime-provided and optional Nest peers that are not installed — marking
// them external keeps bundles small and prevents "Could not resolve" errors.
//
// The AWS SDK entries are listed one by one on purpose, NOT as an "@aws-sdk/*"
// glob. infra/lambda.tf zips only dist-lambda/<name>/, so no node_modules
// ships and every external must already exist in the nodejs20.x runtime. Only
// these three are proven present by the running production deploy; the glob
// additionally externalised @aws-sdk/client-s3 and the *utility* package
// @aws-sdk/s3-request-presigner, which the runtime is not guaranteed to
// provide. getSignedUrl is a static top-level import in content.module.ts, so
// a missing presigner is a Runtime.ImportModuleError that 502s the whole
// content Lambda (bundle route and its co-located health check) before Nest
// boots. Bundling both also keeps client-s3 and its presigner on the same
// version instead of pairing a bundled presigner with a runtime-supplied
// client-s3. Add a name here only once the runtime is known to supply it.
const external = [
  "@aws-sdk/client-dynamodb",
  "@aws-sdk/lib-dynamodb",
  "@aws-sdk/client-ssm",
  "aws-lambda",
  "@nestjs/microservices",
  "@nestjs/websockets",
  "@nestjs/platform-fastify",
  "class-transformer/storage",
  "cache-manager",
  "@fastify/static",
  "amqp-connection-manager",
  "amqplib",
  "ioredis",
  "kafkajs",
  "mqtt",
  "nats",
  "@grpc/grpc-js",
  "@grpc/proto-loader",
];

// Domain entrypoints land one task at a time (this file lists the full,
// final set up front so later tasks never need to touch it again). Skip any
// entry whose compiled src/lambda/<name>.ts doesn't exist yet instead of
// letting esbuild's "Could not resolve" abort the whole bundle run.
const available = entries.filter((name) => existsSync(`dist/lambda/${name}.js`));
const pending = entries.filter((name) => !available.includes(name));
if (pending.length) {
  console.log("Skipping (not yet implemented):", pending.join(", "));
}

await Promise.all(
  available.map((name) =>
    build({
      entryPoints: [`dist/lambda/${name}.js`],
      outfile: `dist-lambda/${name}/index.js`,
      bundle: true,
      platform: "node",
      target: "node20",
      format: "cjs",
      minify: true,
      sourcemap: false,
      external,
      logLevel: "info",
    }),
  ),
);
console.log("Bundled:", available.join(", "));
