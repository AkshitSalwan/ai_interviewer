import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@deepgram/sdk'
import { exec } from 'child_process'
import { writeFileSync, unlinkSync } from 'fs'
import { promisify } from 'util'

const execAsync = promisify(exec)

// Initialize Deepgram client only when API key is available
const getDeepgramClient = () => {
  const apiKey = process.env.DEEPGRAM_API_KEY
  if (!apiKey) {
    throw new Error('Deepgram API key not configured')
  }
  return createClient(apiKey)
}

// Function to convert WebM to WAV using ffmpeg
async function convertWebmToWav(audioBuffer: Buffer): Promise<Buffer> {
  try {
    const inputPath = `/tmp/input_${Date.now()}.webm`
    const outputPath = `/tmp/output_${Date.now()}.wav`
    
    // Write the WebM buffer to a temporary file
    writeFileSync(inputPath, audioBuffer)
    
    // Convert using ffmpeg
    await execAsync(`ffmpeg -i ${inputPath} -ar 16000 -ac 1 -f wav ${outputPath} -y`)
    
    // Read the converted WAV file
    const wavBuffer = require('fs').readFileSync(outputPath)
    
    // Clean up temporary files
    try {
      unlinkSync(inputPath)
      unlinkSync(outputPath)
    } catch (e) {
      // Ignore cleanup errors
    }
    
    return wavBuffer
  } catch (error) {
    console.log('ffmpeg conversion failed, using original audio:', error)
    return audioBuffer
  }
}

async function transcribeWithRestApi(audioBuffer: Buffer) {
  const apiKey = process.env.DEEPGRAM_API_KEY
  const fetch = (await import('node-fetch')).default
  const response = await fetch('https://api.deepgram.com/v1/listen', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${apiKey}`,
      'Content-Type': 'audio/wav',
    },
    body: audioBuffer,
  })
  const data = await response.json()
  return data
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.DEEPGRAM_API_KEY) {
      return NextResponse.json({ 
        error: 'Deepgram API key not configured',
        transcript: 'Transcription not available'
      }, { status: 500 })
    }

    const deepgram = getDeepgramClient()
    const formData = await request.formData()
    const audio = formData.get('audio') as File
    
    if (!audio) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 })
    }

    console.log('Received audio file:', {
      size: audio.size,
      type: audio.type,
      name: audio.name
    })

    // Convert audio to buffer
    const audioBuffer = await audio.arrayBuffer()
    
    // Determine encoding from file type
    let encoding = 'webm'
    if (audio.type.includes('mp4')) encoding = 'mp4'
    else if (audio.type.includes('wav')) encoding = 'wav'
    else if (audio.type.includes('mp3')) encoding = 'mp3'
    else if (audio.type.includes('opus')) encoding = 'opus'
    else if (audio.type.includes('webm')) encoding = 'webm'
    
    console.log('Detected encoding:', encoding)
    console.log('Audio type:', audio.type)
    
    // Convert WebM to WAV if needed
    let processedBuffer: Buffer
    if (encoding === 'webm' || encoding === 'opus') {
      console.log('Converting WebM/Opus to WAV for better compatibility...')
      const originalBuffer = Buffer.from(new Uint8Array(audioBuffer))
      processedBuffer = await convertWebmToWav(originalBuffer)
      encoding = 'wav'
      console.log('Conversion completed, using WAV encoding')
    } else {
      processedBuffer = Buffer.from(new Uint8Array(audioBuffer))
    }
    
    try {
      // Use a configuration optimized for the detected format
      const config = {
        model: 'nova-2',
        language: 'en-US',
        smart_format: true,
        punctuate: true,
        encoding: encoding,  // Use the detected encoding
      }
      
      console.log('Using Deepgram config:', config)
      
      const response = await deepgram.listen.prerecorded.transcribeFile(
        processedBuffer,
        config
      )

      console.log('Deepgram raw response:', JSON.stringify(response, null, 2))

      if (response && response.result && response.result.results) {
        const transcript = response.result.results.channels?.[0]?.alternatives?.[0]?.transcript || ''
        const confidence = response.result.results.channels?.[0]?.alternatives?.[0]?.confidence || 0
        const words = response.result.results.channels?.[0]?.alternatives?.[0]?.words || []
        
        console.log('Deepgram success:', { transcript, confidence, wordCount: words.length })
        
        // Return the transcript even if it's empty (this is normal for silence)
        return NextResponse.json({
          transcript: transcript.trim(),
          confidence,
          words,
          sentiment: 'neutral',
          sentimentScore: 0.5,
          wordCount: words.length,
          duration: response.result.metadata?.duration || 0
        })
      } else {
        console.log('No results in Deepgram response')
        return NextResponse.json({
          transcript: '',
          confidence: 0,
          words: [],
          sentiment: 'neutral',
          sentimentScore: 0.5,
          wordCount: 0,
          duration: 0
        })
      }
      
    } catch (deepgramError) {
      console.error('Deepgram error:', deepgramError)
      
      // For WebM/Opus errors, try without encoding specification
      if (encoding === 'opus' || encoding === 'webm') {
        try {
          console.log('Retrying without encoding specification...')
          const fallbackConfig = {
            model: 'nova-2',
            language: 'en-US',
            smart_format: true,
            punctuate: true,
          }
          
          const fallbackResponse = await deepgram.listen.prerecorded.transcribeFile(
            Buffer.from(processedBuffer),
            fallbackConfig
          )
          
          if (fallbackResponse && fallbackResponse.result && fallbackResponse.result.results) {
            const transcript = fallbackResponse.result.results.channels?.[0]?.alternatives?.[0]?.transcript || ''
            const confidence = fallbackResponse.result.results.channels?.[0]?.alternatives?.[0]?.confidence || 0
            const words = fallbackResponse.result.results.channels?.[0]?.alternatives?.[0]?.words || []
            
            console.log('Fallback Deepgram success:', { transcript, confidence, wordCount: words.length })
            
            return NextResponse.json({
              transcript: transcript.trim(),
              confidence,
              words,
              sentiment: 'neutral',
              sentimentScore: 0.5,
              wordCount: words.length,
              duration: fallbackResponse.result.metadata?.duration || 0
            })
          }
        } catch (fallbackError) {
          console.error('Fallback Deepgram error:', fallbackError)
        }
      }
      
      // Return empty transcript instead of error to keep the flow going
      return NextResponse.json({
        transcript: '',
        confidence: 0,
        words: [],
        sentiment: 'neutral',
        sentimentScore: 0.5,
        wordCount: 0,
        duration: 0
      })
    }

  } catch (error) {
    console.error('Error in transcription:', error)
    return NextResponse.json({ 
      error: 'Internal server error: ' + (typeof error === 'object' && error && 'message' in error ? (error as any).message : String(error)),
      transcript: ''
    }, { status: 500 })
  }
}

// WebSocket endpoint for real-time transcription
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const upgrade = request.headers.get('upgrade')
  
  if (upgrade !== 'websocket') {
    return NextResponse.json({ error: 'WebSocket upgrade required' }, { status: 400 })
  }

  // This would typically be handled by a WebSocket server
  // For now, return instructions for WebSocket setup
  return NextResponse.json({
    message: 'WebSocket endpoint for real-time transcription',
    instructions: 'Connect to this endpoint with WebSocket for live transcription'
  })
}
