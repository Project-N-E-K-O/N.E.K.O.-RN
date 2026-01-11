# Live2D（Android）与口型同步（LipSync）

> 本文档描述 **React Native - Android 平台** 的 Live2D 渲染与口型同步实现。
>
> - iOS：当前 `packages/react-native-live2d/ios/*` 仍为模板 WebView 实现，**不在本文范围内**。
> - Web：存在独立实现/适配层，本文不展开。

## 目标与分层

Android 侧采用两层协作：

- **业务层（JS/TS）**：负责“模型资源管线”和“状态聚合”
  - 下载/缓存/校验 Live2D 模型文件
  - 维护 UI 状态（loading/ready、motion/expression、scale/position、autoBreath/autoBlink）
  - 产出可直接传给原生 View 的 props

- **原生层（Android / Expo Module）**：负责“渲染与低延迟控制”
  - `GLSurfaceView + CubismFramework` 真正加载与渲染模型
  - props 驱动 motion/expression/transform 等低频控制
  - 模块方法承载口型同步等高频控制（避免 React 渲染链路带来的延迟/抖动）

## 相关文件与职责（Android-only）

### 业务层（JS/TS）

- `services/Live2DService.ts`
  - **定位**：RN/Expo 宿主侧的“资源管线 + props 聚合”包装层
  - **内部复用**：跨平台内核 `@project_neko/live2d-service`（仓库内对应 `packages/project-neko-live2d-service/`）
  - **负责**：
    - 拼接模型 URL（`backendScheme/host/port/live2dPath/modelName`）
    - 下载 `*.model3.json` 与依赖文件到 `expo-file-system` 缓存目录
    - 校验关键文件（至少包括 `*.model3.json`、`*.moc3`）
    - 将动作/表情/变换命令委托给 `createLive2DService(adapter)`（统一语义，便于未来与 Web 对齐）
    - 维护并通知（供现有 UI/hook 使用）：
      - `ModelState`: `path/isReady/isLoading`
      - `TransformState`: `scale/position`
      - `AnimationState`: `motion/expression/autoBreath/autoBlink`
  - **输出**：`getViewProps()`（用于 `<ReactNativeLive2dView />`）

- `hooks/useLive2D.ts`
  - **负责**：
    - 管理 `Live2DService` 生命周期（mount 创建、unmount destroy）
    - 将 service 状态同步到 React state，并聚合成 `live2dProps`
  - **关键点**：
    - Android：`loadModel()` 会先调用 `ReactNativeLive2dModule.initializeLive2D()` 显式初始化，避免依赖“固定延迟”等不确定手段

- `services/LipSyncService.ts` / `hooks/useLipSync.ts`
  - **负责**：
    - 订阅 `react-native-pcm-stream` 的 `onAmplitudeUpdate` / `onPlaybackStop`
    - 将振幅映射到嘴巴开合度（0~1）
    - 直接调用原生模块 `ReactNativeLive2dModule.setMouthValue(value)`（无平滑、低延迟）

### 原生层（Android）

- `packages/react-native-live2d/android/src/main/java/expo/modules/live2d/ReactNativeLive2dView.kt`
  - **负责**：
    - 创建 `GLSurfaceView` 与 `GLRenderer`
    - 在 **GL 线程**调用 `LAppDelegate.onStart(activity)` 初始化 Cubism 相关对象
    - `Prop("modelPath")` → `loadModel(path)` → `LAppModel.loadAssetsFromFileSystem(actualPath)` → 渲染
    - `Prop("motionGroup")/Prop("expression")/Prop("scale")/Prop("position")` 做控制（含队列/去重/GL 线程调度）
    - 事件：`onModelLoaded`、`onError`、`onTap`、`onMotionFinished`
  - **生命周期**：
    - `onDetachedFromWindow()` 会 `clearAll()`（释放模型/纹理/delegate 等），防止 Expo Refresh / 页面切换导致状态错乱

- `packages/react-native-live2d/android/src/main/java/expo/modules/live2d/ReactNativeLive2dModule.kt`
  - **负责**：
    - 提供模块级方法：`getAvailableModels/getAvailableMotions/getAvailableExpressions/startMotion/setExpression`
    - 提供口型同步方法：`setMouthValue/getMouthValue`（直接写模型参数）

- `packages/react-native-live2d/src/ReactNativeLive2dView.tsx`
  - **负责**：
    - RN 侧对 native view 的薄封装（目前以日志与 props 透传为主）

## 数据流（从“加载模型”到“口型同步”）

### 1) 模型加载/渲染（低频）

1. `Live2DService.loadModel()` 会通过 `@project_neko/live2d-service` 的 `createLive2DService(adapter)` 触发加载：
   - adapter 内部负责下载/补齐依赖并得到本地文件路径（通常为 `file://.../cache/live2d/<model>/<model>.model3.json`）。
2. `useLive2D` 聚合出：
   - `modelPath`（ready 才提供）
   - `motionGroup/expression/scale/position/autoBreath/autoBlink` 等控制项
3. `<ReactNativeLive2dView {...live2dProps} />` 传入 props。
4. Android `Prop("modelPath")` 收到后：
   - 若带 `file://` 前缀会移除前缀
   - 校验文件存在
   - 在 GL 线程创建 `LAppModel` 并 `loadAssetsFromFileSystem()`
   - 加入 `LAppLive2DManager` 并触发渲染，发送 `onModelLoaded`

## 进入页面的加载策略（RN：必须显式触发 `loadModel()`）

与 Web 端 `Live2DStage`“组件挂载后自动 `loadModel()`”不同，RN 端的 Live2D 资源管线在业务层是**懒加载**设计：

- `<ReactNativeLive2dView />` 只是渲染容器
- 只有当业务层调用 `useLive2D.loadModel()` 后，`Live2DService` 才会下载/校验资源，并产出 `modelPath`

因此：**进入页面时若没有触发 `loadModel()`，`modelPath` 会一直是 `undefined`，模型不会展示（这是预期行为，不是渲染 bug）**。

推荐策略（与页面焦点联动）：

- **onFocus**：调用 `live2d.loadModel()`（内部会先 `initializeLive2D()`，再下载/补齐依赖）
- **onBlur**：调用 `live2d.unloadModel()`（并重置 `isNativeModelLoaded`），避免 GL/Cubism 资源在后台页面占用与竞态

对应页面可参考：`app/(tabs)/main.tsx`（Live2D 主页面）与 `hooks/useLive2D.ts`。

### 2) 动作/表情/变换（中低频）

- motion/expression/scale/position 通过 **props** 驱动：
  - `motionGroup` → `view.startMotion(group, 0)`（Android 侧内部做队列管理，避免动作冲突）
  - `expression` → `view.setExpression(expression)`
  - `scale/position` → 在 GL 线程调用 `LAppView.setViewScale/setViewPosition`

> 备注：LipSync 场景建议**不要传 `motionGroup`**，避免动作系统干扰口型同步时的观感/稳定性。
> 当前实现已收敛到 `useLive2D.live2dPropsForLipSync`（内部会强制 `motionGroup: undefined`），避免页面层遗漏/误删。

## 手势（拖拽/缩放）支持现状（RN / Android）

### 1) 原生侧“触摸交互”（单指）✅

- Android `ReactNativeLive2dView.kt` 会把 `MotionEvent` 的 down/move/up 转发给：
  - `LAppDelegate.onTouchBegan(x, y)`
  - `LAppDelegate.onTouchMoved(x, y)`
  - `LAppDelegate.onTouchEnd(x, y)`
- 这类交互通常体现为 Live2D 内部的“看向手指/头部跟随”等参数变化（属于 Live2D SDK 内建的交互路径）。

### 2) UI 层“拖拽移动模型位置 / 捏合缩放模型”⚠️（当前未接入）

- **原生模块已支持**通过 props 进行程序化控制：
  - `scale` → `view.setScale(scale)`
  - `position` → `view.setPosition(x, y)`
- 但当前 RN 主界面 `app/(tabs)/main.tsx` **没有**接入手势识别（如 `PanResponder` / `react-native-gesture-handler`），因此不会把用户手势映射到 `scale/position` 更新。

### 3) “双指捏合缩放（pinch）”❌（原生未实现）

- 当前 Android 侧未实现 `ScaleGestureDetector` / 多点触控（`ACTION_POINTER_*`）的 pinch 逻辑。
- 若需要 pinch：
  - 推荐在 JS 层用手势库计算出目标 `scale/position`，再通过 props 下发；
  - 或在 Android 原生 View 内新增 pinch 识别并更新 `setScale/setPosition`（需要统一坐标系与边界策略）。

### 3) 口型同步（高频、低延迟）

- `PCMStream` → `LipSyncService` → `ReactNativeLive2dModule.setMouthValue(value)`
- 该路径绕开 React 的 render/props 更新链路，主要收益：
  - 更低延迟
  - 更少抖动/丢帧
  - 更容易稳定做到“每个音节都有嘴型变化”

**启动时机（建议）**：
- 仅在以下条件同时满足时启动 LipSync：
  - JS 资源层 ready：`modelState.isReady && modelState.path`
  - 原生渲染层 ready：`ReactNativeLive2dView` 触发 `onModelLoaded`（对应 `useLive2D.isNativeModelLoaded === true`）

## `modelPath` 契约（必须遵守）

- **必须指向 `.model3.json` 的绝对路径或 `file://` URI**
  - Android `ReactNativeLive2dView.loadModelFromFileSystem()` 支持 `file://` 前缀（会剥离）。
- 模型依赖文件需要与 `model3.json` 同目录结构可访问（`Live2DService` 会负责下载补齐）。

## 已知不一致点（文档化，后续按本文改代码）

### 1) 点击事件命名不一致（已修复）

- Android 原生 View 事件名为 `onTap`
- RN 包装层 `packages/react-native-live2d/src/ReactNativeLive2dView.tsx` 已统一：
  - 业务层传 `onTap` 可以收到
  - 同时保留 `onTouchEnd` 作为历史兼容（包装层会在 tap 时同时触发）

### 2) `initializeLive2D()` 类型声明与 Android 实现不对齐（已修复）

- `packages/react-native-live2d/src/ReactNativeLive2d.types.ts` 声明了 `initializeLive2D(): Promise<boolean>`
- Android `ReactNativeLive2dModule.kt` 已导出 `initializeLive2D`，内部调用 `ensureLive2DInitialized()` 返回 `boolean`

### 3) `autoBlink/autoBreath`（已支持）

- JS 层与 props 提供 `autoBlink/autoBreath`
- Android 侧已在 `LAppModel.update()` 中按开关决定是否执行：
  - `eyeBlink.updateParameters(...)`
  - `breath.updateParameters(...)`

**语义**：
- 该开关仅控制“自动眨眼/自动呼吸”的叠加效果，不影响 motion / expression / physics 等其它系统。

## 最小验收（Android）

- **模型加载**
  - 进入页面能触发下载/校验，并最终触发 `onModelLoaded`
  - `modelPath` 指向的文件存在且可被原生读取
- **交互**
  - 点击模型能稳定回调到 RN（修复事件名后验证）
- **口型同步**
  - 播放音频时 `PCMStream` 振幅更新能驱动嘴巴开合（`setMouthValue` 生效）
  - 播放停止后嘴巴归零（`onPlaybackStop` → `setMouthValue(0)`）
