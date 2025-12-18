/**
 * ⚠️ 重要：不要在这里 `declare module "react-native"` 并重新导出成员。
 *
 * 这个项目本身依赖 `react-native`，其类型定义应由 `react-native` 包提供。
 * 之前的声明会导致 TypeScript 认为 `react-native` 只导出了 Platform.OS，
 * 从而出现全项目 “Module 'react-native' has no exported member 'View/StyleSheet/Alert'...” 的错误。
 *
 * 如果将来需要为 request 包做“无 RN 环境”的类型兜底，请在该包独立构建的 tsconfig 中
 * 通过 `typeRoots`/`types` 做隔离，不要污染 App 工程的全局类型解析。
 */
export {};

