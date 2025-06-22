import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini AI
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null

// Rate limiting cache
const rateLimitCache = new Map<string, { timestamp: number, response: string }>()
const RATE_LIMIT_WINDOW = 60000 // 1 minute
const MAX_REQUESTS_PER_MINUTE = 10 // Conservative limit

interface InterviewData {
  transcription: string
  emotions: Array<{
    emotion: string
    score: number
    timestamp: number
  }>
  duration: number
  questionIndex?: number
  responses?: string[]
}

interface ScoringResult {
  overallScore: number
  breakdown: {
    communication: number
    confidence: number
    technicalKnowledge: number
    problemSolving: number
    emotionalIntelligence: number
    articulation: number
  }
  insights: string[]
  recommendations: string[]
  aiAnalysis: string
  hiringRecommendation: 'STRONG_HIRE' | 'HIRE' | 'LEAN_HIRE' | 'NO_HIRE'
}

// Rate limiting function
function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const cacheEntry = rateLimitCache.get(key)
  
  if (cacheEntry && (now - cacheEntry.timestamp) < RATE_LIMIT_WINDOW) {
    return false // Rate limited
  }
  
  // Clean old entries
  Array.from(rateLimitCache.entries()).forEach(([k, v]) => {
    if (now - v.timestamp > RATE_LIMIT_WINDOW) {
      rateLimitCache.delete(k)
    }
  })
  
  return true // Not rate limited
}

// Cache AI analysis
function getCachedAnalysis(key: string): string | null {
  const cacheEntry = rateLimitCache.get(key)
  if (cacheEntry && (Date.now() - cacheEntry.timestamp) < RATE_LIMIT_WINDOW) {
    return cacheEntry.response
  }
  return null
}

// Cache AI analysis
function setCachedAnalysis(key: string, analysis: string): void {
  rateLimitCache.set(key, { timestamp: Date.now(), response: analysis })
}

export async function POST(request: NextRequest) {
  try {
    const interviewData: InterviewData = await request.json()
    
    // Generate comprehensive AI-driven score
    const scoringResult = await generateDynamicScore(interviewData)
    
    return NextResponse.json(scoringResult)
    
  } catch (error) {
    console.error('Error scoring interview:', error)
    return NextResponse.json(
      { error: 'Failed to score interview' },
      { status: 500 }
    )
  }
}

async function generateDynamicScore(data: InterviewData): Promise<ScoringResult> {
  try {
    // Check if we have meaningful data
    const wordCount = data.transcription ? data.transcription.split(' ').filter(w => w.length > 0).length : 0
    const validEmotions = data.emotions.filter(e => e && typeof e.score === 'number')
    
    // If no meaningful data, return fallback scoring
    if (wordCount === 0 && validEmotions.length === 0) {
      console.log('No meaningful data for scoring, using fallback')
      return getFallbackScoring(data)
    }
    
    // Get AI analysis first
    const aiAnalysis = await getAIAnalysis(data)
    
    // Calculate detailed scores based on multiple factors
    const communicationScore = calculateCommunicationScore(data)
    const confidenceScore = calculateConfidenceScore(data)
    const technicalScore = calculateTechnicalScore(data)
    const problemSolvingScore = calculateProblemSolvingScore(data)
    const emotionalIntelligenceScore = calculateEmotionalIntelligenceScore(data)
    const articulationScore = calculateArticulationScore(data)
    
    // Calculate weighted overall score
    const overallScore = Math.round(
      communicationScore * 0.25 +
      confidenceScore * 0.20 +
      technicalScore * 0.20 +
      problemSolvingScore * 0.15 +
      emotionalIntelligenceScore * 0.10 +
      articulationScore * 0.10
    )
    
    // Generate insights and recommendations
    const insights = generateInsights(data, {
      communication: communicationScore,
      confidence: confidenceScore,
      technicalKnowledge: technicalScore,
      problemSolving: problemSolvingScore,
      emotionalIntelligence: emotionalIntelligenceScore,
      articulation: articulationScore
    })
    
    const recommendations = generateRecommendations(overallScore, data)
    const hiringRecommendation = getHiringRecommendation(overallScore, data)
    
    return {
      overallScore,
      breakdown: {
        communication: communicationScore,
        confidence: confidenceScore,
        technicalKnowledge: technicalScore,
        problemSolving: problemSolvingScore,
        emotionalIntelligence: emotionalIntelligenceScore,
        articulation: articulationScore
      },
      insights,
      recommendations,
      aiAnalysis,
      hiringRecommendation
    }
    
  } catch (error) {
    console.error('Error in generateDynamicScore:', error)
    // Return fallback scoring
    return getFallbackScoring(data)
  }
}

async function getAIAnalysis(data: InterviewData): Promise<string> {
  if (!genAI) {
    return generateFallbackAnalysis(data)
  }
  
  try {
    // Create a cache key based on the data
    const cacheKey = `${data.transcription.substring(0, 100)}_${data.emotions.length}_${data.duration}`
    
    // Check if we have a cached response
    const cachedAnalysis = getCachedAnalysis(cacheKey)
    if (cachedAnalysis) {
      console.log('Using cached AI analysis')
      return cachedAnalysis
    }
    
    // Check rate limit
    if (!checkRateLimit('gemini_api')) {
      console.log('Rate limit exceeded, using fallback analysis')
      return generateFallbackAnalysis(data)
    }
    
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    
    const emotionSummary = data.emotions.length > 0 
      ? `Emotions detected: ${data.emotions.map(e => `${e.emotion} (${Math.round(e.score * 100)}%)`).join(', ')}`
      : 'No emotion data available'
    
    const prompt = `
As an expert interview assessor, analyze this candidate's performance:

Interview Duration: ${Math.floor(data.duration / 60)} minutes ${data.duration % 60} seconds
Word Count: ${data.transcription.split(' ').length} words
${emotionSummary}

Candidate Response: "${data.transcription}"

Provide a professional assessment covering:
1. Communication clarity and effectiveness
2. Technical competency demonstrated
3. Problem-solving approach
4. Confidence and presence
5. Areas of strength
6. Specific areas for improvement

Keep analysis professional, constructive, and specific. Limit to 300 words.
`

    const result = await model.generateContent(prompt)
    const analysis = result.response.text()
    
    // Cache the response
    setCachedAnalysis(cacheKey, analysis)
    
    return analysis
    
  } catch (error) {
    console.error('Error getting AI analysis:', error)
    return generateFallbackAnalysis(data)
  }
}

function calculateCommunicationScore(data: InterviewData): number {
  const words = data.transcription.split(' ').filter(word => word.length > 0)
  const sentences = data.transcription.split(/[.!?]+/).filter(s => s.trim().length > 0)
  
  // Base score on word count (target: 150-300 words for good response)
  const wordScore = Math.min(words.length / 200, 1) * 40
  
  // Sentence structure (average words per sentence: 12-20 is good)
  const avgWordsPerSentence = words.length / Math.max(sentences.length, 1)
  const structureScore = avgWordsPerSentence >= 8 && avgWordsPerSentence <= 25 ? 30 : 15
  
  // Vocabulary diversity
  const uniqueWords = new Set(words.map(w => w.toLowerCase()))
  const diversityScore = Math.min(uniqueWords.size / words.length, 0.8) * 30
  
  return Math.round(Math.min(wordScore + structureScore + diversityScore, 100))
}

function calculateConfidenceScore(data: InterviewData): number {
  if (data.emotions.length === 0) return 50
  
  // Average emotion confidence
  const avgEmotionScore = data.emotions.reduce((sum, e) => sum + e.score, 0) / data.emotions.length
  
  // Look for confident emotions
  const confidentEmotions = data.emotions.filter(e => 
    ['confident', 'happy', 'positive', 'calm'].includes(e.emotion.toLowerCase())
  )
  const confidenceRatio = confidentEmotions.length / data.emotions.length
  
  // Look for nervous emotions (negative impact)
  const nervousEmotions = data.emotions.filter(e => 
    ['nervous', 'worried', 'sad', 'anxious'].includes(e.emotion.toLowerCase())
  )
  const nervousRatio = nervousEmotions.length / data.emotions.length
  
  const baseScore = avgEmotionScore * 50
  const confidenceBonus = confidenceRatio * 30
  const nervousPenalty = nervousRatio * 20
  
  return Math.round(Math.max(Math.min(baseScore + confidenceBonus - nervousPenalty, 100), 0))
}

function calculateTechnicalScore(data: InterviewData): number {
  const text = data.transcription.toLowerCase()
  
  // Technical keywords and concepts
  const technicalKeywords = [
    'project', 'experience', 'technology', 'system', 'development', 'design',
    'implementation', 'solution', 'framework', 'database', 'api', 'architecture',
    'algorithm', 'optimization', 'testing', 'deployment', 'cloud', 'security'
  ]
  
  const methodologyKeywords = [
    'agile', 'scrum', 'waterfall', 'ci/cd', 'devops', 'version control',
    'git', 'docker', 'kubernetes', 'microservices', 'mvc', 'rest'
  ]
  
  const softSkillKeywords = [
    'team', 'collaboration', 'leadership', 'communication', 'problem-solving',
    'analytical', 'creative', 'innovative', 'adaptable', 'learning'
  ]
  
  let score = 0
  
  // Check for technical vocabulary
  const technicalCount = technicalKeywords.filter(keyword => text.includes(keyword)).length
  score += Math.min(technicalCount * 5, 40)
  
  // Check for methodology awareness
  const methodologyCount = methodologyKeywords.filter(keyword => text.includes(keyword)).length
  score += Math.min(methodologyCount * 8, 30)
  
  // Check for soft skills mention
  const softSkillCount = softSkillKeywords.filter(keyword => text.includes(keyword)).length
  score += Math.min(softSkillCount * 5, 30)
  
  return Math.round(Math.min(score, 100))
}

function calculateProblemSolvingScore(data: InterviewData): number {
  const text = data.transcription.toLowerCase()
  
  const problemSolvingIndicators = [
    'challenge', 'problem', 'solution', 'approach', 'analyze', 'evaluate',
    'consider', 'alternative', 'option', 'strategy', 'method', 'process',
    'step', 'first', 'then', 'finally', 'because', 'therefore', 'result'
  ]
  
  const structuredThinkingPhrases = [
    'first of all', 'to begin with', 'next', 'furthermore', 'in addition',
    'on the other hand', 'however', 'therefore', 'as a result', 'in conclusion'
  ]
  
  let score = 0
  
  // Problem-solving vocabulary
  const indicatorCount = problemSolvingIndicators.filter(indicator => text.includes(indicator)).length
  score += Math.min(indicatorCount * 4, 50)
  
  // Structured thinking
  const structureCount = structuredThinkingPhrases.filter(phrase => text.includes(phrase)).length
  score += Math.min(structureCount * 8, 30)
  
  // Example usage (indicates concrete experience)
  const exampleCount = (text.match(/for example|such as|instance|specifically/g) || []).length
  score += Math.min(exampleCount * 10, 20)
  
  return Math.round(Math.min(score, 100))
}

function calculateEmotionalIntelligenceScore(data: InterviewData): number {
  if (data.emotions.length === 0) return 50
  
  // Emotional stability (less variation is better)
  const emotionScores = data.emotions.map(e => e.score)
  const avgScore = emotionScores.reduce((a, b) => a + b, 0) / emotionScores.length
  const variance = emotionScores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) / emotionScores.length
  const stabilityScore = Math.max(0, 50 - variance * 100)
  
  // Positive emotion ratio
  const positiveEmotions = data.emotions.filter(e => 
    ['happy', 'confident', 'positive', 'calm', 'focused'].includes(e.emotion.toLowerCase())
  )
  const positiveRatio = positiveEmotions.length / data.emotions.length
  const positivityScore = positiveRatio * 50
  
  return Math.round(stabilityScore + positivityScore)
}

function calculateArticulationScore(data: InterviewData): number {
  const text = data.transcription
  const words = text.split(' ').filter(w => w.length > 0)
  
  if (words.length === 0) return 0
  
  // Filler word detection (negative impact)
  const fillerWords = ['um', 'uh', 'like', 'you know', 'basically', 'actually', 'literally']
  const fillerCount = words.filter(word => 
    fillerWords.includes(word.toLowerCase().replace(/[^\w]/g, ''))
  ).length
  const fillerPenalty = Math.min((fillerCount / words.length) * 100, 40)
  
  // Repetition detection
  const wordCounts = words.reduce((acc, word) => {
    const cleanWord = word.toLowerCase().replace(/[^\w]/g, '')
    acc[cleanWord] = (acc[cleanWord] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  
  const repeatedWords = Object.values(wordCounts).filter(count => count > 3).length
  const repetitionPenalty = Math.min(repeatedWords * 5, 20)
  
  // Base articulation score
  const baseScore = 80
  
  return Math.round(Math.max(baseScore - fillerPenalty - repetitionPenalty, 0))
}

function generateInsights(data: InterviewData, scores: any): string[] {
  const insights = []
  
  if (scores.communication >= 80) {
    insights.push("Excellent communication skills demonstrated with clear, well-structured responses")
  } else if (scores.communication >= 60) {
    insights.push("Good communication with room for more detailed explanations")
  } else {
    insights.push("Communication could be improved with more structured and detailed responses")
  }
  
  if (scores.confidence >= 80) {
    insights.push("High confidence level maintained throughout the interview")
  } else if (scores.confidence >= 60) {
    insights.push("Moderate confidence with some nervousness detected")
  } else {
    insights.push("Low confidence detected - consider additional preparation and practice")
  }
  
  if (scores.technicalKnowledge >= 70) {
    insights.push("Strong technical vocabulary and industry knowledge demonstrated")
  } else {
    insights.push("Technical knowledge could be enhanced with more specific examples and terminology")
  }
  
  if (data.duration < 180) {
    insights.push("Interview responses were brief - consider providing more detailed examples")
  } else if (data.duration > 600) {
    insights.push("Responses were comprehensive - ensure to stay concise and focused")
  }
  
  return insights
}

function generateRecommendations(score: number, data: InterviewData): string[] {
  const recommendations = []
  
  if (score >= 85) {
    recommendations.push("Continue leveraging strong interview skills")
    recommendations.push("Consider mentoring others in interview preparation")
  } else if (score >= 70) {
    recommendations.push("Practice providing more specific examples and details")
    recommendations.push("Work on maintaining consistent confidence throughout responses")
  } else if (score >= 50) {
    recommendations.push("Focus on structured response techniques (STAR method)")
    recommendations.push("Practice common interview questions with timed responses")
    recommendations.push("Work on technical vocabulary and industry knowledge")
  } else {
    recommendations.push("Invest in comprehensive interview preparation")
    recommendations.push("Consider mock interviews with feedback")
    recommendations.push("Build confidence through practice and preparation")
    recommendations.push("Study common interview patterns and response structures")
  }
  
  // Specific recommendations based on data
  if (data.transcription.split(' ').length < 100) {
    recommendations.push("Practice providing more detailed and comprehensive answers")
  }
  
  if (data.emotions.length > 0) {
    const nervousEmotions = data.emotions.filter(e => 
      ['nervous', 'worried', 'anxious'].includes(e.emotion.toLowerCase())
    )
    if (nervousEmotions.length > data.emotions.length * 0.3) {
      recommendations.push("Work on relaxation techniques and confidence building exercises")
    }
  }
  
  return recommendations
}

function getHiringRecommendation(score: number, data: InterviewData): 'STRONG_HIRE' | 'HIRE' | 'LEAN_HIRE' | 'NO_HIRE' {
  if (score >= 85) return 'STRONG_HIRE'
  if (score >= 70) return 'HIRE'
  if (score >= 55) return 'LEAN_HIRE'
  return 'NO_HIRE'
}

function generateFallbackAnalysis(data: InterviewData): string {
  return `
Interview Analysis Summary:
- Duration: ${Math.floor(data.duration / 60)} minutes with ${data.transcription.split(' ').length} words spoken
- Communication demonstrates ${data.transcription.length > 200 ? 'good' : 'adequate'} detail level
- ${data.emotions.length > 0 ? 'Emotion tracking shows varied engagement' : 'Limited emotion data available'}
- Response structure shows ${data.transcription.includes('example') || data.transcription.includes('experience') ? 'good use of examples' : 'opportunity for more specific examples'}
- Overall performance indicates ${data.duration > 300 ? 'thorough' : 'concise'} approach to questions
`
}

function getFallbackScoring(data: InterviewData): ScoringResult {
  // Return 0-based scoring when no meaningful data or AI is not available
  const validEmotions = data.emotions.filter(e => e && typeof e.score === 'number')
  const wordCount = data.transcription ? data.transcription.split(' ').filter(w => w.length > 0).length : 0
  const avgEmotion = validEmotions.length > 0 
    ? validEmotions.reduce((sum, e) => sum + e.score, 0) / validEmotions.length 
    : 0
    
  // Return 0 if no meaningful data
  if (wordCount === 0 && validEmotions.length === 0) {
    return {
      overallScore: 0,
      breakdown: {
        communication: 0,
        confidence: 0,
        technicalKnowledge: 0,
        problemSolving: 0,
        emotionalIntelligence: 0,
        articulation: 0
      },
      insights: ["No interview data available for analysis"],
      recommendations: ["Complete the interview to receive assessment"],
      aiAnalysis: "No data available for analysis",
      hiringRecommendation: 'NO_HIRE'
    }
  }
  
  const baseScore = Math.min(
    (wordCount / 200) * 30 + // Communication
    avgEmotion * 40 + // Confidence
    (data.duration / 600) * 30, // Duration appropriateness
    100
  )
  
  return {
    overallScore: Math.round(Math.max(0, baseScore)),
    breakdown: {
      communication: Math.round(Math.max(0, (wordCount / 150) * 100)),
      confidence: Math.round(avgEmotion * 100),
      technicalKnowledge: 0, // No way to assess without AI analysis
      problemSolving: 0, // No way to assess without AI analysis
      emotionalIntelligence: Math.round(avgEmotion * 100),
      articulation: wordCount > 50 ? Math.round((wordCount / 200) * 100) : 0
    },
    insights: [
      wordCount > 0 ? `${wordCount} words captured during interview` : "No speech detected",
      validEmotions.length > 0 ? `${validEmotions.length} emotion data points collected` : "No emotion data captured",
      data.duration > 0 ? `Interview duration: ${Math.floor(data.duration / 60)}m ${data.duration % 60}s` : "No duration recorded"
    ].filter(insight => insight !== ""),
    recommendations: wordCount > 0 
      ? ["Review interview performance for improvement opportunities"]
      : ["Ensure microphone is working and speak clearly during interview"],
    aiAnalysis: generateFallbackAnalysis(data),
    hiringRecommendation: baseScore >= 70 ? 'HIRE' : baseScore >= 40 ? 'LEAN_HIRE' : 'NO_HIRE'
  }
}
