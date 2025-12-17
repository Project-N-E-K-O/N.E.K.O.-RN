import { useCallback, useState } from 'react';

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'gemini' | 'system';
  timestamp: string;
  isComplete?: boolean; // 标记消息是否完成（用于流式消息）
}

interface UseChatMessagesConfig {
  maxMessages?: number; // 最大消息数量
  onMessageAdded?: (message: ChatMessage) => void;
  onMessageUpdated?: (message: ChatMessage) => void;
}

export const useChatMessages = (config: UseChatMessagesConfig = {}) => {
  const { maxMessages = 100, onMessageAdded, onMessageUpdated } = config;

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // 获取当前时间字符串
  const getCurrentTimeString = useCallback(() => {
    return new Date().toLocaleTimeString('zh-CN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }, []);

  // 添加新消息
  const addMessage = useCallback((
    text: string, 
    sender: ChatMessage['sender'] = 'system',
    options?: { skipTimestamp?: boolean; isComplete?: boolean }
  ) => {
    const timestamp = getCurrentTimeString();
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      text: options?.skipTimestamp ? text : `[${timestamp}] ${sender === 'gemini' ? '🎀' : sender === 'user' ? '👤' : '📢'} ${text}`,
      sender,
      timestamp,
      isComplete: options?.isComplete ?? true,
    };

    setMessages(prevMessages => {
      const updatedMessages = [...prevMessages, newMessage];
      // 限制消息数量
      if (updatedMessages.length > maxMessages) {
        return updatedMessages.slice(-maxMessages);
      }
      return updatedMessages;
    });

    onMessageAdded?.(newMessage);
    console.log(`✨ 新消息 [${sender}]: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`);

    return newMessage.id;
  }, [getCurrentTimeString, maxMessages, onMessageAdded]);

  // 追加文本到最后一条消息（用于流式响应）
  const appendToLastMessage = useCallback((
    text: string,
    sender: ChatMessage['sender'] = 'gemini'
  ) => {
    setMessages(prevMessages => {
      // 查找最后一个指定 sender 的消息
      const lastIndex = prevMessages.map(msg => msg.sender).lastIndexOf(sender);
      
      if (lastIndex !== -1) {
        console.log(`📝 追加到消息 [${lastIndex}]: ${text.substring(0, 30)}${text.length > 30 ? '...' : ''}`);
        const updatedMessages = prevMessages.map((msg, index) => {
          if (index === lastIndex) {
            const updatedMsg = { ...msg, text: msg.text + text };
            onMessageUpdated?.(updatedMsg);
            return updatedMsg;
          }
          return msg;
        });
        return updatedMessages;
      } else {
        // 如果没有找到对应的消息，创建新消息
        console.log(`⚠️ 未找到 ${sender} 消息，创建新消息`);
        const timestamp = getCurrentTimeString();
        const newMessage: ChatMessage = {
          id: Date.now().toString(),
          text: `[${timestamp}] ${sender === 'gemini' ? '🎀' : '👤'} ${text}`,
          sender,
          timestamp,
          isComplete: false,
        };
        onMessageAdded?.(newMessage);
        return [...prevMessages, newMessage];
      }
    });
  }, [getCurrentTimeString, onMessageAdded, onMessageUpdated]);

  // 标记最后一条消息为完成状态
  const markLastMessageComplete = useCallback((sender: ChatMessage['sender'] = 'gemini') => {
    setMessages(prevMessages => {
      const lastIndex = prevMessages.map(msg => msg.sender).lastIndexOf(sender);
      if (lastIndex !== -1) {
        console.log(`✅ 标记消息 [${lastIndex}] 为完成状态`);
        return prevMessages.map((msg, index) =>
          index === lastIndex ? { ...msg, isComplete: true } : msg
        );
      }
      return prevMessages;
    });
  }, []);

  // 获取最后一条消息
  const getLastMessage = useCallback((sender?: ChatMessage['sender']): ChatMessage | undefined => {
    if (!sender) {
      return messages[messages.length - 1];
    }
    
    const filtered = messages.filter(msg => msg.sender === sender);
    return filtered[filtered.length - 1];
  }, [messages]);

  // 获取最后一条完整的消息文本（去除时间戳和表情符号）
  const getLastMessageText = useCallback((sender: ChatMessage['sender'] = 'gemini'): string | undefined => {
    const lastMessage = getLastMessage(sender);
    if (!lastMessage) return undefined;
    
    // 移除时间戳和表情符号前缀
    return lastMessage.text.replace(/^\[\d{2}:\d{2}:\d{2}\] [🎀👤📢] /, '');
  }, [getLastMessage]);

  // 清空所有消息
  const clearMessages = useCallback(() => {
    console.log('🧹 清空所有消息');
    setMessages([]);
  }, []);

  // 删除指定消息
  const deleteMessage = useCallback((messageId: string) => {
    console.log('🗑️ 删除消息:', messageId);
    setMessages(prevMessages => prevMessages.filter(msg => msg.id !== messageId));
  }, []);

  // 处理 WebSocket 消息（整合了 audio-test.tsx 的逻辑）
  const handleWebSocketMessage = useCallback(async (event: MessageEvent) => {
    console.log('📨 收到 WebSocket 消息:', typeof event.data);

    // 处理二进制数据（音频数据不在这里处理，由 useAudio 处理）
    if (event.data instanceof Blob || event.data instanceof ArrayBuffer) {
      return null; // 返回 null 表示这不是文本消息
    }

    // 处理文本消息
    if (typeof event.data === 'string') {
      try {
        const parsed = JSON.parse(event.data);
        console.log('📄 解析的消息:', parsed);

        if (parsed.type === 'gemini_response') {
          const isNewMessage = parsed.isNewMessage || false;
          const text = parsed.text || '';
          
          console.log(`🎀 Gemini 响应: isNewMessage=${isNewMessage}, text="${text.substring(0, 50)}"`);
          
          if (isNewMessage) {
            // 先标记上一条消息为完成
            markLastMessageComplete('gemini');
            // 创建新消息
            addMessage(text, 'gemini', { isComplete: false });
          } else {
            // 追加到现有消息
            appendToLastMessage(text, 'gemini');
          }
          
          return { type: 'gemini_response', isNewMessage, text };
        } 
        
        else if (parsed.type === 'user_activity') {
          console.log('🎤 检测到用户语音活动');
          return { type: 'user_activity' };
        } 
        
        else if (parsed.type === 'status') {
          console.log('ℹ️ 状态消息:', parsed.message || parsed.data);
          addMessage(parsed.message || JSON.stringify(parsed.data), 'system');
          return { type: 'status', data: parsed };
        } 
        
        else if (parsed.type === 'system' && parsed.data === 'turn end') {
          console.log('🏁 回合结束');
          markLastMessageComplete('gemini');
          return { type: 'turn_end', fullText: getLastMessageText('gemini') };
        }
        
        else {
          console.log('📋 其他类型消息:', parsed.type);
          return { type: 'other', data: parsed };
        }
      } catch (e) {
        console.log('📝 普通文本消息:', event.data);
        addMessage(event.data, 'system');
        return { type: 'text', text: event.data };
      }
    }

    return null;
  }, [addMessage, appendToLastMessage, markLastMessageComplete, getLastMessageText]);

  return {
    // 状态
    messages,
    messageCount: messages.length,
    
    // 方法
    addMessage,
    appendToLastMessage,
    markLastMessageComplete,
    getLastMessage,
    getLastMessageText,
    clearMessages,
    deleteMessage,
    
    // WebSocket 消息处理
    handleWebSocketMessage,
  };
};

