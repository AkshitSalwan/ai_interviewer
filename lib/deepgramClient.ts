import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk'

export class DeepgramClient {
  private client: any
  private connection: any
  private isConnected = false

  constructor() {
    // Only initialize if API key is available
    if (process.env.DEEPGRAM_API_KEY) {
      this.client = createClient(process.env.DEEPGRAM_API_KEY)
    }
  }

  async startLiveTranscription(onTranscript: (transcript: string) => void) {
    try {
      this.connection = this.client.listen.live({
        model: 'nova-2',
        language: 'en-US',
        smart_format: true,
        interim_results: true,
        utterance_end_ms: 1000,
        vad_events: true,
        endpointing: 300,
      })

      this.connection.on(LiveTranscriptionEvents.Open, () => {
        console.log('Connection opened')
        this.isConnected = true
      })

      this.connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
        const transcript = data.channel?.alternatives?.[0]?.transcript
        if (transcript && transcript.trim()) {
          onTranscript(transcript)
        }
      })

      this.connection.on(LiveTranscriptionEvents.Metadata, (data: any) => {
        console.log('Metadata:', data)
      })

      this.connection.on(LiveTranscriptionEvents.Error, (error: any) => {
        console.error('Deepgram error:', error)
      })

      this.connection.on(LiveTranscriptionEvents.Close, () => {
        console.log('Connection closed')
        this.isConnected = false
      })

      return this.connection

    } catch (error) {
      console.error('Error starting live transcription:', error)
      throw error
    }
  }

  sendAudio(audioChunk: ArrayBuffer) {
    if (this.isConnected && this.connection) {
      this.connection.send(audioChunk)
    }
  }

  disconnect() {
    if (this.connection) {
      this.connection.finish()
      this.isConnected = false
    }
  }

  async transcribeFile(audioFile: File): Promise<string> {
    try {
      const audioBuffer = await audioFile.arrayBuffer()
      
      const { result, error } = await this.client.listen.prerecorded.transcribeFile(
        Buffer.from(audioBuffer),
        {
          model: 'nova-2',
          language: 'en-US',
          smart_format: true,
          punctuate: true,
          utterances: true,
          keywords: ['interview', 'experience', 'skills', 'team', 'project', 'challenge'],
        }
      )

      if (error) {
        throw new Error(`Transcription error: ${error.message}`)
      }

      return result?.results?.channels?.[0]?.alternatives?.[0]?.transcript || ''
      
    } catch (error) {
      console.error('Error transcribing file:', error)
      throw error
    }
  }
}

export const deepgramClient = new DeepgramClient()
