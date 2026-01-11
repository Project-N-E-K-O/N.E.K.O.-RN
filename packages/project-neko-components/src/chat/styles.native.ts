/**
 * ChatContainer - React Native 样式
 */

import { StyleSheet, Platform } from 'react-native';

export const styles = StyleSheet.create({
  // ===== 浮动按钮（缩小态） =====
  floatingButton: {
    position: 'absolute',
    left: 16,
    bottom: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#44b7fe',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    ...Platform.select({
      ios: {
        shadowColor: '#44b7fe',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 24,
      },
      android: {
        elevation: 8,
      },
    }),
  },

  floatingButtonEmoji: {
    fontSize: 22,
    color: '#fff',
  },

  // ===== Modal 遮罩和面板 =====
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  chatPanel: {
    width: '90%',
    maxWidth: 400,
    height: '70%',
    maxHeight: 520,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.2,
        shadowRadius: 32,
      },
      android: {
        elevation: 12,
      },
    }),
  },

  // ===== Header =====
  header: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.06)',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },

  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },

  minimizeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e6f4ff',
    alignItems: 'center',
    justifyContent: 'center',
  },

  minimizeButtonText: {
    fontSize: 16,
    color: '#44b7fe',
    lineHeight: 16,
  },

  // ===== 消息列表 =====
  messageList: {
    flex: 1,
  },

  messageListContent: {
    padding: 12,
    gap: 12,
  },

  messageBubble: {
    maxWidth: '80%',
    borderRadius: 8,
    padding: 8,
  },

  messageBubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(68, 183, 254, 0.15)',
  },

  messageBubbleOther: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },

  messageImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },

  messageText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },

  messageTextEmpty: {
    fontSize: 14,
    color: '#999',
    opacity: 0.5,
  },

  // ===== 待发送截图预览 =====
  pendingContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 12,
  },

  pendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },

  pendingTitle: {
    fontSize: 12,
    color: '#44b7fe',
    fontWeight: '500',
  },

  clearAllButton: {
    backgroundColor: '#ff4d4f',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
  },

  clearAllButtonText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '500',
  },

  pendingList: {
    flexDirection: 'row',
  },

  pendingItem: {
    position: 'relative',
    marginRight: 8,
  },

  pendingImage: {
    width: 60,
    height: 60,
    borderRadius: 6,
  },

  removeButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ff4d4f',
    alignItems: 'center',
    justifyContent: 'center',
  },

  removeButtonText: {
    fontSize: 14,
    color: '#fff',
    lineHeight: 14,
  },

  // ===== 输入区域 =====
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.06)',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 12,
    gap: 8,
  },

  textInput: {
    minHeight: 80,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: 'top',
  },

  buttonGroup: {
    flexDirection: 'row',
    gap: 8,
  },

  sendButton: {
    flex: 1,
    backgroundColor: '#44b7fe',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },

  sendButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },

  screenshotButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderWidth: 1,
    borderColor: '#44b7fe',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },

  screenshotButtonText: {
    fontSize: 13,
    color: '#44b7fe',
    fontWeight: '500',
  },
});
