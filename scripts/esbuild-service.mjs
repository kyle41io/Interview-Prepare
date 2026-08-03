import { build } from "esbuild";
import { existsSync } from "node:fs";

// Runtime-provided and optional Nest peers that are not installed — marking
// them external keeps bundles small and prevents "Could not resolve" errors.
//
// The AWS SDK entries are listed one by one on purpose, NOT as an "@aws-sdk/*"
// glob. The Terraform stacks zip only dist-lambda/<name>/, so no node_modules
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

// Args are "<outputName>" or "<outputName>:<entryName>" when the Lambda's
// physical name differs from its source file, e.g. "gmail-scan:scan".
const targets = process.argv.slice(2).map((arg) => {
  const [outName, entryName = outName] = arg.split(":");
  return { outName, entryName };
});

if (!targets.length) {
  console.error("usage: esbuild-service.mjs <outName[:entryName]> ...");
  process.exit(1);
}

const missing = targets.filter((t) => !existsSync(`dist/lambda/${t.entryName}.js`));
if (missing.length) {
  console.error(
    "Missing compiled entrypoints (run `nest build` first): " +
      missing.map((t) => `dist/lambda/${t.entryName}.js`).join(", "),
  );
  process.exit(1);
}

await Promise.all(
  targets.map(({ outName, entryName }) =>
    build({
      entryPoints: [`dist/lambda/${entryName}.js`],
      outfile: `dist-lambda/${outName}/index.js`,
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
console.log("Bundled:", targets.map((t) => t.outName).join(", "));
