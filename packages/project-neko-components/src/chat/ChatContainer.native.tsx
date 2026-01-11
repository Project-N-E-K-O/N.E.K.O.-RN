/**
 * ChatContainer - React Native 版本
 * 
 * 使用 React Native 组件实现的聊天界面：
 * - TouchableOpacity 浮动按钮（缩小态）
 * - Modal 聊天面板（展开态）
 * - ScrollView 消息列表
 * - TextInput 输入框
 * 
 * @platform Android/iOS - 原生实现
 * @see ChatContainer.tsx - Web 版本（HTML/CSS 实现）
 */

import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  TouchableWithoutFeedback,
  Image,
  Alert,
} from 'react-native';
import { useT, tOrDefault } from '../i18n';
import { useChatState, useSendMessage, generateId } from './hooks';
import type { ChatMessage } from './types';
import { styles } from './styles.native';

export default function ChatContainer() {
  const t = useT();

  // 使用共享的状态管理
  const {
    collapsed,
    setCollapsed,
    messages,
    setMessages,
    addMessages,
    pendingScreenshots,
    setPendingScreenshots,
  } = useChatState();

  // 输入框状态
  const [inputValue, setInputValue] = React.useState('');

  // 初始化欢迎消息
  React.useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'sys-1',
          role: 'system',
          content: tOrDefault(
            t,
            'chat.welcome',
            '欢迎来到 React 聊天系统（迁移 Demo）'
          ),
          createdAt: Date.now(),
        },
      ]);
    }
  }, [messages.length, setMessages, t]);

  // 发送消息逻辑
  const { handleSendText } = useSendMessage(
    addMessages,
    pendingScreenshots,
    () => setPendingScreenshots([])
  );

  // RN 发送处理（清空输入框）
  const handleSend = () => {
    if (!inputValue.trim() && pendingScreenshots.length === 0) return;
    handleSendText(inputValue);
    setInputValue('');
  };

  // RN 暂不支持截图功能
  const handleTakePhoto = async () => {
    Alert.alert(
      tOrDefault(t, 'chat.screenshot.title', '截图功能'),
      tOrDefault(
        t,
        'chat.screenshot.unavailable',
        'RN 版本暂不支持截图功能，请在 Web 版本中使用'
      )
    );
  };

  // 渲染单个消息
  const renderMessage = (msg: ChatMessage) => {
    const isUser = msg.role === 'user';
    
    return (
      <View
        key={msg.id}
        style={[
          styles.messageBubble,
          isUser ? styles.messageBubbleUser : styles.messageBubbleOther,
        ]}
      >
        {msg.image && (
          <Image
            source={{ uri: msg.image }}
            style={styles.messageImage}
            resizeMode="cover"
          />
        )}
        {msg.content && (
          <Text style={styles.messageText}>{msg.content}</Text>
        )}
        {!msg.content && !msg.image && (
          <Text style={styles.messageTextEmpty}>
            {tOrDefault(t, 'chat.message.empty', '空消息')}
          </Text>
        )}
      </View>
    );
  };

  // ===== 缩小态：浮动按钮 =====
  if (collapsed) {
    return (
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setCollapsed(false)}
        activeOpacity={0.8}
      >
        <Text style={styles.floatingButtonEmoji}>💬</Text>
      </TouchableOpacity>
    );
  }

  // ===== 展开态：Modal 聊天面板 =====
  return (
    <Modal
      visible={!collapsed}
      transparent
      animationType="slide"
      onRequestClose={() => setCollapsed(true)}
    >
      <TouchableWithoutFeedback onPress={() => setCollapsed(true)}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.chatPanel}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.headerTitle}>
                  {tOrDefault(t, 'chat.title', '💬 Chat')}
                </Text>
                <TouchableOpacity
                  style={styles.minimizeButton}
                  onPress={() => setCollapsed(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.minimizeButtonText}>—</Text>
                </TouchableOpacity>
              </View>

              {/* 消息列表 */}
              <ScrollView
                style={styles.messageList}
                contentContainerStyle={styles.messageListContent}
              >
                {messages.map(renderMessage)}
              </ScrollView>

              {/* 待发送截图预览（RN 暂不支持） */}
              {pendingScreenshots.length > 0 && (
                <View style={styles.pendingContainer}>
                  <View style={styles.pendingHeader}>
                    <Text style={styles.pendingTitle}>
                      {tOrDefault(
                        t,
                        'chat.screenshot.pending',
                        `📸 待发送截图 (${pendingScreenshots.length})`
                      )}
                    </Text>
                    <TouchableOpacity
                      style={styles.clearAllButton}
                      onPress={() => setPendingScreenshots([])}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.clearAllButtonText}>
                        {tOrDefault(t, 'chat.screenshot.clearAll', '清除全部')}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <ScrollView horizontal style={styles.pendingList}>
                    {pendingScreenshots.map((p) => (
                      <View key={p.id} style={styles.pendingItem}>
                        <Image
                          source={{ uri: p.base64 }}
                          style={styles.pendingImage}
                          resizeMode="cover"
                        />
                        <TouchableOpacity
                          style={styles.removeButton}
                          onPress={() =>
                            setPendingScreenshots((prev) =>
                              prev.filter((x) => x.id !== p.id)
                            )
                          }
                          activeOpacity={0.7}
                        >
                          <Text style={styles.removeButtonText}>×</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* 输入区域 */}
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  value={inputValue}
                  onChangeText={setInputValue}
                  placeholder={tOrDefault(
                    t,
                    'chat.input.placeholder',
                    'Text chat mode...'
                  )}
                  placeholderTextColor="rgba(0, 0, 0, 0.4)"
                  multiline
                  blurOnSubmit={false}
                />

                <View style={styles.buttonGroup}>
                  <TouchableOpacity
                    style={styles.sendButton}
                    onPress={handleSend}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.sendButtonText}>
                      {tOrDefault(t, 'chat.send', '发送')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.screenshotButton}
                    onPress={handleTakePhoto}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.screenshotButtonText}>
                      {tOrDefault(t, 'chat.screenshot.button', '截图')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
