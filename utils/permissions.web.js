// Web platform permissions utility
export const requestMicrophonePermission = async () => {
  try {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      // Request microphone permission by attempting to access the media stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 48000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      // Immediately stop the stream as we only need permission
      stream.getTracks().forEach(track => track.stop());
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to request microphone permission:', error);
    return false;
  }
};
