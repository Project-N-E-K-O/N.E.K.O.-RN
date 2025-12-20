# @project_neko/request

本包是 **N.E.K.O 的内部 workspace 源码包**。为了方便仓库内 TypeScript/Metro 直接引用与类型推导，`package.json` 的 `main`/`types`/`exports` **刻意指向 TypeScript 源码**（如 `index.ts`、`index.web.ts`、`index.native.ts`），并不符合可发布 npm 包的标准（应指向编译后的 `dist/*.js` 与 `dist/*.d.ts`）。

## 构建（build）的真实用途

本包的 `build` 脚本通过 Vite 生成浏览器可直接加载的 ES/UMD bundle，用于被上层项目（如 Web/模板/bridge）以静态资源方式引入。

## 发布说明（重要）

- 本包在 `package.json` 中已标记 `"private": true`（不会被 `npm publish` 发布）。
- 另外配置了 `prepublishOnly` 防护：即使有人误操作，也会先跑 `build`，随后直接失败并提示原因。
- 如需对外发布（npm），需要先实现 **标准 dist 编译产物**（例如 `dist/index.js` 与 `dist/index.d.ts`），并将 `main`/`types`/`exports` 指向 `dist/*`，然后再移除 `"private": true` 与 `prepublishOnly` 防护。


