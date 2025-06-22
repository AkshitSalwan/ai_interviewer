const fs = require('fs');
const http = require('http');
const FormData = require('form-data');
const { exec } = require('child_process');

// Function to create test audio files
async function createTestFiles() {
  return new Promise((resolve) => {
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
    console.log('Created test-speech.wav');
    
    // Try to create MP3 using ffmpeg
    const command = 'ffmpeg -i test-speech.wav -ar 16000 -ac 1 -b:a 128k test-speech.mp3 -y';
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.log('ffmpeg not available, copying WAV as MP3...');
        fs.copyFileSync('test-speech.wav', 'test-speech.mp3');
      }
      console.log('Created test-speech.mp3');
      resolve();
    });
  });
}

// Function to test transcription with a specific file
function testTranscription(filePath, fileType) {
  return new Promise((resolve, reject) => {
    console.log(`\n=== Testing ${fileType.toUpperCase()} Transcription ===`);
    console.log(`File: ${filePath}`);
    
    if (!fs.existsSync(filePath)) {
      console.log(`❌ File not found: ${filePath}`);
      resolve({ success: false, error: 'File not found' });
      return;
    }
    
    const stats = fs.statSync(filePath);
    console.log(`File size: ${stats.size} bytes`);
    
    const form = new FormData();
    form.append('audio', fs.createReadStream(filePath));
    
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
          const result = JSON.parse(data);
          console.log(`Status: ${res.statusCode}`);
          console.log(`Response:`, JSON.stringify(result, null, 2));
          
          if (result.transcript && result.transcript.length > 0) {
            console.log(`✅ SUCCESS: Got transcript: "${result.transcript}"`);
            resolve({ success: true, result });
          } else {
            console.log(`❌ FAILED: Empty transcript`);
            resolve({ success: false, result });
          }
        } catch (e) {
          console.log(`❌ ERROR: Invalid JSON response`);
          console.log(`Raw response:`, data);
          resolve({ success: false, error: 'Invalid JSON' });
        }
      });
    });
    
    request.on('error', (error) => {
      console.error(`❌ REQUEST ERROR:`, error);
      reject(error);
    });
    
    form.pipe(request);
  });
}

// Function to test with existing files
async function testExistingFiles() {
  const files = [
    { path: 'test-audio.wav', type: 'WAV' },
    { path: 'test-speech.wav', type: 'WAV' },
    { path: 'test-speech.mp3', type: 'MP3' },
    { path: 'sample.mp3', type: 'MP3' }
  ];
  
  const results = [];
  
  for (const file of files) {
    const result = await testTranscription(file.path, file.type);
    results.push({ file: file.path, type: file.type, ...result });
  }
  
  return results;
}

// Main test function
async function runTests() {
  try {
    console.log('🎵 Transcription Format Test Suite');
    console.log('====================================');
    
    // Create test files
    console.log('\n📁 Creating test audio files...');
    await createTestFiles();
    
    // Test transcription
    console.log('\n🎤 Testing transcription with different formats...');
    const results = await testExistingFiles();
    
    // Summary
    console.log('\n📊 Test Summary');
    console.log('================');
    results.forEach((result, index) => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      console.log(`${index + 1}. ${result.type} (${result.file}): ${status}`);
      if (result.success && result.result) {
        console.log(`   Transcript: "${result.result.transcript}"`);
        console.log(`   Confidence: ${result.result.confidence}`);
      }
    });
    
    const successCount = results.filter(r => r.success).length;
    console.log(`\n🎯 Overall: ${successCount}/${results.length} tests passed`);
    
    if (successCount === 0) {
      console.log('\n⚠️  All tests failed. This suggests:');
      console.log('   - The audio files contain no speech');
      console.log('   - Deepgram is not processing the audio correctly');
      console.log('   - There might be an issue with the API configuration');
      console.log('\n💡 Try recording a real speech file and test with that.');
    } else {
      console.log('\n✅ Some tests passed! The transcription API is working.');
    }
    
  } catch (error) {
    console.error('❌ Test suite error:', error);
  }
}

// Run the tests
runTests(); 