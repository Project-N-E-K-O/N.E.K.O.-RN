/**
 * Live2DRightToolbar - Web 版本
 * 
 * 使用 HTML/CSS 实现的完整版工具栏
 */

import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { useT } from "../i18n";
import {
  usePanelToggle,
  useToolbarButtons,
  useSettingsToggleRows,
  useAgentToggleRows,
  useSettingsMenuItems,
} from "./hooks";
import type { Live2DRightToolbarProps } from "./types";
import "./Live2DRightToolbar.css";

export * from "./types";

export function Live2DRightToolbar({
  visible = true,
  right = 460,
  bottom,
  top,
  isMobile,
  micEnabled,
  screenEnabled,
  goodbyeMode,
  openPanel,
  onOpenPanelChange,
  settings,
  onSettingsChange,
  agent,
  onAgentChange,
  onToggleMic,
  onToggleScreen,
  onGoodbye,
  onReturn,
  onSettingsMenuClick,
}: Live2DRightToolbarProps) {
  const t = useT();
  const rootRef = useRef<HTMLDivElement | null>(null);

  // 使用共享的面板切换逻辑
  const { closingPanel, togglePanel, startClose, animationDuration } = usePanelToggle(
    openPanel,
    onOpenPanelChange
  );

  // 使用共享的按钮配置
  const buttons = useToolbarButtons<string>({
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
  });

  // 使用共享的 toggle rows 配置
  const settingsToggleRows = useSettingsToggleRows(settings, t);
  const agentToggleRows = useAgentToggleRows(agent, t);
  const settingsMenuItems = useSettingsMenuItems(t);

  // 容器样式
  const containerStyle = useMemo<React.CSSProperties>(() => {
    const style: React.CSSProperties = {
      right,
    };

    if (typeof top === "number") {
      style.top = top;
    } else {
      style.bottom = typeof bottom === "number" ? bottom : 320;
    }

    return style;
  }, [right, top, bottom]);

  // Web 特定：外部点击关闭面板
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const root = rootRef.current;
      if (!root) return;
      if (!openPanel) return;
      const target = e.target as Node | null;
      if (target && root.contains(target)) return;
      startClose(openPanel);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [openPanel, startClose]);

  if (!visible) return null;

  return (
    <div ref={rootRef} className="live2d-right-toolbar" style={containerStyle}>
      {goodbyeMode ? (
        <button
          type="button"
          className="live2d-right-toolbar__button live2d-right-toolbar__return"
          title="请她回来"
          onClick={onReturn}
        >
          <img className="live2d-right-toolbar__icon" src="/static/icons/rest_off.png" alt="return" />
        </button>
      ) : (
        buttons.map((b) => (
          <div key={b.id} className="live2d-right-toolbar__item">
            <button
              type="button"
              className="live2d-right-toolbar__button"
              title={b.title}
              data-active={b.active ? "true" : "false"}
              onClick={b.onClick}
            >
              <img className="live2d-right-toolbar__icon" src={b.icon} alt={b.id} />
            </button>

            {/* Settings Panel */}
            {(b.id === "settings" && (openPanel === "settings" || closingPanel === "settings")) && (
              <div
                key={`settings-panel-${openPanel === "settings" ? "open" : "closing"}`}
                className={`live2d-right-toolbar__panel live2d-right-toolbar__panel--settings${
                  closingPanel === "settings" && openPanel !== "settings" ? " live2d-right-toolbar__panel--exit" : ""
                }`}
                role="menu"
              >
                {settingsToggleRows.map((x) => (
                  <label key={x.id} className="live2d-right-toolbar__row" data-disabled="false">
                    <input
                      type="checkbox"
                      className="live2d-right-toolbar__checkbox"
                      checked={x.checked}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSettingsChange(x.id as any, e.target.checked)}
                    />
                    <span className="live2d-right-toolbar__indicator" aria-hidden="true">
                      <span className="live2d-right-toolbar__checkmark">✓</span>
                    </span>
                    <span className="live2d-right-toolbar__label">{x.label}</span>
                  </label>
                ))}

                {!isMobile && (
                  <>
                    <div className="live2d-right-toolbar__separator" />
                    {settingsMenuItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="live2d-right-toolbar__menuItem"
                        onClick={() => onSettingsMenuClick?.(item.id)}
                      >
                        <span className="live2d-right-toolbar__menuItemContent">
                          <img
                            className="live2d-right-toolbar__menuIcon"
                            src={item.icon}
                            alt={item.label}
                          />
                          {item.label}
                        </span>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}

            {/* Agent Panel */}
            {(b.id === "agent" && (openPanel === "agent" || closingPanel === "agent")) && (
              <div
                key={`agent-panel-${openPanel === "agent" ? "open" : "closing"}`}
                className={`live2d-right-toolbar__panel live2d-right-toolbar__panel--agent${
                  closingPanel === "agent" && openPanel !== "agent" ? " live2d-right-toolbar__panel--exit" : ""
                }`}
                role="menu"
              >
                <div id="live2d-agent-status" className="live2d-right-toolbar__status">
                  {agent.statusText}
                </div>
                {agentToggleRows.map((x) => (
                  <label
                    key={x.id}
                    className="live2d-right-toolbar__row"
                    data-disabled={x.disabled ? "true" : "false"}
                    title={x.disabled ? "查询中..." : undefined}
                  >
                    <input
                      type="checkbox"
                      className="live2d-right-toolbar__checkbox"
                      checked={x.checked}
                      disabled={x.disabled}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onAgentChange(x.id as any, e.target.checked)}
                    />
                    <span className="live2d-right-toolbar__indicator" aria-hidden="true">
                      <span className="live2d-right-toolbar__checkmark">✓</span>
                    </span>
                    <span className="live2d-right-toolbar__label">{x.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
