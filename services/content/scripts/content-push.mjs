import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { loadTopics, validateTopic, validateDiagrams, findDuplicateIds } from "./content-lib.mjs";

/* --bundle-only skips the sources upload and republishes bundle.json alone.
   It exists for deploy-content-data, which rebuilds the bundle from the
   sources/ copy ALREADY in the bucket: re-uploading those bytes to the same
   keys they were just downloaded from would add a no-op version to every
   object on every run, and versioning here is the authoring sources' only
   history. */
const args = process.argv.slice(2);
const bundleOnly = args.includes("--bundle-only");

// Relative to the workspace this script runs in, which npm sets as the cwd.
// services/content is one level deeper than the old api/, hence ../../ rather
// than ../ — the target is still the repo-root content/ directory.
const DIR = args.find((a) => !a.startsWith("--")) || "../../content";
const BUCKET = process.env.CONTENT_BUCKET;
if (!BUCKET) {
  console.error("CONTENT_BUCKET is not set");
  process.exit(1);
}
const s3 = new S3Client({ region: process.env.AWS_REGION || "us-east-1" });

const topics = await loadTopics(DIR);
if (topics.length === 0) {
  console.error(`no topics found in ${DIR} — refusing to overwrite the bundle`);
  process.exit(1);
}

const bad = topics.flatMap((t) => validateTopic(t)
  .concat(validateDiagrams(t))
  .map((e) => `${t?.id ?? "<no id>"}: ${e}`));
if (bad.length) {
  console.error("validation failed:\n  " + bad.join("\n  "));
  process.exit(1);
}

const dupes = findDuplicateIds(topics);
if (dupes.length) {
  console.error(`duplicate topic ids: ${dupes.join(", ")}`);
  process.exit(1);
}

/* Upload the authoring files as raw bytes, not re-serialized: sources/ is the
   recovery copy, and bucket versioning only helps if what it versions is
   byte-identical to what you edit. Writes only, never deletes — a topic missing
   locally keeps its stored copy, so a stray deletion cannot cascade. */
if (!bundleOnly) {
  for (const f of readdirSync(DIR).filter((n) => n.endsWith(".js")).sort()) {
    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: `sources/${f}`,
      Body: readFileSync(join(DIR, f)),
      ContentType: "application/javascript",
    }));
    console.log(`  put sources/${f}`);
  }
}

// Bundle last, so it never references a source that failed to upload.
await s3.send(new PutObjectCommand({
  Bucket: BUCKET,
  Key: "bundle.json",
  Body: JSON.stringify({ topics }),
  ContentType: "application/json",
}));
console.log(bundleOnly
  ? `rebuilt bundle.json from ${topics.length} sources`
  : `pushed ${topics.length} sources + bundle.json`);
