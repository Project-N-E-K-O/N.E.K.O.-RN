/**
 * Live2DRightToolbar 共享类型定义
 * 
 * 此文件包含 Web 和 RN 版本共享的所有类型定义
 */

export type Live2DRightToolbarButtonId = "mic" | "screen" | "agent" | "settings" | "goodbye" | "return";

export type Live2DRightToolbarPanel = "agent" | "settings" | null;

export type Live2DSettingsToggleId = "mergeMessages" | "allowInterrupt" | "proactiveChat" | "proactiveVision";

export type Live2DAgentToggleId = "master" | "keyboard" | "mcp" | "userPlugin";

export interface Live2DSettingsState {
  mergeMessages: boolean;
  allowInterrupt: boolean;
  proactiveChat: boolean;
  proactiveVision: boolean;
}

export interface Live2DAgentState {
  statusText: string;
  master: boolean;
  keyboard: boolean;
  mcp: boolean;
  userPlugin: boolean;
  disabled: Partial<Record<Live2DAgentToggleId, boolean>>;
}

export type Live2DSettingsMenuId =
  | "live2dSettings"
  | "apiKeys"
  | "characterManage"
  | "voiceClone"
  | "memoryBrowser"
  | "steamWorkshop";

export interface Live2DRightToolbarProps {
  visible?: boolean;
  right?: number;
  bottom?: number;
  top?: number;
  isMobile?: boolean;

  micEnabled: boolean;
  screenEnabled: boolean;
  goodbyeMode: boolean;

  openPanel: Live2DRightToolbarPanel;
  onOpenPanelChange: (panel: Live2DRightToolbarPanel) => void;

  settings: Live2DSettingsState;
  onSettingsChange: (id: Live2DSettingsToggleId, next: boolean) => void;

  agent: Live2DAgentState;
  onAgentChange: (id: Live2DAgentToggleId, next: boolean) => void;

  onToggleMic: (next: boolean) => void;
  onToggleScreen: (next: boolean) => void;
  onGoodbye: () => void;
  onReturn: () => void;

  onSettingsMenuClick?: (id: Live2DSettingsMenuId) => void;
}

/**
 * 图标类型：Web 使用字符串路径，RN 使用 require() 的 number 资源 ID
 */
export type ToolbarIcon = string | number;

/**
 * 按钮配置接口（泛型支持不同平台的图标类型）
 */
export interface ToolbarButton<TIcon = ToolbarIcon> {
  id: Live2DRightToolbarButtonId;
  title: string;
  hidden: boolean;
  active: boolean;
  onClick: () => void;
  icon: TIcon;
  hasPanel?: boolean;
}

/**
 * Toggle 行配置接口
 */
export interface ToggleRow {
  id: Live2DSettingsToggleId | Live2DAgentToggleId;
  label: string;
  checked: boolean;
  disabled?: boolean;
}

/**
 * Settings 菜单项（Web 使用字符串路径；RN 使用 require() 的 number）
 */
export interface SettingsMenuItem<TIcon = ToolbarIcon> {
  id: Live2DSettingsMenuId;
  label: string;
  icon: TIcon;
}
