import { NextRequest, NextResponse } from 'next/server'

// Using Google Cloud Text-to-Speech (works with Gemini ecosystem)
const GOOGLE_TTS_API_KEY = process.env.GOOGLE_CLOUD_API_KEY || process.env.GEMINI_API_KEY

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    // Use browser-based speech synthesis instead of paid APIs
    // Return instructions for client-side TTS
    return NextResponse.json({ 
      message: 'Use browser speech synthesis',
      text: text,
      fallback: true,
      instructions: 'Client should use Web Speech API speechSynthesis'
    })

  } catch (error) {
    console.error('Error in TTS service:', error)
    
    return NextResponse.json({ 
      error: 'TTS service error',
      fallback: true,
      text: ''
    }, { status: 500 })
  }
}
