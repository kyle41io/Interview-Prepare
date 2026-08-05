// Shared Jest settings for every workspace that runs ts-jest. Copied from
// api/package.json's jest block so no suite changes behaviour, minus rootDir
// and roots, which every consumer sets for itself. allowJs is required because
// some specs import compiled .js helpers, and the babel-jest branch is required
// because scripts/content-lib.mjs is ESM. babelrc/configFile are pinned false
// so a stray babel config anywhere above the workspace cannot alter a suite.
module.exports = {
  moduleFileExtensions: ["js", "json", "ts", "mjs"],
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: { allowJs: true } }],
    "^.+\\.mjs$": [
      "babel-jest",
      {
        babelrc: false,
        configFile: false,
        presets: ["babel-preset-current-node-syntax"],
        plugins: ["@babel/plugin-transform-modules-commonjs"],
      },
    ],
  },
  testEnvironment: "node",
};
