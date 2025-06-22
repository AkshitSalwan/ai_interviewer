const fs = require('fs');
const { exec } = require('child_process');
const http = require('http');
const FormData = require('form-data');

// Create a simple test audio file using ffmpeg (if available)
function createTestAudio() {
  return new Promise((resolve, reject) => {
    // Create a 3-second sine wave at 440Hz (A note)
    const command = 'ffmpeg -f lavfi -i "sine=frequency=440:duration=3" -ar 16000 -ac 1 test-audio.wav -y';
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.log('ffmpeg not available, creating dummy audio file...');
        // Create a dummy WAV file header
        const sampleRate = 16000;
        const duration = 3; // seconds
        const numSamples = sampleRate * duration;
        const buffer = Buffer.alloc(44 + numSamples * 2); // WAV header + 16-bit samples
        
        // WAV header
        buffer.write('RIFF', 0);
        buffer.writeUInt32LE(36 + numSamples * 2, 4);
        buffer.write('WAVE', 8);
        buffer.write('fmt ', 12);
        buffer.writeUInt32LE(16, 16);
        buffer.writeUInt16LE(1, 20);
        buffer.writeUInt16LE(1, 22);
        buffer.writeUInt32LE(sampleRate, 24);
        buffer.writeUInt32LE(sampleRate * 2, 28);
        buffer.writeUInt16LE(2, 32);
        buffer.writeUInt16LE(16, 34);
        buffer.write('data', 36);
        buffer.writeUInt32LE(numSamples * 2, 40);
        
        // Fill with silence
        for (let i = 0; i < numSamples; i++) {
          buffer.writeInt16LE(0, 44 + i * 2);
        }
        
        fs.writeFileSync('test-audio.wav', buffer);
        resolve('test-audio.wav');
      } else {
        resolve('test-audio.wav');
      }
    });
  });
}

async function testTranscriptionNode() {
  try {
    const audioFile = await createTestAudio();
    console.log('Created test audio file:', audioFile);
    
    const form = new FormData();
    form.append('audio', fs.createReadStream(audioFile));
    
    const request = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/transcribe',
      method: 'POST',
      headers: form.getHeaders(),
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          console.log('Transcription result:', JSON.parse(data));
        } catch (e) {
          console.log('Raw response:', data);
        }
      });
    });
    
    request.on('error', (error) => {
      console.error('Request error:', error);
    });
    
    form.pipe(request);
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testTranscriptionNode(); 