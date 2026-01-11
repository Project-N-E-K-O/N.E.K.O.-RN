# Live2D Toolbar Icons

这个目录包含 Live2DRightToolbar 组件使用的图标资源。

## 需要的图标文件

请从主项目的 `static/icons/` 目录复制以下图标文件到此目录：

- `mic_icon_off.png` - 麦克风图标
- `screen_icon_off.png` - 屏幕分享图标
- `Agent_off.png` - Agent 工具图标
- `set_off.png` - 设置图标
- `rest_off.png` - 离开/返回图标

## 如何获取图标

从主 N.E.K.O 项目复制：

```bash
# 从项目根目录执行
cp /Users/noahwang/projects/N.E.K.O/static/icons/mic_icon_off.png assets/icons/
cp /Users/noahwang/projects/N.E.K.O/static/icons/screen_icon_off.png assets/icons/
cp /Users/noahwang/projects/N.E.K.O/static/icons/Agent_off.png assets/icons/
cp /Users/noahwang/projects/N.E.K.O/static/icons/set_off.png assets/icons/
cp /Users/noahwang/projects/N.E.K.O/static/icons/rest_off.png assets/icons/
```

## 图标规格建议

- 格式：PNG（支持透明度）
- 尺寸：建议 64x64 或 128x128 像素（React Native 会自动缩放）
- 颜色：建议使用白色图标，背景透明（组件会应用背景色）

## 使用方式

在 React Native 中，这些图标通过 `require()` 方式引用：

```typescript
const icon = require('../../assets/icons/mic_icon_off.png');
<Image source={icon} style={styles.icon} />
```

注意：不要使用远程 URL（如 `http://...`），因为会导致加载失败和网络依赖。
