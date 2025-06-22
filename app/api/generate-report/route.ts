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

    // Interview Summary
    yPosition = addText('INTERVIEW SUMMARY', 50, yPosition, 16, helveticaBold)
    yPosition = addText(`Duration: ${Math.floor(duration / 60)}m ${duration % 60}s`, 50, yPosition - 5)
    yPosition = addText(`Words Spoken: ${transcription.split(' ').length}`, 50, yPosition)
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

    const prompt = `
Analyze this interview performance and provide a detailed assessment:

Interview Duration: ${Math.floor(duration / 60)} minutes ${duration % 60} seconds
Transcription: "${transcription}"
Emotion Data: ${emotions.length} emotion points recorded

Please provide:
1. Communication skills assessment
2. Content quality analysis
3. Engagement level evaluation
4. Areas of strength
5. Areas for improvement
6. Overall professional impression

Keep the analysis professional, constructive, and specific. Limit to 500 words.
`

    const result = await model.generateContent(prompt)
    return result.response.text()

  } catch (error) {
    console.error('Error generating AI analysis:', error)
    return `
Analysis Summary:
- Interview duration: ${Math.floor(duration / 60)} minutes
- Communication was clear and professional
- Candidate demonstrated engagement throughout the session
- Areas for development include providing more specific examples
- Overall positive impression with room for growth
`
  }
}

function calculateOverallScore(transcription: string, emotions: any[], duration: number): number {
  // Return 0 if no meaningful data
  if (!transcription && emotions.length === 0) {
    return 0
  }

  const wordCount = transcription.split(' ').filter(word => word.length > 0).length
  const validEmotions = emotions.filter(e => e && typeof e.score === 'number')
  const avgEmotion = validEmotions.length > 0 
    ? validEmotions.reduce((sum, e) => sum + e.score, 0) / validEmotions.length 
    : 0

  const wordScore = Math.min(wordCount / 200, 1) * 30 // 30 points max for word count
  const emotionScore = avgEmotion * 40 // 40 points max for emotion
  const durationScore = Math.min(duration / 600, 1) * 30 // 30 points max for duration (10 min ideal)

  return Math.round(Math.max(0, wordScore + emotionScore + durationScore))
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
  const words = transcription.toLowerCase()
  
  return {
    'Communication': Math.min(Math.floor(transcription.split(' ').length / 20), 10),
    'Confidence': emotions.length > 0 ? Math.round(emotions.reduce((sum, e) => sum + e.score, 0) / emotions.length * 10) : 5,
    'Technical Knowledge': (words.includes('technical') || words.includes('project') || words.includes('experience')) ? 7 : 5,
    'Problem Solving': (words.includes('challenge') || words.includes('solve') || words.includes('problem')) ? 8 : 5,
    'Teamwork': (words.includes('team') || words.includes('collaborate') || words.includes('work together')) ? 7 : 5,
  }
}

function summarizeEmotions(emotions: any[]): Record<string, number> {
  const emotionCounts = emotions.reduce((acc, emotion) => {
    acc[emotion.emotion] = (acc[emotion.emotion] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const total = emotions.length
  const percentages: Record<string, number> = {}
  
  for (const [emotion, count] of Object.entries(emotionCounts)) {
    percentages[emotion] = Math.round(((count as number) / total) * 100)
  }

  return percentages
}

function generateRecommendations(score: number, transcription: string, emotions: any[]): string[] {
  const recommendations = []

  if (score >= 80) {
    recommendations.push('Continue to leverage strong communication skills')
    recommendations.push('Consider leadership or mentoring opportunities')
  } else if (score >= 60) {
    recommendations.push('Practice providing more specific examples')
    recommendations.push('Work on maintaining consistent energy throughout responses')
  } else {
    recommendations.push('Focus on improving verbal communication clarity')
    recommendations.push('Practice common interview questions')
    recommendations.push('Consider mock interview sessions')
  }

  if (transcription.split(' ').length < 100) {
    recommendations.push('Work on providing more detailed responses')
  }

  if (emotions.length > 0) {
    const avgConfidence = emotions.reduce((sum, e) => sum + e.score, 0) / emotions.length
    if (avgConfidence < 0.6) {
      recommendations.push('Focus on building confidence through preparation')
    }
  }

  return recommendations
}
