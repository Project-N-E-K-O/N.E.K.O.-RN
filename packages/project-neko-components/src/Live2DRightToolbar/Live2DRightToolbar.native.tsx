/**
 * Live2DRightToolbar - React Native 版本
 * 
 * 使用 RN 组件实现的简化版工具栏
 * - 浮动按钮组
 * - Modal 面板（替代浮动面板）
 * - 原生 Switch 组件
 */

import React from 'react';
import {
  View,
  TouchableOpacity,
  Image,
  Modal,
  ScrollView,
  Switch,
  Text,
  TouchableWithoutFeedback,
} from 'react-native';
import { useT } from '../i18n';
import {
  usePanelToggle,
  useToolbarButtons,
  useSettingsToggleRows,
  useAgentToggleRows,
} from './hooks';
import type { Live2DRightToolbarProps, Live2DSettingsMenuId } from './types';
import { styles } from './styles.native';

export * from './types';

export function Live2DRightToolbar({
  visible = true,
  right = 24,
  bottom,
  top = 24,
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

  // 使用共享的面板切换逻辑
  const { togglePanel } = usePanelToggle(openPanel, onOpenPanelChange);

  // 使用共享的按钮配置（RN 使用本地 require() 资源）
  const buttons = useToolbarButtons<number>({
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
    // RN: 使用本地打包的图标资源（确保这些文件存在于 assets/icons/）
    icons: {
      mic: require('../../../assets/icons/mic_icon_off.png'),
      screen: require('../../../assets/icons/screen_icon_off.png'),
      agent: require('../../../assets/icons/Agent_off.png'),
      settings: require('../../../assets/icons/set_off.png'),
      goodbye: require('../../../assets/icons/rest_off.png'),
    },
  });

  // 使用共享的 toggle rows 配置
  const settingsToggleRows = useSettingsToggleRows(settings, t);
  const agentToggleRows = useAgentToggleRows(agent, t);

  if (!visible) return null;

  return (
    <>
      {/* 浮动按钮组 */}
      <View style={[styles.container, { right, top: top ?? undefined, bottom: bottom ?? undefined }]}>
        {goodbyeMode ? (
          <TouchableOpacity
            style={[styles.button, styles.returnButton]}
            onPress={onReturn}
            activeOpacity={0.7}
          >
            <Image
              source={require('../../../assets/icons/rest_off.png')}
              style={styles.icon}
            />
          </TouchableOpacity>
        ) : (
          buttons.map((button) => (
            <TouchableOpacity
              key={button.id}
              style={[styles.button, button.active && styles.buttonActive]}
              onPress={button.onClick}
              activeOpacity={0.7}
            >
              <Image source={button.icon} style={styles.icon} />
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Agent Panel Modal */}
      <Modal
        visible={openPanel === 'agent'}
        transparent
        animationType="slide"
        onRequestClose={() => onOpenPanelChange(null)}
      >
        <TouchableWithoutFeedback onPress={() => onOpenPanelChange(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.panelContainer}>
                <Text style={styles.statusText}>{agent.statusText}</Text>

                <ScrollView style={styles.scrollView}>
                  {agentToggleRows.map((row) => (
                    <View
                      key={row.id}
                      style={[styles.row, row.disabled && styles.rowDisabled]}
                    >
                      <Switch
                        value={row.checked}
                        onValueChange={(value) => onAgentChange(row.id as any, value)}
                        disabled={row.disabled}
                        trackColor={{ false: '#ccc', true: '#44b7fe' }}
                        thumbColor="#fff"
                      />
                      <Text style={[styles.label, row.disabled && styles.labelDisabled]}>
                        {row.label}
                      </Text>
                    </View>
                  ))}
                </ScrollView>

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => onOpenPanelChange(null)}
                >
                  <Text style={styles.closeButtonText}>{t('close')}</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Settings Panel Modal */}
      <Modal
        visible={openPanel === 'settings'}
        transparent
        animationType="slide"
        onRequestClose={() => onOpenPanelChange(null)}
      >
        <TouchableWithoutFeedback onPress={() => onOpenPanelChange(null)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.panelContainer}>
                <Text style={styles.panelTitle}>{t('settings')}</Text>

                <ScrollView style={styles.scrollView}>
                  {/* Settings Toggles */}
                  {settingsToggleRows.map((row) => (
                    <View key={row.id} style={styles.row}>
                      <Switch
                        value={row.checked}
                        onValueChange={(value) => onSettingsChange(row.id as any, value)}
                        trackColor={{ false: '#ccc', true: '#44b7fe' }}
                        thumbColor="#fff"
                      />
                      <Text style={styles.label}>{row.label}</Text>
                    </View>
                  ))}

                  {/* Settings Menu Items (仅非移动端) */}
                  {!isMobile && (
                    <>
                      <View style={styles.separator} />
                      <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => onSettingsMenuClick?.('live2dSettings')}
                      >
                        <Text style={styles.menuItemText}>{t('live2dSettings')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => onSettingsMenuClick?.('apiKeys')}
                      >
                        <Text style={styles.menuItemText}>{t('apiKeys')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => onSettingsMenuClick?.('characterManage')}
                      >
                        <Text style={styles.menuItemText}>{t('characterManage')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => onSettingsMenuClick?.('voiceClone')}
                      >
                        <Text style={styles.menuItemText}>{t('voiceClone')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => onSettingsMenuClick?.('memoryBrowser')}
                      >
                        <Text style={styles.menuItemText}>{t('memoryBrowser')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => onSettingsMenuClick?.('steamWorkshop')}
                      >
                        <Text style={styles.menuItemText}>{t('steamWorkshop')}</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </ScrollView>

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => onOpenPanelChange(null)}
                >
                  <Text style={styles.closeButtonText}>{t('close')}</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}
