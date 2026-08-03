// Shared Jest settings for every workspace that runs ts-jest. Extracted
// verbatim from api/package.json's jest block so no suite changes behaviour.
// allowJs is required because some specs import compiled .js helpers, and the
// babel-jest branch is required because scripts/content-lib.mjs is ESM.
module.exports = {
  moduleFileExtensions: ["js", "mjs", "json", "ts"],
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: { allowJs: true } }],
    "^.+\\.mjs$": [
      "babel-jest",
      {
        presets: ["babel-preset-current-node-syntax"],
        plugins: ["@babel/plugin-transform-modules-commonjs"],
      },
    ],
  },
  testEnvironment: "node",
};
