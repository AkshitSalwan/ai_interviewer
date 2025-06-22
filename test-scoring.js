// Test the dynamic AI scoring system
async function testScoring() {
  const testData = {
    transcription: "Hello, I'm excited to interview for this position. I have over 5 years of experience in software development, particularly in React and Node.js. In my previous role, I led a team of developers to build a scalable e-commerce platform that handled over 100,000 users. I'm passionate about problem-solving and enjoy working on challenging technical projects. I believe my experience with agile methodologies and my strong communication skills make me a great fit for this role.",
    emotions: [
      { emotion: 'confident', score: 0.8, timestamp: Date.now() },
      { emotion: 'happy', score: 0.7, timestamp: Date.now() + 1000 },
      { emotion: 'calm', score: 0.75, timestamp: Date.now() + 2000 },
      { emotion: 'focused', score: 0.85, timestamp: Date.now() + 3000 }
    ],
    duration: 120 // 2 minutes
  }

  try {
    const response = await fetch('http://localhost:3000/api/score-interview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    })

    if (response.ok) {
      const result = await response.json()
      console.log('✅ Scoring API Test Results:')
      console.log('📊 Overall Score:', result.overallScore)
      console.log('📈 Score Breakdown:', result.breakdown)
      console.log('💡 Insights:', result.insights)
      console.log('🎯 Recommendations:', result.recommendations)
      console.log('🤖 AI Analysis:', result.aiAnalysis)
      console.log('👥 Hiring Recommendation:', result.hiringRecommendation)
    } else {
      console.error('❌ API Error:', response.status, response.statusText)
    }
  } catch (error) {
    console.error('❌ Test Error:', error)
  }
}

// Test with different scenarios
async function testMultipleScenarios() {
  console.log('🧪 Testing Dynamic AI Scoring System...\n')

  // Test 1: High-performing candidate
  console.log('📝 Test 1: High-performing candidate')
  await testScoring()

  await new Promise(resolve => setTimeout(resolve, 1000))

  // Test 2: Average candidate
  console.log('\n📝 Test 2: Average candidate')
  const avgData = {
    transcription: "I have some experience in software development. I worked on a few projects. I think I can do well in this role.",
    emotions: [
      { emotion: 'neutral', score: 0.6, timestamp: Date.now() },
      { emotion: 'nervous', score: 0.4, timestamp: Date.now() + 1000 }
    ],
    duration: 45
  }

  try {
    const response = await fetch('http://localhost:3000/api/score-interview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(avgData),
    })

    if (response.ok) {
      const result = await response.json()
      console.log('📊 Overall Score:', result.overallScore)
      console.log('👥 Hiring Recommendation:', result.hiringRecommendation)
    }
  } catch (error) {
    console.error('❌ Test Error:', error)
  }
}

// Run the tests
testMultipleScenarios()
