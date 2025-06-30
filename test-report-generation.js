// Test the improved AI report generation system
async function testReportGeneration() {
  const testData = {
    transcription: "Thank you for this opportunity. I'm excited about this software engineer position. I have extensive experience in full-stack development, particularly with React, Node.js, and PostgreSQL. In my previous role at TechCorp, I led a team of five developers to build a scalable microservices architecture that improved system performance by 40% and reduced deployment time from hours to minutes. One challenging project involved migrating a legacy monolithic application to a modern cloud-based architecture. We had to solve complex data synchronization issues and ensure zero downtime during the transition. I collaborated closely with DevOps, QA, and product teams to deliver this successfully. I'm passionate about clean code, test-driven development, and continuous integration. I believe my technical expertise, leadership experience, and problem-solving skills make me an excellent fit for your team.",
    emotions: [
      { emotion: 'confident', score: 0.85, timestamp: Date.now() },
      { emotion: 'enthusiastic', score: 0.8, timestamp: Date.now() + 5000 },
      { emotion: 'focused', score: 0.9, timestamp: Date.now() + 10000 },
      { emotion: 'confident', score: 0.88, timestamp: Date.now() + 15000 },
      { emotion: 'calm', score: 0.82, timestamp: Date.now() + 20000 },
      { emotion: 'engaged', score: 0.87, timestamp: Date.now() + 25000 }
    ],
    duration: 180, // 3 minutes
    timestamp: Date.now()
  }

  try {
    console.log('🧪 Testing AI Report Generation...')
    console.log('📊 Test Data:')
    console.log(`  - Word Count: ${testData.transcription.split(' ').length}`)
    console.log(`  - Duration: ${testData.duration} seconds`)
    console.log(`  - Emotion Points: ${testData.emotions.length}`)

    // Test scoring first
    console.log('\n📈 Testing Scoring API...')
    const scoringResponse = await fetch('http://localhost:3000/api/score-interview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    })

    if (scoringResponse.ok) {
      const scoringResult = await scoringResponse.json()
      console.log('✅ Scoring Results:')
      console.log(`  - Overall Score: ${scoringResult.overallScore}/100`)
      console.log(`  - Communication: ${scoringResult.breakdown.communication}/100`)
      console.log(`  - Confidence: ${scoringResult.breakdown.confidence}/100`)
      console.log(`  - Technical Knowledge: ${scoringResult.breakdown.technicalKnowledge}/100`)
      console.log(`  - Problem Solving: ${scoringResult.breakdown.problemSolving}/100`)
      console.log(`  - Hiring Recommendation: ${scoringResult.hiringRecommendation}`)
      console.log(`  - Insights Count: ${scoringResult.insights.length}`)
      console.log(`  - Recommendations Count: ${scoringResult.recommendations.length}`)
    } else {
      console.error('❌ Scoring API Error:', scoringResponse.status)
    }

    // Test report generation
    console.log('\n📄 Testing Report Generation API...')
    const reportResponse = await fetch('http://localhost:3000/api/generate-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    })

    if (reportResponse.ok) {
      const pdfBuffer = await reportResponse.arrayBuffer()
      const pdfSize = pdfBuffer.byteLength
      console.log('✅ Report Generation Success:')
      console.log(`  - PDF Size: ${Math.round(pdfSize / 1024)} KB`)
      console.log(`  - Content-Type: ${reportResponse.headers.get('content-type')}`)
      console.log('  - Report generated successfully!')
      
      // Save the PDF for inspection (optional)
      const fs = require('fs')
      fs.writeFileSync('test-interview-report.pdf', Buffer.from(pdfBuffer))
      console.log('  - PDF saved as test-interview-report.pdf')
    } else {
      console.error('❌ Report Generation Error:', reportResponse.status, reportResponse.statusText)
      const errorText = await reportResponse.text()
      console.error('Error details:', errorText)
    }

  } catch (error) {
    console.error('❌ Test Error:', error)
  }
}

// Test with minimal data to check edge cases
async function testMinimalData() {
  console.log('\n🧪 Testing Minimal Data Edge Case...')
  
  const minimalData = {
    transcription: "Hi there.",
    emotions: [],
    duration: 10,
    timestamp: Date.now()
  }

  try {
    const scoringResponse = await fetch('http://localhost:3000/api/score-interview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(minimalData),
    })

    if (scoringResponse.ok) {
      const result = await scoringResponse.json()
      console.log('✅ Minimal Data Test:')
      console.log(`  - Overall Score: ${result.overallScore}/100`)
      console.log(`  - Recommendation: ${result.hiringRecommendation}`)
    }
  } catch (error) {
    console.error('❌ Minimal Data Test Error:', error)
  }
}

// Run the tests
async function runAllTests() {
  await testReportGeneration()
  await testMinimalData()
  console.log('\n✅ All tests completed!')
}

runAllTests()
