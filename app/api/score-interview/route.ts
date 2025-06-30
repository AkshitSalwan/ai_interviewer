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
    const transcriptionText = data.transcription?.trim() || ''
    const wordCount = transcriptionText ? transcriptionText.split(/\s+/).filter(w => w.length > 0).length : 0
    const validEmotions = data.emotions?.filter(e => e && typeof e.score === 'number') || []
    
    console.log(`Scoring Analysis - Words: ${wordCount}, Emotions: ${validEmotions.length}, Duration: ${data.duration}`)
    
    // If absolutely no data, return fallback scoring
    if (wordCount === 0 && validEmotions.length === 0 && (!data.duration || data.duration === 0)) {
      console.log('No meaningful data for scoring, using zero fallback')
      return getFallbackScoring(data)
    }
    
    // Even with minimal data, we can provide some scoring
    if (wordCount > 0 || validEmotions.length > 0 || data.duration > 0) {
      console.log('Processing with available data...')
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
    // Create a more specific cache key
    const wordCount = data.transcription.split(/\s+/).filter(w => w.length > 1).length
    const avgEmotionScore = data.emotions.length > 0 
      ? Math.round((data.emotions.reduce((sum, e) => sum + e.score, 0) / data.emotions.length) * 100)
      : 0
    const cacheKey = `${wordCount}_${avgEmotionScore}_${Math.floor(data.duration / 30)}_${data.transcription.substring(0, 50).replace(/\s/g, '')}`
    
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
    
    // More detailed statistics for analysis
    const words = data.transcription.split(/\s+/).filter(w => w.length > 1)
    const sentences = data.transcription.split(/[.!?]+/).filter(s => s.trim().length > 5)
    const avgWordsPerSentence = sentences.length > 0 ? (words.length / sentences.length).toFixed(1) : '0'
    
    // Emotion analysis
    const emotionCounts: Record<string, number> = {}
    data.emotions.forEach(e => {
      emotionCounts[e.emotion] = (emotionCounts[e.emotion] || 0) + 1
    })
    const topEmotions = Object.entries(emotionCounts)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 3)
      .map(([emotion, count]) => `${emotion} (${count} times)`)
    
    const emotionSummary = data.emotions.length > 0 
      ? `Top emotions: ${topEmotions.join(', ')}. Average confidence: ${avgEmotionScore}%`
      : 'No emotion data available'
    
    // Content analysis keywords
    const technicalTerms = ['project', 'system', 'development', 'technology', 'framework', 'database', 'api']
    const foundTechnical = technicalTerms.filter(term => 
      data.transcription.toLowerCase().includes(term)
    )
    
    const problemSolvingTerms = ['challenge', 'problem', 'solution', 'approach', 'analyze']
    const foundProblemSolving = problemSolvingTerms.filter(term => 
      data.transcription.toLowerCase().includes(term)
    )

    const prompt = `
You are an expert interview assessor with 15+ years of experience. Analyze this candidate's interview performance with precision and actionable insights.

CANDIDATE STATISTICS:
- Interview Duration: ${Math.floor(data.duration / 60)}m ${data.duration % 60}s
- Total Words: ${words.length} words
- Sentences: ${sentences.length} 
- Average Words per Sentence: ${avgWordsPerSentence}
- Speaking Rate: ${data.duration > 0 ? Math.round((words.length / data.duration) * 60) : 0} words per minute
- ${emotionSummary}
- Technical Terms Used: ${foundTechnical.length > 0 ? foundTechnical.join(', ') : 'None detected'}
- Problem-Solving Language: ${foundProblemSolving.length > 0 ? foundProblemSolving.join(', ') : 'None detected'}

CANDIDATE RESPONSE:
"${data.transcription}"

PROVIDE DETAILED ANALYSIS:

1. **Communication Assessment** (be specific about word count, sentence structure, clarity):
   - Evaluate if ${words.length} words is appropriate for the response
   - Comment on sentence structure (avg ${avgWordsPerSentence} words/sentence)
   - Assess speaking pace and articulation

2. **Content Quality** (analyze depth and relevance):
   - Technical competency demonstrated through specific examples
   - Problem-solving approach and logical thinking
   - Use of industry-relevant terminology

3. **Professional Presence** (based on emotion data and language patterns):
   - Confidence level and emotional stability
   - Professional communication style
   - Areas showing strength or nervousness

4. **Specific Strengths** (list 2-3 concrete strengths with evidence)

5. **Improvement Areas** (list 2-3 specific, actionable recommendations)

6. **Overall Assessment** (hiring recommendation with rationale)

Be precise, evidence-based, and constructive. Focus on specific observations rather than generic comments. Limit response to 400 words.
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
  // Handle null/undefined transcription
  const transcriptionText = data.transcription?.trim() || ''
  
  if (!transcriptionText) {
    console.log('No transcription available for communication scoring')
    return 0
  }
  
  // Improved word counting - filter out empty strings and single characters
  const words = transcriptionText
    .split(/\s+/)
    .filter(word => word.length > 1 && /^[a-zA-Z'-]+$/.test(word))
  
  // More accurate sentence detection
  const sentences = transcriptionText
    .split(/[.!?]+/)
    .filter(s => s.trim().length > 5) // Only count meaningful sentences
  
  console.log(`Communication Analysis: ${words.length} words, ${sentences.length} sentences`)
  
  // Return early score for very minimal data
  if (words.length === 0) {
    return 0
  }
  
  // Base score on word count with better scaling
  // 10-50 words: basic, 50-150 words: good, 150-300: excellent, 300+: very good but might be verbose
  let wordScore = 0
  if (words.length >= 50 && words.length <= 150) {
    wordScore = Math.min((words.length / 150) * 45, 45)
  } else if (words.length > 150 && words.length <= 300) {
    wordScore = 45 + Math.min(((words.length - 150) / 150) * 35, 35)
  } else if (words.length > 300) {
    wordScore = 75 - Math.min(((words.length - 300) / 200) * 15, 15) // Slight penalty for being too verbose
  } else if (words.length >= 10) {
    wordScore = (words.length / 50) * 30 // Reduced penalty for fewer words
  } else {
    wordScore = words.length * 3 // Minimal score for very few words
  }
  
  // Improved sentence structure analysis
  const avgWordsPerSentence = sentences.length > 0 ? words.length / sentences.length : 0
  let structureScore = 0
  if (avgWordsPerSentence >= 8 && avgWordsPerSentence <= 20) {
    structureScore = 20 // Optimal sentence length
  } else if (avgWordsPerSentence >= 5 && avgWordsPerSentence <= 25) {
    structureScore = 15 // Good sentence length
  } else {
    structureScore = 5 // Poor sentence structure
  }
  
  // Enhanced vocabulary diversity with better filtering
  const uniqueWords = new Set(
    words
      .map(w => w.toLowerCase())
      .filter(w => w.length > 2 && !['the', 'and', 'but', 'for', 'are', 'that', 'this', 'was'].includes(w))
  )
  const diversityRatio = words.length > 0 ? uniqueWords.size / words.length : 0
  const diversityScore = Math.min(diversityRatio * 60, 20) // Cap at 20 points
  
  // Filler word penalty
  const fillerWords = ['um', 'uh', 'like', 'you know', 'basically', 'actually', 'literally']
  const fillerCount = fillerWords.reduce((count, filler) => {
    return count + (data.transcription.toLowerCase().match(new RegExp(`\\b${filler}\\b`, 'g')) || []).length
  }, 0)
  const fillerPenalty = Math.min(fillerCount * 2, 15) // Max penalty of 15 points
  
  const finalScore = Math.round(Math.max(0, Math.min(wordScore + structureScore + diversityScore - fillerPenalty, 100)))
  
  console.log(`Communication Score Breakdown:
    Words: ${wordScore.toFixed(1)} (${words.length} words)
    Structure: ${structureScore} (avg ${avgWordsPerSentence.toFixed(1)} words/sentence)
    Diversity: ${diversityScore.toFixed(1)} (${diversityRatio.toFixed(2)} ratio)
    Filler Penalty: -${fillerPenalty} (${fillerCount} filler words)
    Final: ${finalScore}`)
  
  return finalScore
}

function calculateConfidenceScore(data: InterviewData): number {
  // Handle missing or empty emotions array
  const emotions = data.emotions || []
  
  if (emotions.length === 0) {
    console.log('No emotion data available for confidence scoring')
    // Return a neutral confidence score based on the fact that they're speaking
    const transcriptionText = data.transcription?.trim() || ''
    if (transcriptionText && transcriptionText.length > 20) {
      return 50 // Neutral confidence if they're speaking
    }
    return 30 // Lower baseline if very little speech
  }
  
  // Filter valid emotions
  const validEmotions = emotions.filter(e => e && typeof e.score === 'number' && e.score >= 0 && e.score <= 1)
  
  if (validEmotions.length === 0) {
    console.log('No valid emotion scores found')
    return 40 // Baseline score
  }
  
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
  const transcriptionText = data.transcription?.trim() || ''
  
  if (!transcriptionText) {
    console.log('No transcription available for technical scoring')
    return 0
  }
  
  const text = transcriptionText.toLowerCase()
  
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
  const transcriptionText = data.transcription?.trim() || ''
  
  if (!transcriptionText) {
    console.log('No transcription available for problem-solving scoring')
    return 0
  }
  
  const text = transcriptionText.toLowerCase()
  
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
  const emotions = data.emotions || []
  
  if (emotions.length === 0) {
    console.log('No emotion data available for EI scoring')
    return 50 // Neutral baseline
  }
  
  const validEmotions = emotions.filter(e => e && typeof e.score === 'number')
  
  if (validEmotions.length === 0) {
    console.log('No valid emotions for EI scoring')
    return 40 // Lower baseline
  }
  
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
  const transcriptionText = data.transcription?.trim() || ''
  
  if (!transcriptionText) {
    console.log('No transcription available for articulation scoring')
    return 0
  }
  
  const text = transcriptionText
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
  
  // Calculate more detailed statistics
  const words = data.transcription.split(/\s+/).filter(w => w.length > 1)
  const sentences = data.transcription.split(/[.!?]+/).filter(s => s.trim().length > 5)
  const avgWordsPerSentence = sentences.length > 0 ? Math.round(words.length / sentences.length) : 0
  const speakingRate = data.duration > 0 ? Math.round((words.length / data.duration) * 60) : 0
  
  // Communication insights with specific metrics
  if (scores.communication >= 80) {
    insights.push(`Excellent communication skills: ${words.length} well-chosen words with strong sentence structure (avg ${avgWordsPerSentence} words/sentence)`)
  } else if (scores.communication >= 60) {
    insights.push(`Good communication foundation with ${words.length} words spoken, but could benefit from more detailed explanations`)
  } else {
    insights.push(`Communication needs improvement: only ${words.length} words spoken with average sentence length of ${avgWordsPerSentence} words`)
  }
  
  // Speaking pace analysis
  if (speakingRate > 0) {
    if (speakingRate >= 120 && speakingRate <= 160) {
      insights.push(`Optimal speaking pace at ${speakingRate} words per minute - clear and easy to follow`)
    } else if (speakingRate > 160) {
      insights.push(`Speaking pace is fast at ${speakingRate} words per minute - consider slowing down for clarity`)
    } else if (speakingRate < 120 && speakingRate > 0) {
      insights.push(`Speaking pace is slow at ${speakingRate} words per minute - could indicate hesitation or nervousness`)
    }
  }
  
  // Confidence insights with emotion data
  if (data.emotions.length > 0) {
    const avgEmotionScore = Math.round((data.emotions.reduce((sum, e) => sum + e.score, 0) / data.emotions.length) * 100)
    if (scores.confidence >= 80) {
      insights.push(`High confidence level demonstrated with ${avgEmotionScore}% average emotional stability across ${data.emotions.length} emotion readings`)
    } else if (scores.confidence >= 60) {
      insights.push(`Moderate confidence with ${avgEmotionScore}% emotional stability - some nervousness detected in ${data.emotions.length} readings`)
    } else {
      insights.push(`Lower confidence detected with ${avgEmotionScore}% emotional stability across ${data.emotions.length} readings - practice and preparation recommended`)
    }
  }
  
  // Technical knowledge insights
  const technicalTerms = ['project', 'system', 'development', 'technology', 'framework', 'database', 'api', 'solution', 'implementation']
  const foundTechnical = technicalTerms.filter(term => data.transcription.toLowerCase().includes(term))
  
  if (scores.technicalKnowledge >= 70) {
    insights.push(`Strong technical knowledge evidenced by use of ${foundTechnical.length} industry terms: ${foundTechnical.slice(0, 3).join(', ')}${foundTechnical.length > 3 ? '...' : ''}`)
  } else if (foundTechnical.length > 0) {
    insights.push(`Some technical knowledge shown with ${foundTechnical.length} relevant terms, but could demonstrate deeper expertise`)
  } else {
    insights.push(`Limited technical vocabulary detected - consider incorporating more industry-specific terminology and examples`)
  }
  
  // Response length analysis
  if (data.duration < 120) {
    insights.push(`Brief response duration (${Math.floor(data.duration / 60)}m ${data.duration % 60}s) - consider providing more comprehensive examples and details`)
  } else if (data.duration > 300) {
    insights.push(`Comprehensive response duration (${Math.floor(data.duration / 60)}m ${data.duration % 60}s) - excellent detail but ensure key points are clear`)
  } else {
    insights.push(`Good response length (${Math.floor(data.duration / 60)}m ${data.duration % 60}s) - appropriate balance of detail and conciseness`)
  }
  
  // Problem-solving language analysis
  const problemSolvingTerms = ['challenge', 'problem', 'solution', 'approach', 'analyze', 'strategy', 'method']
  const foundProblemSolving = problemSolvingTerms.filter(term => data.transcription.toLowerCase().includes(term))
  
  if (foundProblemSolving.length >= 3) {
    insights.push(`Strong problem-solving communication demonstrated through ${foundProblemSolving.length} relevant terms`)
  } else if (foundProblemSolving.length > 0) {
    insights.push(`Some problem-solving language present but could elaborate more on analytical thinking processes`)
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
