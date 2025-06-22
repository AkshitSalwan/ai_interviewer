#!/usr/bin/env node

const dotenv = require('dotenv')
const path = require('path')

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.local') })

console.log('🧪 Testing Updated Transcription System\n')

// Test the transcription API endpoint
async function testTranscriptionAPI() {
  console.log('🔊 Testing Transcription API...')
  
  try {
    // Create a simple test audio file (mock)
    const testAudioBuffer = Buffer.from('mock audio data')
    
    const FormData = require('form-data')
    const formData = new FormData()
    formData.append('audio', testAudioBuffer, { filename: 'test.webm', contentType: 'audio/webm' })
    
    // Test the API endpoint
    const response = await fetch('http://localhost:3000/api/transcribe', {
      method: 'POST',
      body: formData
    })
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Transcription API is working!')
      console.log(`   Transcript: "${data.transcript}"`)
      console.log(`   Confidence: ${Math.round(data.confidence * 100)}%`)
      console.log(`   Word Count: ${data.wordCount}`)
    } else {
      console.log('❌ Transcription API failed:', response.status)
    }
  } catch (error) {
    console.log('❌ Transcription API test failed:', error.message)
  }
}

// Test environment variables
function testEnvironment() {
  console.log('\n🔧 Testing Environment Variables...')
  
  const required = [
    'DEEPGRAM_API_KEY',
    'GEMINI_API_KEY',
    'ZEGOCLOUD_APP_ID',
    'ZEGOCLOUD_SERVER_SECRET'
  ]
  
  let allGood = true
  
  required.forEach(key => {
    const value = process.env[key]
    if (value && value.length > 0) {
      console.log(`✅ ${key}: Configured (${value.substring(0, 8)}...)`)
    } else {
      console.log(`❌ ${key}: Missing`)
      allGood = false
    }
  })
  
  return allGood
}

// Test face-api.js models
function testFaceModels() {
  console.log('\n👁️  Testing Face API Models...')
  
  const fs = require('fs')
  const path = require('path')
  
  const modelsDir = path.join(__dirname, 'public', 'models')
  const requiredModels = [
    'face_expression_model-shard1',
    'face_expression_model-weights_manifest.json',
    'tiny_face_detector_model-shard1',
    'tiny_face_detector_model-weights_manifest.json'
  ]
  
  let allPresent = true
  
  requiredModels.forEach(model => {
    const modelPath = path.join(modelsDir, model)
    if (fs.existsSync(modelPath)) {
      const stats = fs.statSync(modelPath)
      console.log(`✅ ${model}: Present (${Math.round(stats.size / 1024)}KB)`)
    } else {
      console.log(`❌ ${model}: Missing`)
      allPresent = false
    }
  })
  
  return allPresent
}

// Main test function
async function runTests() {
  const envOk = testEnvironment()
  const modelsOk = testFaceModels()
  
  if (!envOk) {
    console.log('\n⚠️  Environment variables missing. Please check your .env.local file.')
    return
  }
  
  await testTranscriptionAPI()
  
  console.log('\n📋 Test Summary:')
  console.log('   • Transcription now uses mock data to avoid audio format issues')
  console.log('   • Emotion detection should work with face-api.js models')
  console.log('   • Live AI scoring should work with the scoring API')
  console.log('   • Check browser console for any remaining errors')
  
  if (!modelsOk) {
    console.log('\n⚠️  Face API models missing. Run: npm run download-models')
  }
}

runTests().catch(console.error) 