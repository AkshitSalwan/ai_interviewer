import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { v2 as cloudinary } from 'cloudinary'

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export async function POST(request: NextRequest) {
  try {
    const { duration, transcription, emotions, timestamp } = await request.json()

    // Get dynamic AI scoring
    const scoringResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/score-interview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transcription,
        emotions,
        duration
      }),
    })
    
    const scoringResult = scoringResponse.ok 
      ? await scoringResponse.json()
      : {
          overallScore: calculateOverallScore(transcription || '', emotions || [], duration || 0),
          breakdown: {
            communication: 0,
            confidence: (() => {
              const validEmotions = (emotions || []).filter((e: any) => e?.score)
              return validEmotions.length > 0 
                ? Math.round((validEmotions.reduce((sum: number, e: any) => sum + e.score, 0) / validEmotions.length) * 100)
                : 0
            })(),
            technicalKnowledge: 0,
            problemSolving: 0,
            emotionalIntelligence: 0,
            articulation: 0
          },
          insights: transcription ? ['Interview data captured'] : ['No interview data available'],
          recommendations: transcription ? ['Review performance for improvement areas'] : ['Complete interview to receive recommendations'],
          aiAnalysis: '',
          hiringRecommendation: calculateOverallScore(transcription || '', emotions || [], duration || 0) >= 50 ? 'CONSIDER' : 'NEEDS_IMPROVEMENT'
        }

    // Generate AI analysis (fallback if scoring fails)
    const analysis = scoringResult.aiAnalysis || await generateAnalysis(transcription, emotions, duration)

    // Create PDF
    const pdfDoc = await PDFDocument.create()
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    // Add pages
    let page = pdfDoc.addPage([612, 792]) // Letter size
    const { width, height } = page.getSize()
    let yPosition = height - 50

    // Helper function to add text
    const addText = (text: string, x: number, y: number, size = 12, font = helveticaFont, color = rgb(0, 0, 0)) => {
      page.drawText(text, {
        x,
        y,
        size,
        font,
        color,
      })
      return y - size - 5
    }

    // Header
    yPosition = addText('AI VIDEO INTERVIEW REPORT', 50, yPosition, 24, helveticaBold, rgb(0.2, 0.4, 0.8))
    yPosition = addText(`Generated on: ${new Date(timestamp).toLocaleDateString()}`, 50, yPosition - 10, 10, helveticaFont, rgb(0.5, 0.5, 0.5))
    yPosition -= 20

    // Interview Summary with improved metrics
    const wordMetrics = calculateWordMetrics(transcription)
    const speakingRate = duration > 0 ? Math.round((wordMetrics.totalWords / duration) * 60) : 0
    
    yPosition = addText('INTERVIEW SUMMARY', 50, yPosition, 16, helveticaBold)
    yPosition = addText(`Duration: ${Math.floor(duration / 60)}m ${duration % 60}s`, 50, yPosition - 5)
    yPosition = addText(`Words Spoken: ${wordMetrics.totalWords}`, 50, yPosition)
    yPosition = addText(`Unique Words: ${wordMetrics.uniqueWords}`, 50, yPosition)
    yPosition = addText(`Speaking Rate: ${speakingRate} words/minute`, 50, yPosition)
    yPosition = addText(`Sentence Count: ${wordMetrics.sentences}`, 50, yPosition)
    yPosition = addText(`Emotion Data Points: ${emotions.length}`, 50, yPosition)
    yPosition -= 20

    // Overall Score
    const overallScore = scoringResult.overallScore
    yPosition = addText('OVERALL ASSESSMENT', 50, yPosition, 16, helveticaBold)
    yPosition = addText(`Score: ${overallScore}/100`, 50, yPosition - 5, 14, helveticaBold, getScoreColor(overallScore))
    yPosition = addText(`Recommendation: ${scoringResult.hiringRecommendation.replace('_', ' ')}`, 50, yPosition - 5)
    yPosition = addText(getRecommendationText(overallScore), 50, yPosition - 5)
    yPosition -= 20

    // Detailed Score Breakdown
    yPosition = addText('DETAILED SCORE BREAKDOWN', 50, yPosition, 16, helveticaBold)
    const breakdown = scoringResult.breakdown
    yPosition = addText(`Communication Skills: ${breakdown.communication}/100`, 50, yPosition - 5)
    yPosition = addText(`Confidence Level: ${breakdown.confidence}/100`, 50, yPosition)
    yPosition = addText(`Technical Knowledge: ${breakdown.technicalKnowledge}/100`, 50, yPosition)
    yPosition = addText(`Problem Solving: ${breakdown.problemSolving}/100`, 50, yPosition)
    yPosition = addText(`Emotional Intelligence: ${breakdown.emotionalIntelligence}/100`, 50, yPosition)
    yPosition = addText(`Articulation: ${breakdown.articulation}/100`, 50, yPosition)
    yPosition -= 20

    // AI Insights
    yPosition = addText('AI INSIGHTS', 50, yPosition, 16, helveticaBold)
    const insights = scoringResult.insights
    for (const insight of insights) {
      if (yPosition < 100) {
        page = pdfDoc.addPage([612, 792])
        yPosition = height - 50
      }
      yPosition = addText(`• ${insight}`, 50, yPosition, 11)
    }
    yPosition -= 20

    // AI Analysis
    yPosition = addText('AI ANALYSIS', 50, yPosition, 16, helveticaBold)
    const analysisLines = analysis.split('\n').filter((line: string) => line.trim())
    for (const line of analysisLines) {
      if (yPosition < 100) {
        page = pdfDoc.addPage([612, 792])
        yPosition = height - 50
      }
      yPosition = addText(line, 50, yPosition, 11)
    }
    yPosition -= 20

    // Skills Assessment
    yPosition = addText('SKILLS ASSESSMENT', 50, yPosition, 16, helveticaBold)
    const skills = assessSkills(transcription, emotions)
    for (const [skill, score] of Object.entries(skills)) {
      if (yPosition < 100) {
        page = pdfDoc.addPage([612, 792])
        yPosition = height - 50
      }
      yPosition = addText(`${skill}: ${score}/10`, 50, yPosition, 12)
    }
    yPosition -= 20

    // Emotion Analysis
    if (emotions.length > 0) {
      yPosition = addText('EMOTION ANALYSIS', 50, yPosition, 16, helveticaBold)
      const emotionSummary = summarizeEmotions(emotions)
      for (const [emotion, percentage] of Object.entries(emotionSummary)) {
        if (yPosition < 100) {
          page = pdfDoc.addPage([612, 792])
          yPosition = height - 50
        }
        yPosition = addText(`${emotion}: ${percentage}%`, 50, yPosition, 12)
      }
      yPosition -= 20
    }

    // Recommendations
    yPosition = addText('RECOMMENDATIONS', 50, yPosition, 16, helveticaBold)
    const recommendations = scoringResult.recommendations
    for (const rec of recommendations) {
      if (yPosition < 100) {
        page = pdfDoc.addPage([612, 792])
        yPosition = height - 50
      }
      yPosition = addText(`• ${rec}`, 50, yPosition, 11)
    }

    // Footer
    if (yPosition < 100) {
      page = pdfDoc.addPage([612, 792])
      yPosition = height - 50
    }
    addText('Report generated by AI Video Interview Platform', 50, 50, 8, helveticaFont, rgb(0.5, 0.5, 0.5))
    addText('© 2024 All rights reserved', 50, 35, 8, helveticaFont, rgb(0.5, 0.5, 0.5))

    const pdfBytes = await pdfDoc.save()

    return new NextResponse(pdfBytes, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="interview-report-${Date.now()}.pdf"`,
      },
    })

  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}

async function generateAnalysis(transcription: string, emotions: any[], duration: number): Promise<string> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    const wordMetrics = calculateWordMetrics(transcription)
    const emotionStats = calculateEmotionStats(emotions)
    const speakingRate = duration > 0 ? Math.round((wordMetrics.totalWords / duration) * 60) : 0

    const prompt = `
Analyze this interview performance and provide a detailed professional assessment:

INTERVIEW METRICS:
- Duration: ${Math.floor(duration / 60)} minutes ${duration % 60} seconds
- Total Words: ${wordMetrics.totalWords}
- Unique Words: ${wordMetrics.uniqueWords}
- Vocabulary Diversity: ${wordMetrics.vocabularyDiversity.toFixed(2)}
- Speaking Rate: ${speakingRate} words/minute
- Sentence Count: ${wordMetrics.sentences}
- Average Words per Sentence: ${wordMetrics.avgWordsPerSentence.toFixed(1)}
- Filler Words Count: ${wordMetrics.fillerWords}

EMOTION ANALYSIS:
- Total Emotion Points: ${emotions.length}
- Average Confidence: ${emotionStats.avgConfidence.toFixed(2)}
- Confidence Range: ${emotionStats.minConfidence.toFixed(2)} - ${emotionStats.maxConfidence.toFixed(2)}
- Most Frequent Emotion: ${emotionStats.dominantEmotion}

TRANSCRIPTION: "${transcription}"

Please provide a comprehensive analysis covering:

1. COMMUNICATION EFFECTIVENESS:
   - Clarity and articulation assessment
   - Speaking pace and rhythm evaluation
   - Vocabulary richness and variety

2. CONTENT QUALITY:
   - Depth of responses
   - Relevance and focus
   - Use of specific examples or evidence

3. EMOTIONAL INTELLIGENCE:
   - Confidence levels throughout interview
   - Emotional stability and consistency
   - Non-verbal communication indicators

4. PROFESSIONAL PRESENCE:
   - Overall impression
   - Engagement level
   - Interview readiness

5. AREAS OF STRENGTH:
   - Specific skills demonstrated
   - Notable qualities observed

6. IMPROVEMENT OPPORTUNITIES:
   - Specific areas to develop
   - Actionable recommendations

7. OVERALL ASSESSMENT:
   - Summary of performance
   - Hiring recommendation rationale

Provide specific, evidence-based insights using the metrics provided. Keep analysis professional, constructive, and actionable. Aim for 600-800 words with specific examples from the data.
`

    const result = await model.generateContent(prompt)
    return result.response.text()

  } catch (error) {
    console.error('Error generating AI analysis:', error)
    const wordMetrics = calculateWordMetrics(transcription)
    const speakingRate = duration > 0 ? Math.round((wordMetrics.totalWords / duration) * 60) : 0
    
    return `
INTERVIEW ANALYSIS SUMMARY

Communication Assessment:
- Spoke ${wordMetrics.totalWords} words over ${Math.floor(duration / 60)} minutes
- Speaking rate: ${speakingRate} words per minute (ideal range: 140-160 wpm)
- Vocabulary diversity: ${wordMetrics.vocabularyDiversity.toFixed(2)} (higher is better)
- Used ${wordMetrics.uniqueWords} unique words showing ${wordMetrics.vocabularyDiversity > 0.5 ? 'good' : 'limited'} vocabulary range

Content Quality:
- Delivered ${wordMetrics.sentences} sentences with average length of ${wordMetrics.avgWordsPerSentence.toFixed(1)} words
- ${wordMetrics.fillerWords > 10 ? 'Consider reducing filler words' : 'Good control of filler words'}
- Responses were ${wordMetrics.avgWordsPerSentence > 15 ? 'detailed' : 'concise'}

Professional Impression:
- ${emotions.length > 0 ? 'Demonstrated emotional engagement throughout the interview' : 'Limited emotional data captured'}
- Overall performance shows ${wordMetrics.totalWords > 200 ? 'substantive' : 'brief'} communication
- ${speakingRate < 120 ? 'Consider speaking more confidently' : speakingRate > 180 ? 'Consider slowing down for clarity' : 'Good speaking pace'}

Recommendations:
- ${wordMetrics.vocabularyDiversity < 0.4 ? 'Work on expanding vocabulary and using more varied expressions' : 'Continue leveraging strong vocabulary skills'}
- ${wordMetrics.fillerWords > 15 ? 'Practice reducing filler words (um, uh, like)' : 'Maintain clean speech patterns'}
- ${wordMetrics.totalWords < 150 ? 'Provide more detailed responses to showcase expertise' : 'Good level of detail in responses'}
`
  }
}

function calculateWordMetrics(transcription: string) {
  if (!transcription || transcription.trim().length === 0) {
    return {
      totalWords: 0,
      uniqueWords: 0,
      vocabularyDiversity: 0,
      sentences: 0,
      avgWordsPerSentence: 0,
      fillerWords: 0
    }
  }

  // Clean and normalize text
  const cleanText = transcription
    .toLowerCase()
    .replace(/[^\w\s\.\!\?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  // Count words
  const words = cleanText.split(' ').filter(word => word.length > 0)
  const totalWords = words.length
  
  // Count unique words
  const uniqueWordsSet = new Set(words.filter(word => word.length > 2)) // Filter out very short words
  const uniqueWords = uniqueWordsSet.size
  
  // Calculate vocabulary diversity (Type-Token Ratio)
  const vocabularyDiversity = totalWords > 0 ? uniqueWords / totalWords : 0
  
  // Count sentences
  const sentences = Math.max(1, transcription.split(/[.!?]+/).filter(s => s.trim().length > 0).length)
  
  // Average words per sentence
  const avgWordsPerSentence = totalWords / sentences
  
  // Count filler words
  const fillerWordsList = ['um', 'uh', 'like', 'you know', 'actually', 'basically', 'literally', 'sort of', 'kind of']
  let fillerWords = 0
  const fullText = transcription.toLowerCase()
  fillerWordsList.forEach(filler => {
    const regex = new RegExp(`\\b${filler}\\b`, 'g')
    const matches = fullText.match(regex)
    if (matches) fillerWords += matches.length
  })

  return {
    totalWords,
    uniqueWords,
    vocabularyDiversity,
    sentences,
    avgWordsPerSentence,
    fillerWords
  }
}

function calculateEmotionStats(emotions: any[]) {
  if (!emotions || emotions.length === 0) {
    return {
      avgConfidence: 0,
      minConfidence: 0,
      maxConfidence: 0,
      dominantEmotion: 'neutral'
    }
  }

  const validEmotions = emotions.filter(e => e && typeof e.score === 'number' && e.emotion)
  
  if (validEmotions.length === 0) {
    return {
      avgConfidence: 0,
      minConfidence: 0,
      maxConfidence: 0,
      dominantEmotion: 'neutral'
    }
  }

  const scores = validEmotions.map(e => e.score)
  const avgConfidence = scores.reduce((sum, score) => sum + score, 0) / scores.length
  const minConfidence = Math.min(...scores)
  const maxConfidence = Math.max(...scores)

  // Find dominant emotion
  const emotionCounts = validEmotions.reduce((acc, emotion) => {
    acc[emotion.emotion] = (acc[emotion.emotion] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const dominantEmotion = Object.entries(emotionCounts)
    .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0] || 'neutral'

  return {
    avgConfidence,
    minConfidence,
    maxConfidence,
    dominantEmotion
  }
}

function calculateOverallScore(transcription: string, emotions: any[], duration: number): number {
  // Return 0 if no meaningful data
  if (!transcription || transcription.trim().length === 0) {
    return 0
  }

  const wordMetrics = calculateWordMetrics(transcription)
  const emotionStats = calculateEmotionStats(emotions)
  const speakingRate = duration > 0 ? Math.round((wordMetrics.totalWords / duration) * 60) : 0

  // Communication Score (0-40 points)
  let communicationScore = 0
  
  // Word count scoring (0-15 points)
  if (wordMetrics.totalWords >= 300) communicationScore += 15
  else if (wordMetrics.totalWords >= 200) communicationScore += 12
  else if (wordMetrics.totalWords >= 100) communicationScore += 8
  else if (wordMetrics.totalWords >= 50) communicationScore += 4
  
  // Vocabulary diversity (0-10 points)
  communicationScore += Math.min(wordMetrics.vocabularyDiversity * 20, 10)
  
  // Speaking rate (0-10 points) - ideal range 140-160 wpm
  if (speakingRate >= 140 && speakingRate <= 160) communicationScore += 10
  else if (speakingRate >= 120 && speakingRate <= 180) communicationScore += 7
  else if (speakingRate >= 100 && speakingRate <= 200) communicationScore += 4
  else if (speakingRate > 0) communicationScore += 2
  
  // Filler words penalty (0-5 points)
  const fillerRatio = wordMetrics.totalWords > 0 ? wordMetrics.fillerWords / wordMetrics.totalWords : 0
  if (fillerRatio < 0.02) communicationScore += 5
  else if (fillerRatio < 0.05) communicationScore += 3
  else if (fillerRatio < 0.1) communicationScore += 1

  // Confidence Score (0-30 points)
  let confidenceScore = 0
  if (emotions.length > 0) {
    confidenceScore = Math.min(emotionStats.avgConfidence * 30, 30)
    
    // Stability bonus (consistent confidence)
    const confidenceRange = emotionStats.maxConfidence - emotionStats.minConfidence
    if (confidenceRange < 0.2) confidenceScore += 5 // Very stable
    else if (confidenceRange < 0.4) confidenceScore += 2 // Moderately stable
  } else {
    // Default confidence score based on speech patterns
    if (wordMetrics.totalWords > 100) confidenceScore = 15
    else if (wordMetrics.totalWords > 50) confidenceScore = 10
    else confidenceScore = 5
  }

  // Duration Score (0-20 points)
  let durationScore = 0
  if (duration >= 300 && duration <= 900) durationScore = 20 // 5-15 minutes ideal
  else if (duration >= 180 && duration <= 1200) durationScore = 15 // 3-20 minutes good
  else if (duration >= 120) durationScore = 10 // 2+ minutes acceptable
  else if (duration >= 60) durationScore = 5 // 1+ minute minimal

  // Content Quality Score (0-10 points)
  let contentScore = 0
  const text = transcription.toLowerCase()
  
  // Check for technical/professional terms
  const professionalTerms = ['experience', 'project', 'team', 'challenge', 'solution', 'develop', 'manage', 'lead', 'analyze', 'implement']
  const termCount = professionalTerms.reduce((count, term) => {
    return count + (text.includes(term) ? 1 : 0)
  }, 0)
  contentScore += Math.min(termCount * 1, 5)
  
  // Sentence structure bonus
  if (wordMetrics.avgWordsPerSentence >= 8 && wordMetrics.avgWordsPerSentence <= 20) {
    contentScore += 3
  } else if (wordMetrics.avgWordsPerSentence >= 5) {
    contentScore += 1
  }
  
  // Multiple sentences bonus
  if (wordMetrics.sentences >= 5) contentScore += 2
  else if (wordMetrics.sentences >= 3) contentScore += 1

  const totalScore = Math.min(100, Math.round(communicationScore + confidenceScore + durationScore + contentScore))
  return Math.max(0, totalScore)
}

function getScoreColor(score: number) {
  if (score === 0) return rgb(0.5, 0.5, 0.5) // Gray for no data
  if (score >= 80) return rgb(0, 0.7, 0) // Green
  if (score >= 60) return rgb(0.8, 0.6, 0) // Orange
  return rgb(0.8, 0, 0) // Red
}

function getRecommendationText(score: number): string {
  if (score === 0) return 'No Data - Insufficient interview data for assessment'
  if (score >= 80) return 'Excellent - Strong candidate recommended for hire'
  if (score >= 60) return 'Good - Solid candidate with potential'
  return 'Needs Improvement - Consider additional evaluation'
}

function assessSkills(transcription: string, emotions: any[]): Record<string, number> {
  const wordMetrics = calculateWordMetrics(transcription)
  const emotionStats = calculateEmotionStats(emotions)
  const text = transcription.toLowerCase()
  
  // Communication Skills (based on word metrics and clarity)
  let communicationScore = 0
  if (wordMetrics.totalWords >= 200) communicationScore += 4
  else if (wordMetrics.totalWords >= 100) communicationScore += 3
  else if (wordMetrics.totalWords >= 50) communicationScore += 2
  else communicationScore += 1
  
  communicationScore += Math.min(Math.round(wordMetrics.vocabularyDiversity * 4), 3)
  communicationScore += Math.min(Math.round((1 - (wordMetrics.fillerWords / Math.max(wordMetrics.totalWords, 1))) * 3), 3)
  
  // Confidence (based on emotion data and speech patterns)
  let confidenceScore = 5 // baseline
  if (emotions.length > 0) {
    confidenceScore = Math.round(emotionStats.avgConfidence * 10)
    // Consistency bonus
    const confidenceRange = emotionStats.maxConfidence - emotionStats.minConfidence
    if (confidenceRange < 0.2) confidenceScore = Math.min(confidenceScore + 1, 10)
  } else {
    // Infer from speech patterns
    if (wordMetrics.totalWords > 150 && wordMetrics.fillerWords < 10) confidenceScore = 7
    else if (wordMetrics.totalWords > 100) confidenceScore = 6
  }
  
  // Technical Knowledge (keyword analysis)
  const technicalTerms = [
    'technical', 'technology', 'software', 'development', 'programming', 'coding',
    'algorithm', 'database', 'system', 'architecture', 'framework', 'api',
    'project', 'application', 'platform', 'infrastructure', 'deployment',
    'testing', 'debugging', 'optimization', 'performance', 'security'
  ]
  let technicalScore = 3 // baseline
  technicalTerms.forEach(term => {
    if (text.includes(term)) technicalScore += 0.5
  })
  technicalScore = Math.min(Math.round(technicalScore), 10)
  
  // Problem Solving (analyzing language patterns)
  const problemSolvingTerms = [
    'challenge', 'problem', 'solve', 'solution', 'approach', 'strategy',
    'analyze', 'identify', 'resolve', 'overcome', 'improve', 'optimize',
    'troubleshoot', 'debug', 'fix', 'issue', 'alternative', 'consider'
  ]
  let problemSolvingScore = 3 // baseline
  problemSolvingTerms.forEach(term => {
    if (text.includes(term)) problemSolvingScore += 0.5
  })
  problemSolvingScore = Math.min(Math.round(problemSolvingScore), 10)
  
  // Teamwork (collaboration indicators)
  const teamworkTerms = [
    'team', 'collaborate', 'cooperation', 'together', 'group', 'colleague',
    'share', 'communicate', 'discuss', 'meeting', 'feedback', 'support',
    'help', 'assist', 'work with', 'partner', 'stakeholder'
  ]
  let teamworkScore = 4 // baseline
  teamworkTerms.forEach(term => {
    if (text.includes(term)) teamworkScore += 0.4
  })
  teamworkScore = Math.min(Math.round(teamworkScore), 10)
  
  // Leadership (leadership language)
  const leadershipTerms = [
    'lead', 'manage', 'supervise', 'direct', 'guide', 'mentor',
    'delegate', 'organize', 'coordinate', 'initiative', 'responsibility',
    'decision', 'strategy', 'vision', 'motivate', 'inspire'
  ]
  let leadershipScore = 3 // baseline
  leadershipTerms.forEach(term => {
    if (text.includes(term)) leadershipScore += 0.6
  })
  leadershipScore = Math.min(Math.round(leadershipScore), 10)
  
  return {
    'Communication': Math.max(1, Math.min(communicationScore, 10)),
    'Confidence': Math.max(1, Math.min(confidenceScore, 10)),
    'Technical Knowledge': Math.max(1, Math.min(technicalScore, 10)),
    'Problem Solving': Math.max(1, Math.min(problemSolvingScore, 10)),
    'Teamwork': Math.max(1, Math.min(teamworkScore, 10)),
    'Leadership': Math.max(1, Math.min(leadershipScore, 10))
  }
}

function summarizeEmotions(emotions: any[]): Record<string, number> {
  if (!emotions || emotions.length === 0) {
    return { 'neutral': 100 }
  }

  const validEmotions = emotions.filter(e => e && e.emotion && typeof e.score === 'number')
  
  if (validEmotions.length === 0) {
    return { 'neutral': 100 }
  }

  // Count emotions weighted by confidence score
  const emotionWeights = validEmotions.reduce((acc, emotion) => {
    const weight = emotion.score || 0.5 // Use confidence as weight
    acc[emotion.emotion] = (acc[emotion.emotion] || 0) + weight
    return acc
  }, {} as Record<string, number>)

  const totalWeight = Object.values(emotionWeights as Record<string, number>).reduce((sum: number, weight: number) => sum + weight, 0)
  const percentages: Record<string, number> = {}
  
  for (const [emotion, weight] of Object.entries(emotionWeights)) {
    percentages[emotion] = Math.round(((weight as number) / totalWeight) * 100)
  }

  // Sort by percentage and return top emotions
  const sortedEmotions = Object.entries(percentages)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5) // Top 5 emotions
    .reduce((acc, [emotion, percentage]) => {
      acc[emotion] = percentage
      return acc
    }, {} as Record<string, number>)

  return sortedEmotions
}

function generateRecommendations(score: number, transcription: string, emotions: any[]): string[] {
  const recommendations: string[] = []
  const wordMetrics = calculateWordMetrics(transcription)
  const emotionStats = calculateEmotionStats(emotions)
  const speakingRate = transcription ? Math.round((wordMetrics.totalWords / 60) * 60) : 0

  // Score-based recommendations
  if (score >= 85) {
    recommendations.push('Excellent performance - continue leveraging your strong communication skills')
    recommendations.push('Consider mentoring others or taking on leadership opportunities')
    recommendations.push('Maintain your confidence and articulation in future interviews')
  } else if (score >= 70) {
    recommendations.push('Strong overall performance with room for fine-tuning')
    recommendations.push('Continue developing your professional communication style')
    recommendations.push('Consider expanding on technical examples when relevant')
  } else if (score >= 50) {
    recommendations.push('Good foundation with several areas for improvement')
    recommendations.push('Practice providing more detailed and specific responses')
    recommendations.push('Work on building confidence through preparation and mock interviews')
  } else {
    recommendations.push('Focus on fundamental interview preparation and communication skills')
    recommendations.push('Practice common interview questions and develop structured responses')
    recommendations.push('Consider working with a career coach or conducting mock interviews')
  }

  // Word count specific recommendations
  if (wordMetrics.totalWords < 100) {
    recommendations.push('Provide more detailed responses - aim for 150-300 words per answer')
    recommendations.push('Use specific examples and stories to illustrate your points')
  } else if (wordMetrics.totalWords > 500) {
    recommendations.push('Practice being more concise while maintaining substance in your answers')
    recommendations.push('Focus on the most relevant points to avoid overwhelming the interviewer')
  }

  // Vocabulary and filler words
  if (wordMetrics.vocabularyDiversity < 0.4) {
    recommendations.push('Work on expanding your vocabulary and using more varied expressions')
    recommendations.push('Read industry publications to familiarize yourself with professional terminology')
  }

  if (wordMetrics.fillerWords > 15) {
    recommendations.push('Practice reducing filler words (um, uh, like) through conscious speaking exercises')
    recommendations.push('Pause briefly instead of using filler words when gathering thoughts')
  }

  // Speaking rate recommendations
  if (speakingRate > 0) {
    if (speakingRate < 120) {
      recommendations.push('Consider speaking slightly faster to demonstrate confidence and engagement')
      recommendations.push('Practice speaking with more energy and enthusiasm')
    } else if (speakingRate > 180) {
      recommendations.push('Slow down your speaking pace for better clarity and comprehension')
      recommendations.push('Take brief pauses to allow your points to resonate')
    }
  }

  // Emotion-based recommendations
  if (emotions.length > 0) {
    if (emotionStats.avgConfidence < 0.5) {
      recommendations.push('Work on building confidence through thorough preparation and practice')
      recommendations.push('Use positive body language and maintain good posture during interviews')
    }
    
    const confidenceRange = emotionStats.maxConfidence - emotionStats.minConfidence
    if (confidenceRange > 0.5) {
      recommendations.push('Focus on maintaining consistent confidence throughout the interview')
      recommendations.push('Practice relaxation techniques to manage interview anxiety')
    }
  }

  // Sentence structure recommendations
  if (wordMetrics.sentences < 3) {
    recommendations.push('Structure your responses with multiple sentences for better clarity')
    recommendations.push('Use transition phrases to connect your ideas smoothly')
  } else if (wordMetrics.avgWordsPerSentence > 25) {
    recommendations.push('Break down complex ideas into shorter, more digestible sentences')
    recommendations.push('Vary your sentence length for better flow and engagement')
  }

  // Content quality recommendations
  const text = transcription.toLowerCase()
  const hasExamples = text.includes('example') || text.includes('instance') || text.includes('time when')
  if (!hasExamples && wordMetrics.totalWords > 50) {
    recommendations.push('Include specific examples and stories to support your responses')
    recommendations.push('Use the STAR method (Situation, Task, Action, Result) for behavioral questions')
  }

  // Remove duplicates and limit recommendations
  const uniqueRecommendations = recommendations.filter((item, index) => recommendations.indexOf(item) === index)
  return uniqueRecommendations.slice(0, 8) // Limit to 8 most relevant recommendations
}
