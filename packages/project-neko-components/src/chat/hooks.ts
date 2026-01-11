/**
 * Chat 组件共享业务逻辑
 * 用于 Web 和 RN 版本复用
 */

import { useState, useCallback } from 'react';
import type { ChatMessage, PendingScreenshot } from './types';

/** 生成跨环境安全的 id */
export function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 聊天状态管理 Hook
 */
export function useChatState() {
  const [collapsed, setCollapsed] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingScreenshots, setPendingScreenshots] = useState<PendingScreenshot[]>([]);

  const addMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const addMessages = useCallback((newMessages: ChatMessage[]) => {
    setMessages((prev) => [...prev, ...newMessages]);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    collapsed,
    setCollapsed,
    messages,
    setMessages,
    addMessage,
    addMessages,
    clearMessages,
    pendingScreenshots,
    setPendingScreenshots,
  };
}

/**
 * 发送消息逻辑（Web 和 RN 共享）
 */
export function useSendMessage(
  addMessages: (messages: ChatMessage[]) => void,
  pendingScreenshots: PendingScreenshot[],
  clearPendingScreenshots: () => void
) {
  const handleSendText = useCallback(
    (text: string) => {
      if (!text.trim() && pendingScreenshots.length === 0) return;

      const newMessages: ChatMessage[] = [];
      let timestamp = Date.now();

      // 先发送截图
      pendingScreenshots.forEach((p) => {
        newMessages.push({
          id: generateId(),
          role: "user",
          image: p.base64,
          createdAt: timestamp++,
        });
      });

      // 再发送文本
      if (text.trim()) {
        newMessages.push({
          id: generateId(),
          role: "user",
          content: text,
          createdAt: timestamp,
        });
      }

      addMessages(newMessages);
      clearPendingScreenshots();
    },
    [addMessages, pendingScreenshots, clearPendingScreenshots]
  );

  return { handleSendText };
}

/**
 * Web 专用：截图功能（使用 navigator.mediaDevices）
 * RN 中不可用，需要使用原生模块
 */
export function useWebScreenshot(
  setPendingScreenshots: React.Dispatch<React.SetStateAction<PendingScreenshot[]>>,
  onUnsupported?: () => void,
  onError?: () => void
) {
  const handleScreenshot = useCallback(async () => {
    // 检查浏览器支持
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
      onUnsupported?.();
      return;
    }

    let stream: MediaStream | null = null;
    const video = document.createElement("video");

    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      video.srcObject = stream;
      await video.play();

      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        onError?.();
        return;
      }

      ctx.drawImage(video, 0, 0);
      const base64 = canvas.toDataURL("image/png");

      setPendingScreenshots((prev) => [
        ...prev,
        { id: generateId(), base64 },
      ]);
    } catch (error) {
      console.error('截图失败:', error);
      onError?.();
    } finally {
      if (stream) stream.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
    }
  }, [setPendingScreenshots, onUnsupported, onError]);

  return { handleScreenshot };
}
