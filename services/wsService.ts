export interface WSServiceConfig {
  protocol?: string;
  host: string;
  port: number;
  characterName: string;
  onOpen?: () => void;
  onMessage?: (event: MessageEvent) => void;
  onError?: (error: Event) => void;
  onClose?: (event: CloseEvent) => void;
}

export class WSService {
  private ws: WebSocket | null = null;
  private config: WSServiceConfig;
  private reconnectTimeout: number | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 3000;

  constructor(config: WSServiceConfig) {
    this.config = {
      protocol: 'ws',
      ...config
    };
  }

  /**
   * 初始化WebSocket连接
   */
  public init(): void {
    const wsUrl = `${this.config.protocol}://${this.config.host}:${this.config.port}/ws/${this.config.characterName}`;
    
    console.log('WebSocket连接信息:', {
      wsUrl: wsUrl,
      characterName: this.config.characterName,
      timestamp: new Date().toISOString()
    });

    this.ws = new WebSocket(wsUrl);
    this.setupEventListeners();
  }

  /**
   * 设置WebSocket事件监听器
   */
  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket连接已建立:', this.ws?.url);

      this.reconnectAttempts = 0; // 重置重连次数
      this.config.onOpen?.();
    };

    this.ws.onmessage = (event) => {
      // 内部做轻量判断，实际处理交给外部 onMessage
      // this.handleMessage(event);
      this.config.onMessage?.(event);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket连接错误:', error);
      this.config.onError?.(error);
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket连接已关闭:', {
        code: event.code,
        reason: event.reason,
        wasClean: event.wasClean
      });

      this.config.onClose?.(event);
      this.handleReconnect(event);
    };
  }

  /**
   * 处理WebSocket消息
   */
  // private handleMessage(event: MessageEvent): void {
    // 二进制音频：交由外部处理
    // if (event.data instanceof Blob) {
    //   console.log('收到音频二进制数据');
    //   return;
    // }

    // if (event.data instanceof ArrayBuffer) {
    //   console.log('收到ArrayBuffer音频数据，长度:', event.data.byteLength);
    //   return;
    // }

    // // 非字符串消息直接忽略（由外部回调自行处理）
    // if (typeof event.data !== 'string') {
    //   return;
    // }

    // // 轻量过滤空字符串，其余交由外部回调解析
    // if (event.data.trim() === '' || event.data === '[]') {
    //   return;
    // }
  // }

  /**
   * 处理重连逻辑
   */
  private handleReconnect(event: CloseEvent): void {
    // 只有在非正常关闭且重连次数未超限时才重连
    if (event.code !== 1000 || !event.wasClean) {
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`WebSocket异常断开，${this.reconnectDelay / 1000}秒后自动重连... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
        }
        
        this.reconnectTimeout = setTimeout(() => {
          console.log('开始自动重连...');
          this.init();
        }, this.reconnectDelay);
      } else {
        console.error('WebSocket重连次数已达上限，停止重连');
      }
    }
  }

  /**
   * 发送消息
   */
  public send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      this.ws.send(message);
      // console.log('发送WebSocket消息:', message);
    } else {
      console.error('WebSocket未连接，无法发送消息');
    }
  }

  /**
   * 关闭连接
   */
  public close(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close(1000, '主动关闭');
      this.ws = null;
    }
  }

  /**
   * 获取连接状态
   */
  public getReadyState(): number | null {
    return this.ws?.readyState || null;
  }

  /**
   * 检查是否已连接
   */
  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * 获取WebSocket实例（用于需要直接访问的场景）
   */
  public getWebSocket(): WebSocket | null {
    return this.ws;
  }

  /**
   * 更新配置
   */
  public updateConfig(newConfig: Partial<WSServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 销毁服务
   */
  public destroy(): void {
    this.close();
  }
}
