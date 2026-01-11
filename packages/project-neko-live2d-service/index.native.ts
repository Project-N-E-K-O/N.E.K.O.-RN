// 注意：本仓库 tsconfig 开启了 moduleSuffixes（.native/.web/...）
// 如果这里写 `export * from "./index"`，TS 可能会解析回 `index.native.ts` 自身，导致核心导出丢失。
export * from "./index.core";
export * from "./src/native/index";

