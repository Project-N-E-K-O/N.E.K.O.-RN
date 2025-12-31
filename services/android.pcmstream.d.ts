import type { WSService } from './wsService';

export const AUDIO_CONFIG: {
  RECORD_SAMPLE_RATE: number;
  PLAYBACK_SAMPLE_RATE: number;
  BYTES_PER_SAMPLE: number;
  CHUNK_SAMPLES: number;
  BUFFER_SIZE_SAMPLES: number;
  STREAM_THRESHOLD_SAMPLES: number;
};

export class AndroidPCMStreamService {
  constructor(wsServiceRef: WSService);
  getIsRecording(): boolean;
  init(): void;
  configureRecordingAudioSession: () => Promise<void>;
  toggleRecording(): Promise<void>;
  playPCMData(arrayBuffer: ArrayBuffer): Promise<void>;
  clearAudioQueue(): void;
  handleUserSpeechDetection(): void;
  uninitializeAudio(): void;
  getStats(): any;
}

export default AndroidPCMStreamService;

