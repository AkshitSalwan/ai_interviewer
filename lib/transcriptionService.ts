import { cloudinaryUploader } from './cloudinaryUpload';

// --- Browser SpeechRecognition API Implementation ---
export interface TranscriptionData {
  transcript: string;
  confidence: number;
  timestamp: number;
  is_final: boolean;
}

class BrowserTranscriptionService {
  private recognition: any = null;
  private isListening: boolean = false;
  private callback: ((data: TranscriptionData) => void) | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private mediaStream: MediaStream | null = null;
  private transcriptionLog: string[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.maxAlternatives = 1;
        this.recognition.lang = 'en-US';
      }
    }
  }

  async startTranscription(onTranscriptionReceived: (data: TranscriptionData) => void): Promise<boolean> {
    if (!this.recognition) {
      console.error('SpeechRecognition API not supported in this browser.');
      return false;
    }
    this.callback = onTranscriptionReceived;
    this.isListening = true;
    this.transcriptionLog = [];

    this.recognition.onstart = () => {
      console.log('Speech recognition started');
    };
    
    this.recognition.onresult = (event: any) => {
      // Extract the result from the current resultIndex
      const result = event.results[event.resultIndex];
      const transcript = result[0].transcript;
      const confidence = result[0].confidence;
      const isFinal = result.isFinal;
      
      console.log('Speech recognized: ', transcript, isFinal ? '(final)' : '(interim)');
      
      // Only process if we have a callback and the transcript isn't empty
      if (this.callback && transcript.trim().length > 0) {
        // Filter out common speech recognition artifacts
        const trimmedTranscript = transcript.trim();
        
        // Send the transcription data with proper is_final flag
        this.callback({
          transcript: trimmedTranscript,
          confidence: confidence,
          timestamp: Date.now(),
          is_final: isFinal,
        });
        
        // Only store final transcriptions for later upload
        if (isFinal && trimmedTranscript.length > 2) {
          this.transcriptionLog.push(trimmedTranscript);
          
          // If we have a lot of transcription data, keep only the most recent entries
          if (this.transcriptionLog.length > 50) {
            this.transcriptionLog = this.transcriptionLog.slice(-50);
          }
        }
      }
    };
    
    this.recognition.onerror = (event: any) => {
      console.warn('SpeechRecognition error:', event.error);
      
      // For no-speech errors, just continue without alerts or restarts
      if (event.error === 'no-speech') {
        console.log('No speech detected, continuing recognition...');
        // Don't change isListening state and don't restart immediately
        // The onend handler will restart if needed
        return;
      }
      
      // For network errors, try to restart
      if (event.error === 'network') {
        console.log('Network error, attempting to restart recognition...');
        if (this.isListening) {
          try {
            this.recognition.stop();
            setTimeout(() => {
              if (this.isListening) {
                this.recognition.start();
              }
            }, 1500); // Increased delay for network recovery
          } catch (e) {
            console.error('Failed to restart after network error:', e);
          }
        }
        return;
      }
      
      // For other errors, log but don't stop listening unless it's a fatal error
      if (['not-allowed', 'service-not-allowed', 'aborted'].includes(event.error)) {
        this.isListening = false;
      }
    };
    
    this.recognition.onend = () => {
      console.log('Speech recognition ended, isListening:', this.isListening);
      if (this.isListening) {
        // Wait a longer amount before restarting to avoid rapid restarts and improve stability
        setTimeout(() => {
          if (this.isListening) {
            try {
              console.log('Restarting speech recognition...');
              this.recognition.start();
            } catch (e) {
              console.error('Error restarting recognition:', e);
              // If restart fails, try again after a longer delay
              setTimeout(() => {
                if (this.isListening) {
                  try {
                    this.recognition.start();
                  } catch (retryError) {
                    console.error('Failed to restart recognition after retry:', retryError);
                  }
                }
              }, 2000);
            }
          }
        }, 1000); // Increased from 300ms to 1000ms for better stability
      }
    };
    
    try {
      this.recognition.start();
      return true;
    } catch (error) {
      console.error('Error starting SpeechRecognition:', error);
      return false;
    }
  }

  stopTranscription(): void {
    this.isListening = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
        console.log('SpeechRecognition stopped');
      } catch (error) {
        console.error('Error stopping SpeechRecognition:', error);
      }
    }
  }
  
  // Add method to resume transcription with existing callback
  resumeTranscription(): boolean {
    if (!this.recognition || !this.callback) {
      console.error('Cannot resume - recognition not initialized or no callback set');
      return false;
    }
    
    this.isListening = true;
    try {
      this.recognition.start();
      console.log('SpeechRecognition resumed');
      return true;
    } catch (error) {
      console.error('Error resuming SpeechRecognition:', error);
      return false;
    }
  }

  // --- Video/Audio Recording and Upload ---
  async startRecording(): Promise<MediaStream | null> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('Media recording not supported in this browser.');
      return null;
    }
    try {
      // Explicitly request high-quality video (critical for face analysis)
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          width: { min: 640, ideal: 1280 },
          height: { min: 480, ideal: 720 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      this.recordedChunks = [];
      
      // Use a more reliable MIME type (webm with VP8 is widely supported)
      const mimeType = 'video/webm;codecs=vp8,opus';
      
      // Configure MediaRecorder with larger timeslice for more reliable recording
      this.mediaRecorder = new MediaRecorder(this.mediaStream, { 
        mimeType: mimeType,
        videoBitsPerSecond: 1000000 // 1 Mbps for better quality
      });
      
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };
      
      // Start recording with 1-second intervals to ensure data is captured
      this.mediaRecorder.start(1000);
      
      console.log('Recording started successfully');
      
      // Return the stream so the UI can display it immediately
      return this.mediaStream;
    } catch (error) {
      console.error('Error starting media recording:', error);
      return null;
    }
  }

  stopRecording(): Blob | null {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.mediaStream?.getTracks().forEach((track) => track.stop());
      return new Blob(this.recordedChunks, { type: 'video/webm' });
    }
    return null;
  }

  async uploadVideoToCloudinary(blob: Blob, filename: string): Promise<any> {
    try {
      return await cloudinaryUploader.uploadVideo(blob, filename, { folder: 'interviews/videos' });
    } catch (error) {
      console.error('Error uploading video:', error);
      throw error;
    }
  }

  async uploadTranscriptionToCloudinary(filename: string): Promise<any> {
    try {
      const transcriptionText = this.transcriptionLog.join('\n');
      const textBlob = new Blob([transcriptionText], { type: 'text/plain' });
      // Use uploadImage for text, or add a new method in cloudinaryUpload.ts for text files if needed
      return await cloudinaryUploader.uploadImage(textBlob as any, filename + '.txt', { folder: 'interviews/transcriptions' });
    } catch (error) {
      console.error('Error uploading transcription:', error);
      throw error;
    }
  }

  /**
   * Returns the current MediaStream (camera+mic) for use in a <video> element.
   * Call after startRecording().
   */
  getMediaStream(): MediaStream | null {
    return this.mediaStream;
  }

  async testConnection(): Promise<boolean> {
    return !!this.recognition;
  }
}

export const transcriptionService = new BrowserTranscriptionService();
