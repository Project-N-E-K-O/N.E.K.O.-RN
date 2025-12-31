import type { WSService } from './wsService';

// 与 native 版本保持同名导出，避免业务侧区分平台
export const AUDIO_CONFIG = {
  RECORD_SAMPLE_RATE: 16000,
  PLAYBACK_SAMPLE_RATE: 48000,
  BYTES_PER_SAMPLE: 2,
  CHUNK_SAMPLES: 512,
  BUFFER_SIZE_SAMPLES: 512,
  STREAM_THRESHOLD_SAMPLES: 512,
};

/**
 * Web 端占位实现：
 * - 当前项目的 PCMStream 仅在原生侧实现
 * - Web 侧保留 API 形状，避免打包失败；调用时给出明确 warn
 */
export class AndroidPCMStreamService {
  private wsServiceRef: WSService;
  private isRecording = false;

  constructor(wsServiceRef: WSService) {
    this.wsServiceRef = wsServiceRef;
  }

  public getIsRecording() {
    return this.isRecording;
  }

  public init() {
    console.warn('[AndroidPCMStreamService:web] init() is not supported on web.');
  }

  public configureRecordingAudioSession = async () => {
    console.warn('[AndroidPCMStreamService:web] configureRecordingAudioSession() is not supported on web.');
  };

  public async toggleRecording() {
    console.warn('[AndroidPCMStreamService:web] toggleRecording() is not supported on web.');
    this.isRecording = !this.isRecording;
  }

  public async playPCMData(_arrayBuffer: ArrayBuffer) {
    console.warn('[AndroidPCMStreamService:web] playPCMData() is not supported on web.');
  }

  public clearAudioQueue() {
    // no-op
  }

  public handleUserSpeechDetection() {
    // no-op
  }

  public uninitializeAudio() {
    this.isRecording = false;
  }

  public getStats() {
    return {
      audioChunksCount: 0,
      tempBufferLength: 0,
      bufferIndex: 0,
      audioBufferLength: 0,
      isPlayerInited: false,
      isStreaming: false,
      isRecording: this.isRecording,
      isPlaying: false,
      lastSendTime: 0,
      sendCount: 0,
      feedbackControlStatus: 'Web-Unsupported',
      isSpeechDetected: false,
      playbackTotalDuration: 0,
      playbackPlayedDuration: 0,
      playbackProgress: 0,
    };
  }
}

export default AndroidPCMStreamService;


