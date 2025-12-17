const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// 添加其他可能需要的文件扩展名，但不包括 .js 以避免与 HMR 冲突
config.resolver.assetExts.push('moc3', 'motion3', 'exp3', 'physics3', 'pose3', 'cdi3', 'txt', 'html', 'pcm', 'wav');

// 确保 .js 文件不在 assetExts 中，以免干扰 HMR
config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'js');

// 支持 monorepo 结构
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '.');

config.watchFolders = [workspaceRoot];
config.resolver.platforms = ['native', 'android', 'ios', 'web'];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
