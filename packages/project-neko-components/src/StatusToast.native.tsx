/**
 * StatusToast - React Native 版本
 *
 * 使用 React Native Animated API 实现的 Toast 通知：
 * - 自动淡入淡出动画
 * - 自动隐藏
 * - 与 Web 版本相同的 ref API
 *
 * @platform Android/iOS - 原生实现
 * @see StatusToast.tsx - Web 版本（Portal + CSS 实现）
 */

import React, {
  useState,
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
  useEffect,
} from 'react';
import {
  View,
  Text,
  Animated,
  StyleSheet,
  Dimensions,
} from 'react-native';

export interface StatusToastProps {
  /**
   * 可选：静态资源根路径（RN 中暂不使用背景图）
   */
  staticBaseUrl?: string;
}

interface StatusToastState {
  message: string;
  duration: number;
  isVisible: boolean;
}

export interface StatusToastHandle {
  show: (message: string, duration?: number) => void;
}

const { width: screenWidth } = Dimensions.get('window');

const StatusToast = forwardRef<StatusToastHandle | null, StatusToastProps>(
  function StatusToastComponent(_props, ref) {
    const [toastState, setToastState] = useState<StatusToastState>({
      message: '',
      duration: 3000,
      isVisible: false,
    });

    // 动画值
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(-20)).current;

    // 定时器
    const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const clearTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    // 清理定时器
    const clearTimers = useCallback(() => {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
        hideTimer.current = null;
      }
      if (clearTimer.current) {
        clearTimeout(clearTimer.current);
        clearTimer.current = null;
      }
    }, []);

    // 显示 Toast
    const showToast = useCallback(
      (message: string, duration: number = 3000) => {
        clearTimers();

        if (!message || message.trim() === '') {
          // 隐藏 Toast
          Animated.parallel([
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(translateY, {
              toValue: -20,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(() => {
            setToastState((prev) => ({ ...prev, isVisible: false, message: '' }));
          });
          return;
        }

        // 更新状态并显示
        setToastState({
          message,
          duration,
          isVisible: true,
        });

        // 淡入动画
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();

        // 计时自动隐藏
        hideTimer.current = setTimeout(() => {
          Animated.parallel([
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(translateY, {
              toValue: -20,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(() => {
            clearTimer.current = setTimeout(() => {
              setToastState((prev) => ({ ...prev, isVisible: false, message: '' }));
            }, 100);
          });
        }, duration);
      },
      [fadeAnim, translateY, clearTimers]
    );

    useImperativeHandle(
      ref,
      () => ({
        show: showToast,
      }),
      [showToast]
    );

    // 卸载时清理定时器
    useEffect(() => {
      return () => {
        clearTimers();
      };
    }, [clearTimers]);

    // 不显示时返回 null
    if (!toastState.isVisible || !toastState.message) {
      return null;
    }

    return (
      <Animated.View
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [{ translateY }],
          },
        ]}
        pointerEvents="none"
      >
        <View style={styles.toast}>
          <Text style={styles.text} numberOfLines={2}>
            {toastState.message}
          </Text>
        </View>
      </Animated.View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 99999,
  },
  toast: {
    maxWidth: screenWidth - 48,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  text: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export { StatusToast };
export default StatusToast;
