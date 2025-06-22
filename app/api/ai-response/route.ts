import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const getGeminiAI = () => {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('Gemini API key not configured')
  }
  return new GoogleGenerativeAI(apiKey)
}

export async function POST(request: NextRequest) {
  try {
    const { userInput, questionIndex, context, conversationHistory } = await request.json()

    if (!process.env.GEMINI_API_KEY) {
      // More professional fallback responses that probe for details
      const fallbackResponses = [
        "I'd like to dig deeper into that. Can you walk me through a specific example with concrete details about the situation and your role?",
        "That's a good start, but I need more specifics. What exact challenges did you face and how did you measure your success?",
        "I appreciate that overview. Now let's get into the details - what was your specific contribution and what were the measurable outcomes?",
        "That gives me a general sense, but I'd like to understand your process better. Can you break down your approach step by step?",
        "Thanks for sharing that. To better assess your experience, I need to understand the scope and impact - can you provide specific metrics or results?"
      ]
      
      const randomResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)]
      
      return NextResponse.json({ 
        response: randomResponse,
        nextQuestion: null
      })
    }

    const genAI = getGeminiAI()
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const interviewQuestions = [
      "Tell me about yourself and your professional background.",
      "What interests you most about this role?", 
      "Describe a challenging project you've worked on recently.",
      "How do you handle working under pressure?",
      "Where do you see yourself in 5 years?"
    ]

    const currentQuestion = interviewQuestions[questionIndex] || interviewQuestions[0]
    const conversationContext = conversationHistory ? conversationHistory.slice(-3).join('\n') : ''

    const prompt = `
You are Sarah, a senior hiring manager with 10+ years of experience conducting professional interviews. You're skilled at evaluating candidates and asking probing questions to assess their qualifications.

Current question: "${currentQuestion}"
Candidate's response: "${userInput}"

Recent conversation context:
${conversationContext}

Your professional interviewing style:
- You're warm but thorough - you dig deeper when responses are vague or incomplete
- You ask specific follow-up questions to get concrete examples and details
- You don't accept surface-level answers - you probe for specifics, metrics, challenges faced, and outcomes
- You maintain professional standards and expect substantive responses
- You guide candidates to provide STAR format answers (Situation, Task, Action, Result)
- You're encouraging but hold candidates accountable for providing meaningful responses

Response quality assessment:
- If the response is vague, generic, or lacks specifics: Ask pointed follow-up questions for concrete examples
- If the response is too brief: Request more detail about their process, challenges, or results
- If the response is off-topic: Gently redirect back to the question with clarification
- If the response is strong: Acknowledge it and ask a relevant follow-up or move forward

Guidelines:
1. Evaluate the quality and depth of their response
2. If response is weak/vague: Professionally challenge them for specifics with phrases like "Can you walk me through a specific example?" or "I'd like to understand the details of how you approached that"
3. If response is good: Acknowledge it and probe one level deeper or ask about challenges/learnings
4. Keep responses to 2-3 sentences maximum
5. Use natural speech patterns and contractions
6. Be direct but supportive in requesting more detail

Respond as Sarah the experienced interviewer:
`

    const result = await model.generateContent(prompt)
    const response = result.response.text()

    return NextResponse.json({ 
      response,
      nextQuestion: questionIndex < interviewQuestions.length - 1 ? interviewQuestions[questionIndex + 1] : null,
      interviewer: "Sarah"
    })

  } catch (error) {
    console.error('Error generating AI response:', error)
    
    // More professional fallback responses that probe for details
    const fallbackResponses = [
      "I'd like to dig deeper into that. Can you walk me through a specific example with concrete details about the situation and your role?",
      "That's a good start, but I need more specifics. What exact challenges did you face and how did you measure your success?", 
      "I appreciate that overview. Now let's get into the details - what was your specific contribution and what were the measurable outcomes?",
      "That gives me a general sense, but I'd like to understand your process better. Can you break down your approach step by step?",
      "Thanks for sharing that. To better assess your experience, I need to understand the scope and impact - can you provide specific metrics or results?"
    ]
    
    const randomResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)]
    
    return NextResponse.json({ 
      response: randomResponse,
      nextQuestion: null,
      interviewer: "Sarah"
    })
  }
}
