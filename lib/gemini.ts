import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize only when API key is available
const getGeminiAI = () => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('Gemini API key not configured')
  }
  return new GoogleGenerativeAI(apiKey)
}

export class GeminiClient {
  private model: any

  constructor() {
    // Model will be initialized when needed
    this.model = null
  }

  private getModel() {
    if (!this.model) {
      const genAI = getGeminiAI()
      this.model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
    }
    return this.model
  }

  async generateInterviewResponse(userInput: string, context: any) {
    try {
      const model = this.getModel()
      const prompt = this.buildInterviewPrompt(userInput, context)
      const result = await model.generateContent(prompt)
      return result.response.text()
    } catch (error) {
      console.error('Error generating interview response:', error)
      return this.getFallbackResponse(context.questionIndex)
    }
  }

  async analyzePerformance(transcription: string, emotions: any[], duration: number) {
    try {
      const model = this.getModel()
      const prompt = `
Analyze this interview performance and provide a comprehensive assessment:

Interview Duration: ${Math.floor(duration / 60)} minutes ${duration % 60} seconds
Total Words: ${transcription.split(' ').length}
Transcription: "${transcription}"
Emotion Analysis: ${emotions.length} data points

Provide analysis on:
1. Communication Skills (clarity, articulation, pace)
2. Content Quality (relevance, depth, examples)
3. Confidence Level (based on speech patterns and emotions)
4. Professional Presence (overall impression)
5. Areas of Strength
6. Areas for Improvement
7. Specific Recommendations

Format as a structured report with clear sections.
`

      const result = await model.generateContent(prompt)
      return result.response.text()
    } catch (error) {
      console.error('Error analyzing performance:', error)
      return this.getFallbackAnalysis(transcription, emotions, duration)
    }
  }

  async generateFollowUpQuestion(userResponse: string, currentQuestion: string, questionIndex: number) {
    try {
      const model = this.getModel()
      const prompt = `
As an AI interviewer, you just asked: "${currentQuestion}"
The candidate responded: "${userResponse}"

Generate a natural follow-up question that:
1. Builds on their response
2. Probes deeper into their experience
3. Maintains interview flow
4. Is encouraging but thorough
5. Is appropriate for question ${questionIndex + 1} of a professional interview

Keep it conversational and under 20 words.
`

      const result = await model.generateContent(prompt)
      return result.response.text()
    } catch (error) {
      console.error('Error generating follow-up:', error)
      return this.getFallbackFollowUp(questionIndex)
    }
  }

  async generateHiringRecommendation(analysisData: any) {
    try {
      const model = this.getModel()
      const prompt = `
Based on this interview analysis, provide a hiring recommendation:

Overall Score: ${analysisData.score}/100
Communication Score: ${analysisData.communicationScore}/10
Confidence Level: ${analysisData.confidenceLevel}/10
Technical Skills: ${analysisData.technicalSkills}/10
Duration: ${analysisData.duration} seconds
Word Count: ${analysisData.wordCount}
Key Emotions: ${analysisData.topEmotions.join(', ')}

Provide:
1. Clear recommendation (Hire, Maybe, No)
2. Key strengths
3. Areas of concern
4. Confidence level in recommendation
5. Additional considerations

Be objective and professional.
`

      const result = await model.generateContent(prompt)
      return result.response.text()
    } catch (error) {
      console.error('Error generating recommendation:', error)
      return this.getFallbackRecommendation(analysisData.score)
    }
  }

  private buildInterviewPrompt(userInput: string, context: any): string {
    const questions = [
      "Tell me about yourself and your professional background.",
      "What interests you most about this role?",
      "Describe a challenging project you've worked on recently.",
      "How do you handle working under pressure?",
      "Where do you see yourself in 5 years?"
    ]

    const currentQuestion = questions[context.questionIndex] || questions[0]

    return `
You are conducting a professional video interview. 

Current question: "${currentQuestion}"
Candidate's response: "${userInput}"
Interview progress: Question ${context.questionIndex + 1} of ${questions.length}

Your response should:
1. Acknowledge their answer professionally
2. Ask a relevant follow-up or transition smoothly
3. Be encouraging but thorough
4. Stay conversational and natural
5. Keep under 30 words

Respond as a professional interviewer:
`
  }

  private getFallbackResponse(questionIndex: number): string {
    const responses = [
      "Thank you for sharing that. Can you tell me more about the specific challenges you faced?",
      "That's interesting. How did that experience prepare you for this role?",
      "I appreciate your response. What would you say was the most important lesson you learned?",
      "Great answer. Can you provide a specific example to illustrate that point?",
      "Thank you. How do you think your experience aligns with what we're looking for?"
    ]
    return responses[questionIndex] || responses[0]
  }

  private getFallbackAnalysis(transcription: string, emotions: any[], duration: number): string {
    return `
Interview Performance Analysis

Duration: ${Math.floor(duration / 60)} minutes ${duration % 60} seconds
Communication: The candidate demonstrated clear verbal communication skills.
Engagement: Maintained good engagement throughout the interview session.
Response Quality: Provided thoughtful responses to interview questions.

Strengths:
- Clear communication style
- Professional demeanor
- Appropriate response length

Areas for Development:
- Could provide more specific examples
- Consider elaborating on technical skills
- Maintain consistent energy level

Overall Impression: Positive candidate with solid potential for the role.
`
  }

  private getFallbackFollowUp(questionIndex: number): string {
    const followUps = [
      "Can you elaborate on that experience?",
      "What specific skills would you bring to this role?",
      "How did you overcome those challenges?",
      "What did you learn from that situation?",
      "How does that align with your career goals?"
    ]
    return followUps[questionIndex] || followUps[0]
  }

  private getFallbackRecommendation(score: number): string {
    if (score >= 80) {
      return "Recommendation: HIRE - Strong candidate with excellent communication skills and professional presence."
    } else if (score >= 60) {
      return "Recommendation: MAYBE - Solid candidate with potential, recommend second interview."
    } else {
      return "Recommendation: NO - Candidate needs additional development before being suitable for this role."
    }
  }
}

export const geminiClient = new GeminiClient()
