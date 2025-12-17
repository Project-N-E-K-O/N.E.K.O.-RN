import { useFocusEffect } from '@react-navigation/native';
import { Directory, File, Paths } from 'expo-file-system';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ReactNativeLive2dView } from 'react-native-live2d';
import { downloadDependenciesFromLocalModel, removeDownloadedModel } from '../utils/live2dDownloader';

function printDirectory(directory: Directory, indent: number = 0) {
  console.log(`${' '.repeat(indent)} + ${directory.name} - ${directory.uri}`);
  const contents = directory.list();
  for (const item of contents) {
    if (item instanceof Directory) {
      printDirectory(item, indent + 2);
    } else {
      console.log(`${' '.repeat(indent + 2)} - ${item.name} - (${item.size} bytes)`);
    }
  }
}

interface RNLive2dProps { }

const RNLive2d: React.FC<RNLive2dProps> = () => {
  // 模型配置常量
  const BACKEND_SCHEME = 'http';
  const BACKEND_HOST = '192.168.88.38';
  // const BACKEND_HOST = '192.168.50.66';
  const BACKEND_PORT = 8081;
  const LIVE2D_PATH = 'live2d';
  const MODEL_NAME = 'mao_pro';
  const MODEL_BASE_URL = `${BACKEND_SCHEME}://${BACKEND_HOST}:${BACKEND_PORT}/${LIVE2D_PATH}/${MODEL_NAME}`;

  const [currentMotion, setCurrentMotion] = useState('Idle');
  const [currentExpression, setCurrentExpression] = useState('exp_exp_01');
  const [modelState, setModelState] = useState<{
    path: string | undefined;
    isReady: boolean;
  }>({
    path: undefined,
    isReady: false,
  });
  const [scale, setScale] = useState(0.8);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPageFocused, setIsPageFocused] = useState(true);
  const hasShownLoadedToastRef = useRef(false);

  const motions = ['Idle', 'happy', 'neutral', 'surprised', 'sad'];
  const expressions = ['exp_exp_01', 'exp_exp_02', 'exp_exp_03', 'exp_exp_04', 'exp_exp_05', 'exp_exp_07', 'exp_exp_08'];

  // 验证模型文件是否存在的辅助函数
  const validateModelFiles = (): boolean => {
    try {
      const modelFile = new File(Paths.cache, `live2d/${MODEL_NAME}/${MODEL_NAME}.model3.json`);
      const mocFile = new File(Paths.cache, `live2d/${MODEL_NAME}/mao_pro.moc3`);
      const textureFile = new File(Paths.cache, `live2d/${MODEL_NAME}/mao_pro.4096/texture_00.png`);
      
      return modelFile.exists && mocFile.exists && textureFile.exists;
    } catch (error) {
      console.error('验证模型文件失败:', error);
      return false;
    }
  };

  // 注意：原生视图在 onDetachedFromWindow 中会自行释放模型和GL资源
  // 为避免 Expo Refresh 时出现双重释放与竞态，这里不再在卸载时手动 release

  // 当模型路径变化时，重置已展示提示标记
  useEffect(() => {
    if (modelState.path) {
      // 重置已展示提示标记，避免重复提示
      hasShownLoadedToastRef.current = false;
    }
  }, [modelState.path]);

  // 页面焦点管理 - 当页面切换时处理 Live2D 资源
  useFocusEffect(
    useCallback(() => {
      console.log('Live2D页面获得焦点');
      
      // 设置页面为焦点状态
      setIsPageFocused(true);
      
      return () => {
        console.log('Live2D页面失去焦点');
        // 设置页面为失去焦点状态
        setIsPageFocused(false);
        // 页面失去焦点时，原生视图会自动处理资源清理
        // 这里不需要手动清理，因为 onDetachedFromWindow 会处理
        // TODO: 目前是手动卸载然后手动加载，需要处理模型自动加载逻辑，否则会出现模型无法加载的问题
        setModelState(prev => ({ ...prev, path: undefined, isReady: false }));
      };
    }, [])
  );

  const handleModelLoaded = () => {
    if (!hasShownLoadedToastRef.current) {
      console.log('来自Live2D的模型加载完成事件', 'Live2D 模型加载完成！');
      hasShownLoadedToastRef.current = true;
    }
  };

  const handleError = (error: string) => {
    console.log('来自Live2D的错误', error);
  };


  const handleTap = () => {
    // 随机播放一个动作
    const randomMotion = motions[Math.floor(Math.random() * motions.length)];
    setCurrentMotion(randomMotion);
    setScale(1.2);
    setPosition({ x: 0, y: -0.3 });
    // 未测试是否有效
    // changeExpression('exp_exp_01');
  };

  const changeExpression = (expression: string) => {
    setCurrentExpression(expression);
  };

  const viewDirectory = async () => {
    const destination = new Directory(Paths.cache, 'live2d');
    printDirectory(destination);
  };

  const loadModel = async () => {
    try {
      console.log('开始加载模型...');
      const modelUrl = `${MODEL_BASE_URL}/${MODEL_NAME}.model3.json`;
      
      // 创建目录结构
      const cacheDir = new Directory(Paths.cache, 'live2d');
      if (!cacheDir.exists) {
        cacheDir.create();
        console.log('创建缓存目录:', cacheDir.uri);
      }

      const modelDir = new Directory(cacheDir, MODEL_NAME);
      if (!modelDir.exists) {
        modelDir.create();
        console.log('创建模型目录:', modelDir.uri);
      }

      // 构建本地路径
      const localPath = `${modelDir.uri}${MODEL_NAME}.model3.json`;
      console.log('Local model path:', localPath);

      // 检查模型文件是否存在
      const modelFile = new File(modelDir, `${MODEL_NAME}.model3.json`);
      
      if (!modelFile.exists) {
        console.log('模型文件不存在，开始下载...');
        try {
          await File.downloadFileAsync(modelUrl, modelDir);
          console.log('模型文件下载完成');
        } catch (error) {
          console.error('模型文件下载失败:', error);
          throw error;
        }
      } else {
        console.log('模型文件已存在');
      }

      // 检查依赖文件是否完整
      const mocFile = new File(modelDir, 'mao_pro.moc3');
      const textureFile = new File(modelDir, 'mao_pro.4096/texture_00.png');
      
      if (!mocFile.exists || !textureFile.exists) {
        console.log('依赖文件缺失，下载依赖文件...');
        await downloadDependenciesFromLocalModel(localPath, modelUrl);
        console.log('依赖文件下载完成');
      } else {
        console.log('所有文件都存在，跳过下载');
      }

      // 最终验证所有文件
      if (validateModelFiles()) {
        setModelState(prev => ({ ...prev, path: localPath, isReady: true }));
        console.log('Model loaded successfully');
      } else {
        throw new Error('模型文件验证失败');
      }

    } catch (error) {
      console.error('Load error:', error);
      Alert.alert('错误', `加载失败: ${error}`);
      setModelState(prev => ({ ...prev, path: undefined, isReady: false }));
    }
  };

  const clearDownloaded = async () => {
    console.log('clearDownloaded', modelState);
    // 先释放Live2D模型资源
    if (modelState.path && modelState.isReady) {
      setModelState(prev => ({ ...prev, path: undefined, isReady: false }));
      await removeDownloadedModel(`live2d/${MODEL_NAME}/`);
      console.log('Model cache cleared');
    }
  };

  return (
    <View style={styles.container}>

      <View style={styles.live2dContainer}>
          {isPageFocused && (
            <ReactNativeLive2dView
              style={{ flex: 1 }}
              modelPath={modelState.isReady && modelState.path ? modelState.path : undefined}
              motionGroup={currentMotion}
              expression={currentExpression}
              autoBreath={true}
              autoBlink={true}
              scale={scale}
              position={position}
              onModelLoaded={handleModelLoaded}
              onError={handleError}
              onTap={handleTap}
            />
          )}
          {!isPageFocused && (
            <View style={styles.placeholderContainer}>
              <Text style={styles.placeholderText}>页面失去焦点，Live2D 已暂停</Text>
            </View>
          )}
      </View>

      <View style={styles.controls}>
        {/* <Text style={styles.controlTitle}>动作控制</Text>
        <View style={styles.buttonRow}>
          {motions.map((motion) => (
            <TouchableOpacity
              key={motion}
              style={[
                styles.button,
                currentMotion === motion && styles.activeButton
              ]}
              onPress={() => setCurrentMotion(motion)}
            >
              <Text style={styles.buttonText}>{motion}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.controlTitle}>表情控制</Text>
        <View style={styles.buttonRow}>
          {expressions.map((expression) => (
            <TouchableOpacity
              key={expression}
              style={[
                styles.button,
                currentExpression === expression && styles.activeButton
              ]}
              onPress={() => changeExpression(expression)}
            >
              <Text style={styles.buttonText}>{expression}</Text>
            </TouchableOpacity>
          ))}
        </View> */}
        
        <View style={{ height: 8 }} />
        <TouchableOpacity 
          style={styles.preloadButton} 
          onPress={loadModel}
        >
          <Text style={styles.preloadButtonText}>
            {(modelState.isReady ? '重新加载模型' : '加载模型')}
          </Text>
        </TouchableOpacity>
        <View style={{ height: 8 }} />
        <View style={styles.inlineRow}>
          <TouchableOpacity style={[styles.preloadButton, styles.inlineButton]} onPress={viewDirectory}>
            <Text style={styles.preloadButtonText}>查看目录</Text>
          </TouchableOpacity>
          <View style={{ width: 8 }} />
          <TouchableOpacity style={[styles.preloadButton, styles.inlineButton]} onPress={clearDownloaded}>
            <Text style={styles.preloadButtonText}>清理下载缓存</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  live2dContainer: {
    height: 600,
    backgroundColor: '#000', // 改为黑色背景便于调试
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden', // 确保内容不会溢出
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
  },
  controls: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  controlTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  button: {
    backgroundColor: '#e0e0e0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 5,
    marginRight: 8,
    marginBottom: 8,
  },
  activeButton: {
    backgroundColor: '#007AFF',
  },
  buttonText: {
    color: '#333',
    fontSize: 12,
  },
  preloadButton: {
    backgroundColor: '#34C759',
    paddingVertical: 12,
    borderRadius: 5,
    alignItems: 'center',
  },
  preloadButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inlineButton: {
    flex: 1,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  disabledButtonText: {
    color: '#666',
  },
});

export default RNLive2d;