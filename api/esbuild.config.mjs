import { build } from "esbuild";
import { existsSync } from "node:fs";

const entries = ["progress", "billing", "chat", "inbox", "gmail-scan"];

// Runtime-provided (AWS SDK v3 ships in nodejs20.x) and optional Nest peers
// that are not installed — marking them external keeps bundles small and
// prevents "Could not resolve" errors.
const external = [
  "@aws-sdk/*",
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
