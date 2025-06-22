require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@deepgram/sdk');

async function testDeepgram() {
  try {
    console.log('DEEPGRAM_API_KEY:', process.env.DEEPGRAM_API_KEY ? 'SET' : 'NOT SET');
    
    if (!process.env.DEEPGRAM_API_KEY) {
      console.error('Deepgram API key not found');
      return;
    }

    const deepgram = createClient(process.env.DEEPGRAM_API_KEY);
    
    // Create a simple test audio buffer (silence)
    const testBuffer = Buffer.alloc(16000); // 1 second of silence at 16kHz
    
    console.log('Testing Deepgram with silence...');
    
    const response = await deepgram.listen.prerecorded.transcribeFile(
      testBuffer,
      {
        model: 'nova-2',
        language: 'en-US',
        smart_format: true,
        punctuate: true,
        encoding: 'wav',
        sample_rate: 16000,
        channels: 1,
      }
    );

    console.log('Deepgram response:', JSON.stringify(response, null, 2));
    
  } catch (error) {
    console.error('Deepgram test error:', error);
  }
}

testDeepgram(); 