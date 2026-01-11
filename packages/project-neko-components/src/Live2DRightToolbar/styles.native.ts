/**
 * Live2DRightToolbar React Native 样式
 */

import { StyleSheet, Platform } from 'react-native';

export const styles = StyleSheet.create({
  // 浮动按钮容器
  container: {
    position: 'absolute',
    zIndex: 99999,
    flexDirection: 'column',
  },

  // 按钮
  button: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },

  buttonActive: {
    backgroundColor: 'rgba(68, 183, 254, 0.9)',
  },

  returnButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },

  icon: {
    width: '76%',
    height: '76%',
    resizeMode: 'contain',
  },

  // Modal 覆盖层
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // 面板容器
  panelContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 20,
    width: '85%',
    maxHeight: '70%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },

  panelTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },

  // Agent 状态文本
  statusText: {
    fontSize: 13,
    color: '#44b7fe',
    padding: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(68, 183, 254, 0.1)',
    marginBottom: 16,
    textAlign: 'center',
  },

  // 滚动视图
  scrollView: {
    maxHeight: 400,
  },

  // Toggle 行
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    marginBottom: 8,
  },

  rowDisabled: {
    opacity: 0.5,
  },

  // Label
  label: {
    fontSize: 15,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },

  labelDisabled: {
    color: '#999',
  },

  // 分隔线
  separator: {
    height: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    marginVertical: 12,
  },

  // 菜单项
  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    marginBottom: 8,
  },

  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  menuIcon: {
    width: 18,
    height: 18,
    resizeMode: 'contain',
  },

  menuItemText: {
    fontSize: 15,
    color: '#333',
    marginLeft: 10,
    flex: 1,
  },

  // 关闭按钮
  closeButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#44b7fe',
    borderRadius: 8,
    alignItems: 'center',
  },

  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
