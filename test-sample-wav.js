const fs = require('fs');
const http = require('http');
const FormData = require('form-data');

// Function to test transcription with sample.wav
function testSampleWav() {
  return new Promise((resolve, reject) => {
    console.log('🎵 Testing sample.wav with Transcription API');
    console.log('============================================');
    
    const filePath = 'sample.wav';
    
    if (!fs.existsSync(filePath)) {
      console.log(`❌ File not found: ${filePath}`);
      console.log('Please add sample.wav to the current directory and try again.');
      resolve({ success: false, error: 'File not found' });
      return;
    }
    
    const stats = fs.statSync(filePath);
    console.log(`📁 File: ${filePath}`);
    console.log(`📏 Size: ${stats.size} bytes`);
    console.log(`📅 Modified: ${stats.mtime}`);
    
    const form = new FormData();
    form.append('audio', fs.createReadStream(filePath));
    
    console.log('\n🚀 Sending to transcription API...');
    
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
        console.log(`📡 Status: ${res.statusCode}`);
        
        try {
          const result = JSON.parse(data);
          console.log('\n📋 API Response:');
          console.log(JSON.stringify(result, null, 2));
          
          if (result.transcript && result.transcript.length > 0) {
            console.log('\n✅ SUCCESS! Transcription working!');
            console.log(`🎤 Transcript: "${result.transcript}"`);
            console.log(`🎯 Confidence: ${result.confidence}`);
            console.log(`📊 Word Count: ${result.wordCount}`);
            console.log(`⏱️  Duration: ${result.duration}s`);
            resolve({ success: true, result });
          } else {
            console.log('\n❌ FAILED: Empty transcript');
            console.log('This could mean:');
            console.log('- The audio file contains no speech');
            console.log('- The audio quality is too poor');
            console.log('- The file format is not supported');
            resolve({ success: false, result });
          }
        } catch (e) {
          console.log('\n❌ ERROR: Invalid JSON response');
          console.log('Raw response:', data);
          resolve({ success: false, error: 'Invalid JSON' });
        }
      });
    });
    
    request.on('error', (error) => {
      console.error('\n❌ REQUEST ERROR:', error);
      reject(error);
    });
    
    form.pipe(request);
  });
}

// Main function
async function runTest() {
  try {
    const result = await testSampleWav();
    
    console.log('\n📊 Test Result Summary');
    console.log('======================');
    if (result.success) {
      console.log('🎉 TRANSCRIPTION IS WORKING!');
      console.log('Your sample.wav file was successfully transcribed.');
      console.log('The issue with your app is likely in the browser recording format.');
      console.log('\n💡 Next steps:');
      console.log('1. Check your browser\'s MediaRecorder format');
      console.log('2. Ensure you\'re using audio/webm;codecs=opus');
      console.log('3. Test with real speech in your app');
    } else {
      console.log('⚠️  TRANSCRIPTION FAILED');
      console.log('The sample.wav file could not be transcribed.');
      console.log('This suggests an issue with the audio file or Deepgram configuration.');
      console.log('\n💡 Try:');
      console.log('1. Check if the file contains actual speech');
      console.log('2. Verify the audio quality');
      console.log('3. Test with a different audio file');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

// Run the test
runTest(); 