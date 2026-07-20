const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Requis pour un monorepo pnpm : les paquets vivent dans <racine>/node_modules/.pnpm
// et sont exposés via symlinks. Sans unstable_enableSymlinks, Metro les ignore ;
// sans watchFolders incluant la racine, Metro ne voit pas le vrai chemin (hors de
// apps/mobile) vers lequel les symlinks pointent une fois résolus.
config.resolver.unstable_enableSymlinks = true;
config.watchFolders = [workspaceRoot];

module.exports = withNativeWind(config, { input: "./global.css" });
