/**
 * Live2DRightToolbar 共享业务逻辑 Hooks
 * 
 * 此文件包含 Web 和 RN 版本共享的业务逻辑
 */

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { tOrDefault, type TFunction } from '../i18n';
import type {
  Live2DRightToolbarPanel,
  Live2DAgentToggleId,
  Live2DSettingsToggleId,
  Live2DSettingsMenuId,
  Live2DAgentState,
  Live2DSettingsState,
  ToolbarButton,
  ToolbarIcon,
  SettingsMenuItem,
  ToggleRow,
} from './types';

/**
 * 面板开关逻辑（Web 和 RN 共享）
 */
export function usePanelToggle(
  openPanel: Live2DRightToolbarPanel,
  onOpenPanelChange: (panel: Live2DRightToolbarPanel) => void,
  animationDuration = 240
) {
  const [closingPanel, setClosingPanel] = useState<Exclude<Live2DRightToolbarPanel, null> | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startClose = useCallback(
    (panel: Exclude<Live2DRightToolbarPanel, null>) => {
      setClosingPanel(panel);
      onOpenPanelChange(null);

      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
      closeTimerRef.current = setTimeout(() => {
        setClosingPanel((prev) => (prev === panel ? null : prev));
        closeTimerRef.current = null;
      }, animationDuration);
    },
    [onOpenPanelChange, animationDuration]
  );

  const togglePanel = useCallback(
    (panel: Exclude<Live2DRightToolbarPanel, null>) => {
      if (openPanel === panel) {
        startClose(panel);
        return;
      }

      // 切换：允许旧 panel 退出动画的同时打开新 panel
      if (openPanel) {
        startClose(openPanel);
      }
      onOpenPanelChange(panel);
    },
    [onOpenPanelChange, openPanel, startClose]
  );

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, []);

  return {
    closingPanel,
    togglePanel,
    startClose,
    animationDuration,
  };
}

/**
 * 按钮配置（Web 和 RN 共享，但图标资源类型不同）
 * 
 * @param iconBasePath - Web: 字符串路径前缀 (如 '/static/icons')
 * @param icons - RN: 本地 require() 资源映射表
 */
export function useToolbarButtons<TIcon = ToolbarIcon>({
  micEnabled,
  screenEnabled,
  openPanel,
  goodbyeMode,
  isMobile,
  onToggleMic,
  onToggleScreen,
  onGoodbye,
  togglePanel,
  t,
  iconBasePath = '/static/icons', // Web 使用
  icons, // RN 使用 require() 资源
}: {
  micEnabled: boolean;
  screenEnabled: boolean;
  openPanel: Live2DRightToolbarPanel;
  goodbyeMode: boolean;
  isMobile?: boolean;
  onToggleMic: (next: boolean) => void;
  onToggleScreen: (next: boolean) => void;
  onGoodbye: () => void;
  togglePanel: (panel: Exclude<Live2DRightToolbarPanel, null>) => void;
  t?: TFunction;
  iconBasePath?: string;
  icons?: {
    mic: TIcon;
    screen: TIcon;
    agent: TIcon;
    settings: TIcon;
    goodbye: TIcon;
  };
}): ToolbarButton<TIcon>[] {
  return useMemo(
    () =>
      [
        {
          id: 'mic' as const,
          title: tOrDefault(t, 'buttons.voiceControl', '语音控制'),
          hidden: false,
          active: micEnabled,
          onClick: () => onToggleMic(!micEnabled),
          icon: (icons?.mic ?? `${iconBasePath}/mic_icon_off.png`) as TIcon,
        },
        {
          id: 'screen' as const,
          title: tOrDefault(t, 'buttons.screenShare', '屏幕分享'),
          hidden: false,
          active: screenEnabled,
          onClick: () => onToggleScreen(!screenEnabled),
          icon: (icons?.screen ?? `${iconBasePath}/screen_icon_off.png`) as TIcon,
        },
        {
          id: 'agent' as const,
          title: tOrDefault(t, 'buttons.agentTools', 'Agent工具'),
          hidden: Boolean(isMobile),
          active: openPanel === 'agent',
          onClick: () => togglePanel('agent'),
          icon: (icons?.agent ?? `${iconBasePath}/Agent_off.png`) as TIcon,
          hasPanel: true,
        },
        {
          id: 'settings' as const,
          title: tOrDefault(t, 'buttons.settings', '设置'),
          hidden: false,
          active: openPanel === 'settings',
          onClick: () => togglePanel('settings'),
          icon: (icons?.settings ?? `${iconBasePath}/set_off.png`) as TIcon,
          hasPanel: true,
        },
        {
          id: 'goodbye' as const,
          title: tOrDefault(t, 'buttons.leave', '请她离开'),
          hidden: Boolean(isMobile),
          active: goodbyeMode,
          onClick: onGoodbye,
          icon: (icons?.goodbye ?? `${iconBasePath}/rest_off.png`) as TIcon,
          hasPanel: false,
        },
      ].filter((b) => !b.hidden),
    [goodbyeMode, isMobile, micEnabled, onGoodbye, onToggleMic, onToggleScreen, openPanel, screenEnabled, t, togglePanel, iconBasePath, icons]
  );
}

/**
 * Settings Toggle 行配置
 */
export function useSettingsToggleRows(
  settings: Live2DSettingsState,
  t?: TFunction
): ToggleRow[] {
  return useMemo(
    () => [
      {
        id: 'mergeMessages' as const,
        label: tOrDefault(t, 'settings.toggles.mergeMessages', '合并消息'),
        checked: settings.mergeMessages,
      },
      {
        id: 'allowInterrupt' as const,
        label: tOrDefault(t, 'settings.toggles.allowInterrupt', '允许打断'),
        checked: settings.allowInterrupt,
      },
      {
        id: 'proactiveChat' as const,
        label: tOrDefault(t, 'settings.toggles.proactiveChat', '主动搭话'),
        checked: settings.proactiveChat,
      },
      {
        id: 'proactiveVision' as const,
        label: tOrDefault(t, 'settings.toggles.proactiveVision', '自主视觉'),
        checked: settings.proactiveVision,
      },
    ],
    [settings, t]
  );
}

/**
 * Agent Toggle 行配置
 */
export function useAgentToggleRows(
  agent: Live2DAgentState,
  t?: TFunction
): ToggleRow[] {
  return useMemo(
    () => [
      {
        id: 'master' as const,
        label: tOrDefault(t, 'settings.toggles.agentMaster', 'Agent总开关'),
        checked: agent.master,
        disabled: Boolean(agent.disabled.master),
      },
      {
        id: 'keyboard' as const,
        label: tOrDefault(t, 'settings.toggles.keyboardControl', '键鼠控制'),
        checked: agent.keyboard,
        disabled: Boolean(agent.disabled.keyboard),
      },
      {
        id: 'mcp' as const,
        label: tOrDefault(t, 'settings.toggles.mcpTools', 'MCP工具'),
        checked: agent.mcp,
        disabled: Boolean(agent.disabled.mcp),
      },
      {
        id: 'userPlugin' as const,
        label: tOrDefault(t, 'settings.toggles.userPlugin', '用户插件'),
        checked: agent.userPlugin,
        disabled: Boolean(agent.disabled.userPlugin),
      },
    ],
    [agent, t]
  );
}

/**
 * Settings 菜单项配置
 */
export function useSettingsMenuItems(t?: TFunction, iconBasePath?: string): SettingsMenuItem<string>[];
export function useSettingsMenuItems<TIcon = ToolbarIcon>(
  t: TFunction | undefined,
  options?: {
    iconBasePath?: string;
    /**
     * RN: 传入 require() 图标资源映射，确保菜单图标可被本地打包
     * Web: 通常不需要传（默认返回字符串路径）
     */
    icons?: Record<Live2DSettingsMenuId, TIcon>;
  }
): SettingsMenuItem<TIcon>[];
export function useSettingsMenuItems<TIcon = ToolbarIcon>(
  t?: TFunction,
  iconBasePathOrOptions: string | { iconBasePath?: string; icons?: Record<Live2DSettingsMenuId, TIcon> } = '/static/icons'
): SettingsMenuItem<TIcon>[] {
  const normalized =
    typeof iconBasePathOrOptions === 'string'
      ? { iconBasePath: iconBasePathOrOptions, icons: undefined }
      : { iconBasePath: iconBasePathOrOptions.iconBasePath ?? '/static/icons', icons: iconBasePathOrOptions.icons };

  const iconBasePath = normalized.iconBasePath;
  const icons = normalized.icons;

  return useMemo(() => {
    const mkIcon = (id: Live2DSettingsMenuId, defaultFileName: string) =>
      (icons?.[id] ?? (`${iconBasePath}/${defaultFileName}` as unknown as TIcon)) as TIcon;

    return [
      {
        id: 'live2dSettings' as const,
        label: tOrDefault(t, 'settings.menu.live2dSettings', 'Live2D设置'),
        icon: mkIcon('live2dSettings', 'live2d_settings_icon.png'),
      },
      {
        id: 'apiKeys' as const,
        label: tOrDefault(t, 'settings.menu.apiKeys', 'API密钥'),
        icon: mkIcon('apiKeys', 'api_key_icon.png'),
      },
      {
        id: 'characterManage' as const,
        label: tOrDefault(t, 'settings.menu.characterManage', '角色管理'),
        icon: mkIcon('characterManage', 'character_icon.png'),
      },
      {
        id: 'voiceClone' as const,
        label: tOrDefault(t, 'settings.menu.voiceClone', '声音克隆'),
        icon: mkIcon('voiceClone', 'voice_clone_icon.png'),
      },
      {
        id: 'memoryBrowser' as const,
        label: tOrDefault(t, 'settings.menu.memoryBrowser', '记忆浏览'),
        icon: mkIcon('memoryBrowser', 'memory_icon.png'),
      },
      {
        id: 'steamWorkshop' as const,
        label: tOrDefault(t, 'settings.menu.steamWorkshop', '创意工坊'),
        icon: mkIcon('steamWorkshop', 'Steam_icon_logo.png'),
      },
    ];
  }, [t, iconBasePath, icons]);
}
