const fs = require('fs');
const { exec } = require('child_process');

// Function to create a WAV file with a simple tone (simulating speech)
function createWavFile() {
  return new Promise((resolve) => {
    // Create a 3-second audio file with a varying frequency (simulating speech)
    const command = 'ffmpeg -f lavfi -i "sine=frequency=440:duration=1" -f lavfi -i "sine=frequency=880:duration=1" -f lavfi -i "sine=frequency=660:duration=1" -filter_complex "[0:0][1:0][2:0]concat=n=3:v=0:a=1" -ar 16000 -ac 1 test-speech.wav -y';
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.log('ffmpeg not available, creating simple WAV file...');
        // Create a simple WAV file with varying tones
        const sampleRate = 16000;
        const duration = 3; // seconds
        const numSamples = sampleRate * duration;
        const buffer = Buffer.alloc(44 + numSamples * 2);
        
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
        
        // Create varying tones (simulating speech patterns)
        for (let i = 0; i < numSamples; i++) {
          const t = i / sampleRate;
          let frequency = 440;
          if (t < 1) frequency = 440;
          else if (t < 2) frequency = 880;
          else frequency = 660;
          
          const amplitude = Math.sin(2 * Math.PI * frequency * t) * 0.3;
          buffer.writeInt16LE(Math.floor(amplitude * 32767), 44 + i * 2);
        }
        
        fs.writeFileSync('test-speech.wav', buffer);
        resolve('test-speech.wav');
      } else {
        resolve('test-speech.wav');
      }
    });
  });
}

// Function to create an MP3 file
function createMp3File() {
  return new Promise((resolve) => {
    const command = 'ffmpeg -f lavfi -i "sine=frequency=440:duration=1" -f lavfi -i "sine=frequency=880:duration=1" -f lavfi -i "sine=frequency=660:duration=1" -filter_complex "[0:0][1:0][2:0]concat=n=3:v=0:a=1" -ar 16000 -ac 1 -b:a 128k test-speech.mp3 -y';
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.log('ffmpeg not available for MP3, creating WAV instead...');
        // If ffmpeg is not available, we'll just copy the WAV file
        fs.copyFileSync('test-speech.wav', 'test-speech.mp3');
        resolve('test-speech.mp3');
      } else {
        resolve('test-speech.mp3');
      }
    });
  });
}

async function createTestFiles() {
  try {
    console.log('Creating test audio files...');
    
    const wavFile = await createWavFile();
    console.log('Created WAV file:', wavFile);
    
    const mp3File = await createMp3File();
    console.log('Created MP3 file:', mp3File);
    
    console.log('Test files created successfully!');
    console.log('Files:');
    console.log('- test-speech.wav');
    console.log('- test-speech.mp3');
    
  } catch (error) {
    console.error('Error creating test files:', error);
  }
}

createTestFiles(); 