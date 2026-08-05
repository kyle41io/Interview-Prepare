module.exports = {
  preset: "@ip/testing",
  rootDir: ".",
  // scripts/ is a second root because content-lib.spec.ts lives beside the
  // authoring script it tests, mirroring api/package.json's
  // roots: ["<rootDir>", "<rootDir>/../scripts"].
  roots: ["<rootDir>/src", "<rootDir>/scripts"],
};
