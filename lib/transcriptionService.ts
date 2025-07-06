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
  private lastAiText: string = '';
  private aiSpeechEndTime: number = 0;
  private lastProcessedTranscript: string = '';
  private echoPreventionEnabled: boolean = true;

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

    // Stop any existing recognition first
    if (this.isListening) {
      console.log('Stopping existing speech recognition before starting new one');
      this.stopTranscription();
      // Wait a bit for the stop to complete
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.callback = onTranscriptionReceived;
    this.isListening = true;
    this.transcriptionLog = [];

    this.recognition.onstart = () => {
      console.log('✅ Speech recognition started successfully');
    };
    
    this.recognition.onresult = (event: any) => {
      // Extract the result from the current resultIndex
      const result = event.results[event.resultIndex];
      const transcript = result[0].transcript;
      const confidence = result[0].confidence;
      const isFinal = result.isFinal;
      
      console.log('Speech recognized: ', transcript, isFinal ? '(final)' : '(interim)', 'Confidence:', confidence);
      
      // Only process if we have a callback and the transcript isn't empty
      if (this.callback && transcript.trim().length > 0) {
        const trimmedTranscript = transcript.trim();
        
        console.log('Processing transcript:', trimmedTranscript, 'isFinal:', isFinal);
        
        // Enhanced echo detection for final transcripts
        if (isFinal && this.echoPreventionEnabled && this.isEchoLikely(trimmedTranscript)) {
          console.log('Echo detected and filtered:', trimmedTranscript);
          return;
        }
        
        // Skip duplicate final transcripts
        if (isFinal && trimmedTranscript === this.lastProcessedTranscript) {
          console.log('Duplicate transcript filtered:', trimmedTranscript);
          return;
        }
        
        // Send the transcription data with proper is_final flag
        console.log('Sending transcript to callback:', trimmedTranscript, 'isFinal:', isFinal);
        this.callback({
          transcript: trimmedTranscript,
          confidence: confidence,
          timestamp: Date.now(),
          is_final: isFinal,
        });
        
        // Only store final transcriptions for later upload
        if (isFinal && trimmedTranscript.length > 2) {
          this.lastProcessedTranscript = trimmedTranscript;
          this.transcriptionLog.push(trimmedTranscript);
          
          // If we have a lot of transcription data, keep only the most recent entries
          if (this.transcriptionLog.length > 50) {
            this.transcriptionLog = this.transcriptionLog.slice(-50);
          }
        }
      }
    };
    
    this.recognition.onerror = (event: any) => {
      console.error('🚨 SpeechRecognition error:', event.error, event);
      
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
              // Check if already running before restarting
              if (this.recognition.state !== 'running') {
                console.log('Restarting speech recognition...');
                this.recognition.start();
              } else {
                console.log('Recognition already running, skipping restart');
              }
            } catch (e) {
              console.error('Error restarting recognition:', e);
              // If restart fails, try again after a longer delay
              setTimeout(() => {
                if (this.isListening && this.recognition.state !== 'running') {
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
      // Check if recognition is already running
      if (this.recognition.state && this.recognition.state === 'running') {
        console.log('Speech recognition already running, stopping first');
        this.recognition.stop();
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      console.log('Starting speech recognition...');
      this.recognition.start();
      return true;
    } catch (error) {
      console.error('Error starting SpeechRecognition:', error);
      this.isListening = false;
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
  
  // Enhanced echo detection method
  private isEchoLikely(transcript: string): boolean {
    if (!this.lastAiText || !this.echoPreventionEnabled) {
      console.log('Echo detection bypassed - no AI context or disabled');
      return false;
    }
    
    const timeSinceAiSpeech = Date.now() - this.aiSpeechEndTime;
    
    // Only check for echo within 3 seconds of AI finishing speech
    if (timeSinceAiSpeech > 3000) {
      console.log('Echo detection bypassed - too much time passed since AI speech:', timeSinceAiSpeech + 'ms');
      return false;
    }
    
    console.log('Running echo detection, time since AI:', timeSinceAiSpeech + 'ms');
    
    const aiWords = this.lastAiText.toLowerCase()
      .replace(/[.,!?;:]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2);
    
    const transcriptWords = transcript.toLowerCase()
      .replace(/[.,!?;:]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2);
    
    if (transcriptWords.length === 0) return false;
    
    // Count matching words
    const matchingWords = transcriptWords.filter(word => 
      aiWords.some(aiWord => 
        aiWord.includes(word) || word.includes(aiWord) || 
        this.calculateSimilarity(word, aiWord) > 0.8
      )
    );
    
    const matchRatio = matchingWords.length / transcriptWords.length;
    
    // Check for sequence matches (consecutive words)
    let hasSequenceMatch = false;
    for (let i = 0; i < transcriptWords.length - 1; i++) {
      const sequence = transcriptWords[i] + ' ' + transcriptWords[i + 1];
      if (this.lastAiText.toLowerCase().includes(sequence)) {
        hasSequenceMatch = true;
        break;
      }
    }
    
    // Detect echo based on multiple criteria (made less aggressive)
    const isEcho = (
      matchRatio > 0.6 || // Increased from 0.4 to 0.6 - More than 60% word overlap
      (hasSequenceMatch && matchRatio > 0.3) || // Only sequence match with significant overlap
      (matchingWords.length > 3 && transcriptWords.length < 5) || // High matches in very short text
      (timeSinceAiSpeech < 1000 && matchRatio > 0.5) // Very early detection with higher threshold
    );
    
    if (isEcho) {
      console.log(`Echo detected - Match ratio: ${(matchRatio * 100).toFixed(1)}%, Sequence: ${hasSequenceMatch}, Time: ${timeSinceAiSpeech}ms`);
    }
    
    return isEcho;
  }
  
  // Simple string similarity calculation
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }
  
  // Levenshtein distance calculation
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }
  
  // Method to set AI speech context for echo detection
  setAiSpeechContext(aiText: string): void {
    this.lastAiText = aiText;
    this.aiSpeechEndTime = Date.now();
    this.lastProcessedTranscript = ''; // Clear to prevent false duplicates
    console.log('AI speech context set for echo detection');
  }
  
  // Method to clear echo detection context
  clearEchoContext(): void {
    this.lastAiText = '';
    this.aiSpeechEndTime = 0;
    this.lastProcessedTranscript = '';
  }
  
  // Method to enable/disable echo prevention
  setEchoPreventionEnabled(enabled: boolean): void {
    this.echoPreventionEnabled = enabled;
    console.log('Echo prevention', enabled ? 'enabled' : 'disabled');
  }
}

export const transcriptionService = new BrowserTranscriptionService();
