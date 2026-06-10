// Metro config for a pnpm monorepo — the crux of v1.0 step 2: make the RN bundler resolve and
// transpile the raw-TS workspace package @campaign-os/engine (main → ./src/index.ts).
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Watch the whole monorepo so Metro sees (and live-reloads) packages/engine source.
config.watchFolders = [monorepoRoot];

// 2. Resolve from both the app's and the monorepo root's node_modules (pnpm hoists some here).
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// 3. pnpm uses symlinks + a non-flat store; don't restrict resolution to the app's own hierarchy.
config.resolver.disableHierarchicalLookup = true;

// @campaign-os/engine ships raw .ts (main: ./src/index.ts); it lives under packages/engine (now a
// watched folder), so Metro's babel-preset-expo transformer transpiles it as project source.
module.exports = config;
