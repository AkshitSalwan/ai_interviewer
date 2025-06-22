#!/usr/bin/env node

// Environment Variables Verification Script
const dotenv = require('dotenv')
const path = require('path')

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '.env.local') })

console.log('🔍 AI Video Interview Platform - Environment Check\n')

const requiredVars = [
  { name: 'GEMINI_API_KEY', description: 'Google Gemini AI (Primary AI Service)', required: true },
  { name: 'DEEPGRAM_API_KEY', description: 'Deepgram (Speech-to-Text)', required: true },
  { name: 'ZEGOCLOUD_APP_ID', description: 'ZEGOCLOUD (Video Calling)', required: true },
  { name: 'ZEGOCLOUD_SERVER_SECRET', description: 'ZEGOCLOUD Server Secret', required: true },
  { name: 'CLOUDINARY_CLOUD_NAME', description: 'Cloudinary (File Storage)', required: true },
  { name: 'CLOUDINARY_API_KEY', description: 'Cloudinary API Key', required: true },
  { name: 'CLOUDINARY_API_SECRET', description: 'Cloudinary API Secret', required: true },
]

const optionalVars = [
  { name: 'OPENAI_API_KEY', description: 'OpenAI (Alternative TTS)' },
  { name: 'GOOGLE_CLOUD_API_KEY', description: 'Google Cloud (Enhanced TTS)' },
  { name: 'NEXTAUTH_URL', description: 'NextAuth URL' },
  { name: 'NEXTAUTH_SECRET', description: 'NextAuth Secret' },
]

let allConfigured = true

console.log('✅ REQUIRED ENVIRONMENT VARIABLES:')
console.log('=' .repeat(50))

requiredVars.forEach(({ name, description, required }) => {
  const value = process.env[name]
  const isConfigured = value && value.length > 0
  
  if (!isConfigured && required) {
    allConfigured = false
  }
  
  const status = isConfigured ? '✅' : (required ? '❌' : '⚠️ ')
  const maskedValue = isConfigured ? '***' + value.slice(-4) : 'Not set'
  
  console.log(`${status} ${name}`)
  console.log(`   ${description}`)
  console.log(`   Value: ${maskedValue}\n`)
})

console.log('🔧 OPTIONAL ENVIRONMENT VARIABLES:')
console.log('=' .repeat(50))

optionalVars.forEach(({ name, description }) => {
  const value = process.env[name]
  const isConfigured = value && value.length > 0
  const status = isConfigured ? '✅' : '⚪'
  const maskedValue = isConfigured ? '***' + value.slice(-4) : 'Not set'
  
  console.log(`${status} ${name}`)
  console.log(`   ${description}`)
  console.log(`   Value: ${maskedValue}\n`)
})

console.log('📋 SUMMARY:')
console.log('=' .repeat(50))

if (allConfigured) {
  console.log('🎉 All required environment variables are configured!')
  console.log('🚀 Your AI Video Interview Platform is ready to run!')
  console.log('\n📝 Next steps:')
  console.log('   1. Run: npm run dev')
  console.log('   2. Visit: http://localhost:3000/interview')
  console.log('   3. Test the full interview flow')
} else {
  console.log('⚠️  Some required environment variables are missing.')
  console.log('📝 Please check your .env.local file and add the missing keys.')
  console.log('\n🔗 Get API keys from:')
  console.log('   • Gemini: https://makersuite.google.com/')
  console.log('   • Deepgram: https://deepgram.com/')
  console.log('   • ZEGOCLOUD: https://console.zegocloud.com/')
  console.log('   • Cloudinary: https://cloudinary.com/')
}

console.log('\n📁 Environment files checked:')
console.log('   • .env.local (primary)')
console.log('   • .env (fallback)')
console.log('   • Environment variables are loaded by Next.js automatically')
