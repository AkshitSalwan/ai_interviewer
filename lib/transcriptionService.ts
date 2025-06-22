export interface TranscriptionData {
  transcript: string
  confidence: number
  timestamp: number
  is_final: boolean
}

export class TranscriptionService {
  private mediaRecorder: MediaRecorder | null = null
  private isRecording = false
  private audioChunks: Blob[] = []
  private intervalId: NodeJS.Timeout | null = null
  private accumulatedChunks: Blob[] = [] // Track accumulated chunks
  private lastSendTime = 0 // Track when we last sent audio

  async startTranscription(onTranscriptionReceived: (data: TranscriptionData) => void): Promise<boolean> {
    try {
      console.log('Starting transcription service...')
      // Stop any existing transcription first
      this.stopTranscription()
      this.isRecording = true
      this.audioChunks = []
      this.accumulatedChunks = []
      this.lastSendTime = 0

      // Get microphone access with optimized settings for speech recognition
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
          channelCount: 1,
        }
      })

      console.log('Microphone access granted, creating MediaRecorder...')
      
      // Force the most compatible format for Deepgram
      let selectedMimeType = 'audio/webm;codecs=opus';
      
      // Check if the browser supports our preferred format
      if (!MediaRecorder.isTypeSupported(selectedMimeType)) {
        console.log('audio/webm;codecs=opus not supported, trying alternatives...');
        const fallbackFormats = [
          'audio/webm',
          'audio/mp4',
          'audio/wav'
        ];
        
        for (const format of fallbackFormats) {
          if (MediaRecorder.isTypeSupported(format)) {
            selectedMimeType = format;
            console.log('Using fallback format:', format);
            break;
          }
        }
      }
      
      console.log('Using audio format:', selectedMimeType);
      
      // Use lower bitrate for better compatibility
      this.mediaRecorder = new MediaRecorder(stream, { 
        mimeType: selectedMimeType,
        audioBitsPerSecond: 64000  // Reduced from 128000 for better compatibility
      })

      this.mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0 && this.isRecording) {
          console.log(`Audio chunk received: ${event.data.size} bytes (${selectedMimeType})`)
          this.audioChunks.push(event.data)
          this.accumulatedChunks.push(event.data)
          
          // Only send accumulated chunks every 5 seconds or when we have enough data
          const now = Date.now()
          const timeSinceLastSend = now - this.lastSendTime
          const totalSize = this.accumulatedChunks.reduce((sum, chunk) => sum + chunk.size, 0)
          
          if (timeSinceLastSend >= 5000 || totalSize >= 50000) { // 5 seconds or 50KB
            await this.sendAccumulatedAudio(selectedMimeType, onTranscriptionReceived)
            this.accumulatedChunks = []
            this.lastSendTime = now
          }
        }
      }

      this.mediaRecorder.onstart = () => {
        console.log('MediaRecorder started')
        this.isRecording = true
      }
      this.mediaRecorder.onstop = () => {
        console.log('MediaRecorder stopped')
        this.isRecording = false
        // Send any remaining accumulated audio
        if (this.accumulatedChunks.length > 0) {
          this.sendAccumulatedAudio(selectedMimeType, onTranscriptionReceived)
        }
        stream.getTracks().forEach(track => track.stop())
      }

      this.mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event)
      }

      console.log('Starting MediaRecorder with 1-second chunks...')
      this.mediaRecorder.start(1000) // Record in 1-second chunks for better accumulation
      return true
    } catch (error) {
      console.error('Error starting browser audio recording:', error)
      return false
    }
  }

  private async sendAccumulatedAudio(mimeType: string, onTranscriptionReceived: (data: TranscriptionData) => void) {
    if (this.accumulatedChunks.length === 0) return
    
    const totalSize = this.accumulatedChunks.reduce((sum, chunk) => sum + chunk.size, 0)
    console.log(`Sending accumulated audio: ${totalSize} bytes from ${this.accumulatedChunks.length} chunks`)
    
    // Create a complete audio blob from accumulated chunks
    const audioBlob = new Blob(this.accumulatedChunks, { type: mimeType })
    const formData = new FormData()
    
    // Determine file extension based on MIME type
    let extension = 'webm'
    if (mimeType.includes('mp4')) extension = 'mp4'
    else if (mimeType.includes('wav')) extension = 'wav'
    else if (mimeType.includes('mp3')) extension = 'mp3'
    
    formData.append('audio', audioBlob, `audio.${extension}`)
    
    try {
      console.log('Sending accumulated audio to transcription API...')
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('Transcription API response:', data)
        
        // Only process meaningful transcripts (not placeholders)
        if (data.transcript && 
            data.transcript.length > 0 && 
            !data.transcript.includes('[Speech detected') &&
            !data.transcript.includes('processing')) {
          onTranscriptionReceived({
            transcript: data.transcript || '',
            confidence: data.confidence || 0,
            timestamp: Date.now(),
            is_final: true
          })
        } else if (data.transcript && data.transcript.length > 0) {
          console.log('Received placeholder transcript, skipping...')
        } else {
          console.log('No transcript in response')
        }
      } else {
        console.error('Transcription API error:', response.status)
        const errorText = await response.text()
        console.error('Error details:', errorText)
      }
    } catch (err) {
      console.error('Error calling transcription API:', err)
    }
  }

  stopTranscription(): void {
    console.log('Stopping transcription service...')
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop()
    }
    this.isRecording = false
    this.audioChunks = []
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  isAvailable(): boolean {
    return true
  }

  async testConnection(): Promise<boolean> {
    // Always return true, since browser can't test Deepgram directly
    return true
  }
}

export const transcriptionService = new TranscriptionService()
export default transcriptionService
