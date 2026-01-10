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

// 关键：在 workspace 依赖未被正确链接/或尚未 build 时，仍能让 Metro 解析到本地 packages
// 这样 `import 'react-native-live2d'` 会直接指向 `packages/react-native-live2d`（同理 pcm-stream）
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  'react-native-live2d': path.resolve(projectRoot, 'packages/react-native-live2d'),
  'react-native-pcm-stream': path.resolve(projectRoot, 'packages/react-native-pcm-stream'),
  '@project_neko/common': path.resolve(projectRoot, 'packages/project-neko-common'),
  '@project_neko/request': path.resolve(projectRoot, 'packages/project-neko-request'),
  '@project_neko/components': path.resolve(projectRoot, 'packages/project-neko-components'),
  '@project_neko/audio-service': path.resolve(projectRoot, 'packages/project-neko-audio-service'),
  '@project_neko/live2d-service': path.resolve(projectRoot, 'packages/project-neko-live2d-service'),
  '@project_neko/realtime': path.resolve(projectRoot, 'packages/project-neko-realtime'),
};

module.exports = config;
