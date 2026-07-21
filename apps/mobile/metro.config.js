const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Monorepo pnpm : les paquets sont exposés via symlinks (store .pnpm central).
// unstable_enableSymlinks permet à Metro de les suivre ; watchFolders inclut la
// racine du workspace pour que packages/shared soit vu par le watcher.
config.resolver.unstable_enableSymlinks = true;
config.watchFolders = [workspaceRoot];

module.exports = withNativeWind(config, { input: "./global.css" });
