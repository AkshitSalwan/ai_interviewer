'use client'

import React, { useState, useEffect, useRef } from 'react'
import InterviewTimer from './InterviewTimer'
import EndInterviewModal from './EndInterviewModal'
import EmotionAnalysis from './EmotionAnalysis'
import { Mic, MicOff, Camera, CameraOff, Phone, MessageCircle } from 'lucide-react'
import { faceProcessor, EmotionData } from '../lib/faceProcessor'
import { transcriptionService, TranscriptionData } from '../lib/transcriptionService'

interface InterviewState {
  isRecording: boolean
  transcription: string
  emotions: any[]
  duration: number
  aiResponse: string
  isAiSpeaking: boolean
  currentScore: number
  lastScoreUpdate: number
  userInput: string // Add user input field
}

export default function InterviewRoom() {
  const [interviewState, setInterviewState] = useState<InterviewState>({
    isRecording: false,
    transcription: '',
    emotions: [],
    duration: 0,
    aiResponse: '',
    isAiSpeaking: false,
    currentScore: 0,
    lastScoreUpdate: 0,
    userInput: ''
  })
  
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [showEndModal, setShowEndModal] = useState(false)
  const [interviewQuestions] = useState([
    "Tell me about yourself and your professional background.",
    "What interests you most about this role?",
    "Describe a challenging project you've worked on recently.",
    "How do you handle working under pressure?",
    "Where do you see yourself in 5 years?"
  ])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [conversationHistory, setConversationHistory] = useState<string[]>([])
  
  const videoContainerRef = useRef<HTMLDivElement>(null)
  const zegoRef = useRef<any>(null)

  // Initialize Video
  useEffect(() => {
    const initializeVideo = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        })
        
        if (videoContainerRef.current) {
          // Clear any existing content
          videoContainerRef.current.innerHTML = ''
          
          const videoElement = document.createElement('video')
          videoElement.srcObject = stream
          videoElement.autoplay = true
          videoElement.muted = true
          videoElement.playsInline = true
          videoElement.style.width = '100%'
          videoElement.style.height = '100%'
          videoElement.style.objectFit = 'cover'
          videoElement.style.borderRadius = '8px'
          
          videoContainerRef.current.appendChild(videoElement)
          
          // Store stream reference for cleanup
          zegoRef.current = { stream, video: videoElement }
        }
        
      } catch (error) {
        console.error('Error accessing camera:', error)
        // Show error message in video container
        if (videoContainerRef.current) {
          videoContainerRef.current.innerHTML = `
            <div class="flex items-center justify-center h-full bg-gray-800 text-white">
              <div class="text-center">
                <p class="text-lg mb-2">Camera access required</p>
                <p class="text-sm text-gray-300">Please allow camera and microphone permissions</p>
              </div>
            </div>
          `
        }
      }
    }

    initializeVideo()

    return () => {
      // Cleanup video stream
      if (zegoRef.current?.stream) {
        zegoRef.current.stream.getTracks().forEach((track: MediaStreamTrack) => track.stop())
      }
      
      // Cleanup real-time services
      transcriptionService.stopTranscription()
      faceProcessor.stopEmotionDetection()
    }
  }, [])

  // Update real-time AI score periodically
  useEffect(() => {
    if (interviewState.isRecording) {
      const updateScore = async () => {
        const now = Date.now()
        // Update score more frequently and with lower thresholds
        if (now - interviewState.lastScoreUpdate > 15000 && 
            (interviewState.transcription.length > 20 || interviewState.emotions.length > 2)) {
          
          console.log('Updating AI score...', {
            transcriptionLength: interviewState.transcription.length,
            emotionsCount: interviewState.emotions.length,
            duration: interviewState.duration
          })
          
          try {
            const response = await fetch('/api/score-interview', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                transcription: interviewState.transcription,
                emotions: interviewState.emotions,
                duration: interviewState.duration
              }),
            })
            
            if (response.ok) {
              const result = await response.json()
              console.log('AI Score updated:', result.overallScore)
              setInterviewState(prev => ({
                ...prev,
                currentScore: result.overallScore,
                lastScoreUpdate: now
              }))
            } else {
              console.error('Score API error:', response.status)
              // Use fallback scoring
              const basicScore = calculateBasicScore(interviewState.transcription, interviewState.emotions, interviewState.duration)
              setInterviewState(prev => ({
                ...prev,
                currentScore: basicScore,
                lastScoreUpdate: now
              }))
            }
          } catch (error) {
            console.error('Error updating real-time score:', error)
            // Calculate a basic real-time score as fallback
            const basicScore = calculateBasicScore(interviewState.transcription, interviewState.emotions, interviewState.duration)
            setInterviewState(prev => ({
              ...prev,
              currentScore: basicScore,
              lastScoreUpdate: now
            }))
          }
        }
      }

      const interval = setInterval(updateScore, 5000) // Check every 5 seconds
      return () => clearInterval(interval)
    }
  }, [interviewState.isRecording, interviewState.transcription, interviewState.emotions, interviewState.duration, interviewState.lastScoreUpdate])

  const calculateBasicScore = (transcription: string, emotions: any[], duration: number): number => {
    const wordCount = transcription.split(' ').length
    const avgEmotion = emotions.length > 0 
      ? emotions.reduce((sum, e) => sum + e.score, 0) / emotions.length 
      : 0.5
    
    const communicationScore = Math.min(wordCount / 50, 1) * 40 // Lower threshold
    const emotionScore = avgEmotion * 35
    const durationScore = Math.min(duration / 180, 1) * 25 // Lower threshold
    
    const score = Math.round(communicationScore + emotionScore + durationScore)
    console.log('Basic score calculated:', score, { wordCount, avgEmotion, duration })
    return score
  }

  // Timer for interview duration
  useEffect(() => {
    let interval: NodeJS.Timeout
    
    if (interviewState.isRecording) {
      interval = setInterval(() => {
        setInterviewState(prev => ({
          ...prev,
          duration: prev.duration + 1
        }))
      }, 1000)
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [interviewState.isRecording])

  // Start interview recording and transcription
  useEffect(() => {
    if (interviewState.isRecording) {
      transcriptionService.startTranscription((data: TranscriptionData) => {
        if (data.transcript && data.transcript.length > 0) {
          console.log('New transcription received:', data.transcript)
          setInterviewState(prev => ({
            ...prev,
            transcription: prev.transcription + (prev.transcription ? ' ' : '') + data.transcript
          }))
          
          // Trigger immediate score update when new transcription is received
          setTimeout(() => {
            updateScoreImmediately()
          }, 1000)
        }
      })
      startEmotionAnalysis()
    } else {
      transcriptionService.stopTranscription()
      faceProcessor.stopEmotionDetection()
    }
  }, [interviewState.isRecording])

  const updateScoreImmediately = async () => {
    const now = Date.now()
    if (now - interviewState.lastScoreUpdate > 5000) { // Minimum 5 seconds between updates
      console.log('Immediate score update triggered...')
      console.log('Current state:', {
        transcription: interviewState.transcription,
        emotionsCount: interviewState.emotions.length,
        duration: interviewState.duration
      })
      
      try {
        const response = await fetch('/api/score-interview', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            transcription: interviewState.transcription,
            emotions: interviewState.emotions,
            duration: interviewState.duration
          }),
        })
        
        if (response.ok) {
          const result = await response.json()
          console.log('Full scoring API response:', result)
          console.log('Immediate AI Score updated:', result.overallScore)
          setInterviewState(prev => ({
            ...prev,
            currentScore: result.overallScore || 0,
            lastScoreUpdate: now
          }))
        } else {
          console.error('Immediate score API error:', response.status)
          const errorText = await response.text()
          console.error('Error details:', errorText)
          const basicScore = calculateBasicScore(interviewState.transcription, interviewState.emotions, interviewState.duration)
          setInterviewState(prev => ({
            ...prev,
            currentScore: basicScore,
            lastScoreUpdate: now
          }))
        }
      } catch (error) {
        console.error('Error in immediate score update:', error)
        const basicScore = calculateBasicScore(interviewState.transcription, interviewState.emotions, interviewState.duration)
        setInterviewState(prev => ({
          ...prev,
          currentScore: basicScore,
          lastScoreUpdate: now
        }))
      }
    }
  }

  const startEmotionAnalysis = async () => {
    try {
      console.log('Initializing real-time emotion detection...')
      
      const success = await faceProcessor.startEmotionDetection((emotion: EmotionData) => {
        console.log('New emotion detected:', emotion.emotion, emotion.score)
        setInterviewState(prev => ({
          ...prev,
          emotions: [...prev.emotions, emotion]
        }))
        
        // Trigger immediate score update when new emotion is detected
        setTimeout(() => {
          updateScoreImmediately()
        }, 500)
      })
      
      if (success) {
        console.log('Real-time emotion detection started successfully')
      } else {
        console.log('Using fallback emotion detection mode')
      }
      
    } catch (error) {
      console.error('Error starting emotion analysis:', error)
      setInterviewState(prev => ({
        ...prev,
        emotions: []
      }))
    }
  }

  const generateAIResponse = async (userInput: string) => {
    try {
      console.log('Generating AI response for:', userInput)
      
      // Prevent multiple simultaneous AI responses
      if (interviewState.isAiSpeaking) {
        console.log('AI is already speaking, skipping response generation')
        return
      }
      
      setInterviewState(prev => ({ ...prev, isAiSpeaking: true }))
      
      // Call Gemini AI API with conversation context
      const response = await fetch('/api/ai-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userInput,
          questionIndex: currentQuestionIndex,
          context: 'video interview',
          conversationHistory: conversationHistory
        }),
      })
      
      console.log('AI API response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('AI response data:', data)
        
        const aiText = data.response || data.message || 'AI response received'
        
        // Update conversation history
        setConversationHistory(prev => [
          ...prev,
          `Candidate: ${userInput}`,
          `Sarah: ${aiText}`
        ])
        
        setInterviewState(prev => ({
          ...prev,
          aiResponse: aiText,
          isAiSpeaking: false
        }))
        
        // Convert AI response to speech with better voice
        await speakAIResponse(aiText)
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('AI API error:', response.status, errorData)
        throw new Error(`AI API responded with ${response.status}`)
      }
      
    } catch (error) {
      console.error('Error generating AI response:', error)
      
      // More professional fallback responses that probe for details
      const fallbackResponses = [
        "I'd like to dig deeper into that. Can you walk me through a specific example of how you handled that situation?",
        "That's a good start, but I need more specifics. What exact challenges did you face and how did you overcome them?",
        "I appreciate that overview, but I'd like to understand your approach better. Can you break down your process step by step?",
        "Thanks for sharing that. To better assess your experience, can you provide specific metrics or concrete examples of your impact?"
      ]
      
      const fallbackResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)]
      
      setInterviewState(prev => ({
        ...prev,
        aiResponse: fallbackResponse,
        isAiSpeaking: false
      }))
      
      // Still try to speak the fallback response
      await speakAIResponse(fallbackResponse)
    }
  }

  const speakAIResponse = async (text: string) => {
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      })
      
      if (response.ok) {
        const contentType = response.headers.get('content-type')
        
        // Check if we got actual audio or JSON response
        if (contentType?.includes('application/json')) {
          const data = await response.json()
          
          // Use browser speech synthesis as fallback
          if (data.fallback && 'speechSynthesis' in window) {
            const speakText = () => {
              const utterance = new SpeechSynthesisUtterance(text)
              
              // Enhanced voice settings for more natural speech
              utterance.rate = 0.85  // Slightly slower for better comprehension
              utterance.pitch = 1.1  // Slightly higher pitch for friendliness
              utterance.volume = 0.9
              
              // Try to find the best available female voice
              const voices = speechSynthesis.getVoices()
              
              // Priority order for voice selection (more natural sounding)
              const preferredVoices = [
                'Alex', 'Samantha', 'Victoria', 'Karen', 'Susan', 'Moira',
                'Tessa', 'Monica', 'Paulina', 'Salli', 'Joanna', 'Kimberly',
                'Amy', 'Emma', 'Brian', 'Arthur'
              ]
              
              let selectedVoice = null
              
              // First, try to find a high-quality English voice
              for (const preferred of preferredVoices) {
                selectedVoice = voices.find(voice => 
                  voice.name.toLowerCase().includes(preferred.toLowerCase()) &&
                  (voice.lang.startsWith('en-') || voice.lang === 'en')
                )
                if (selectedVoice) break
              }
              
              // Fallback: find any English female voice
              if (!selectedVoice) {
                selectedVoice = voices.find(voice => 
                  (voice.lang.startsWith('en-') || voice.lang === 'en') &&
                  (voice.name.toLowerCase().includes('female') || 
                   voice.name.toLowerCase().includes('woman'))
                )
              }
              
              // Final fallback: any English voice
              if (!selectedVoice) {
                selectedVoice = voices.find(voice => 
                  voice.lang.startsWith('en-') || voice.lang === 'en'
                )
              }
              
              if (selectedVoice) {
                utterance.voice = selectedVoice
                console.log('Using voice:', selectedVoice.name, selectedVoice.lang)
              }
              
              // Use the original text without SSML tags (browser TTS doesn't support SSML)
              utterance.text = text
              
              utterance.onstart = () => {
                console.log('Sarah is speaking:', text.substring(0, 50) + '...')
              }
              
              utterance.onend = () => {
                console.log('Sarah finished speaking')
              }
              
              speechSynthesis.speak(utterance)
              console.log('Using enhanced browser speech synthesis for Sarah')
            }
            
            // Ensure voices are loaded
            if (speechSynthesis.getVoices().length === 0) {
              speechSynthesis.addEventListener('voiceschanged', speakText, { once: true })
            } else {
              speakText()
            }
          } else {
            console.log('TTS not available:', data.message || 'Speech synthesis not supported')
          }
        } else if (contentType?.includes('audio')) {
          const audioBlob = await response.blob()
          
          // Check if we actually got audio content
          if (audioBlob.size > 0) {
            const audioUrl = URL.createObjectURL(audioBlob)
            const audio = new Audio(audioUrl)
            
            audio.onloadeddata = () => {
              audio.play().catch(error => {
                console.log('Audio play failed:', error)
                // Fallback: show text
                setInterviewState(prev => ({
                  ...prev,
                  aiResponse: `🔊 AI would say: "${text}"`
                }))
              })
            }
            
            audio.onended = () => {
              URL.revokeObjectURL(audioUrl)
              // Move to next question after AI finishes speaking
              if (currentQuestionIndex < interviewQuestions.length - 1) {
                setTimeout(() => {
                  setCurrentQuestionIndex(prev => prev + 1)
                }, 2000)
              }
            }
            
            audio.onerror = () => {
              console.log('Audio playback error')
              URL.revokeObjectURL(audioUrl)
              // Show text fallback
              setInterviewState(prev => ({
                ...prev,
                aiResponse: `🔊 AI would say: "${text}"`
              }))
            }
          } else {
            // Empty audio, show text instead
            setInterviewState(prev => ({
              ...prev,
              aiResponse: `🔊 AI would say: "${text}"`
            }))
          }
        }
      } else {
        throw new Error(`TTS API responded with ${response.status}`)
      }
      
    } catch (error) {
      console.error('Error with text-to-speech:', error)
      // Fallback: display text instead of audio
      setInterviewState(prev => ({
        ...prev,
        aiResponse: `🔊 AI would say: "${text}"`
      }))
      
      // Still move to next question
      if (currentQuestionIndex < interviewQuestions.length - 1) {
        setTimeout(() => {
          setCurrentQuestionIndex(prev => prev + 1)
        }, 3000)
      }
    }
  }

  const toggleMute = () => {
    if (zegoRef.current?.stream) {
      const audioTrack = zegoRef.current.stream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setIsMuted(!audioTrack.enabled)
      }
    }
  }

  const toggleVideo = () => {
    if (zegoRef.current?.stream) {
      const videoTrack = zegoRef.current.stream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        setIsVideoOff(!videoTrack.enabled)
      }
    }
  }

  const endInterview = () => {
    setShowEndModal(true)
    setInterviewState(prev => ({ ...prev, isRecording: false }))
    
    // Stop real-time services
    transcriptionService.stopTranscription()
    faceProcessor.stopEmotionDetection()
  }

  const startInterview = () => {
    const greeting = "Hi there! I'm Sarah, and I'll be conducting your interview today. I'm really excited to get to know you better! Let's start with the first question."
    const firstQuestion = interviewQuestions[0]
    const fullIntro = `${greeting} ${firstQuestion}`
    
    setInterviewState(prev => ({ 
      ...prev, 
      isRecording: true,
      aiResponse: fullIntro
    }))
    
    // Speak the introduction
    setTimeout(() => {
      speakAIResponse(fullIntro)
    }, 1000)
  }

  const handleSendResponse = () => {
    if (interviewState.userInput.trim()) {
      const userResponse = interviewState.userInput.trim()
      
      // Add user input to transcription
      setInterviewState(prev => ({
        ...prev,
        transcription: prev.transcription + (prev.transcription ? ' ' : '') + userResponse,
        userInput: ''
      }))
      
      // Generate AI response after a brief delay using the stored response
      setTimeout(() => {
        generateAIResponse(userResponse)
      }, 1000)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="flex flex-col h-screen">
        {/* Header */}
        <div className="bg-gray-800 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold">AI Video Interview</h1>
            <InterviewTimer 
              duration={interviewState.duration}
              isRecording={interviewState.isRecording}
            />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-300">
              Live Interview Session
            </span>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex">
          {/* Video Section */}
          <div className="flex-1 relative">
            <div 
              ref={videoContainerRef}
              className="w-full h-full bg-gray-800"
            />
            
            {/* AI Avatar/Status */}
            <div className="absolute top-4 right-4 bg-black bg-opacity-50 rounded-lg p-4 max-w-md">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                <span className="text-sm font-medium">AI Interviewer</span>
              </div>
              {interviewState.isAiSpeaking ? (
                <div className="flex items-center space-x-2 text-blue-400">
                  <div className="animate-spin w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full"></div>
                  <MessageCircle className="h-4 w-4" />
                  <span className="text-sm">Sarah is responding...</span>
                </div>
              ) : interviewState.isRecording ? (
                <div className="flex items-center space-x-2 text-green-400">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm">Listening for your voice...</span>
                </div>
              ) : (
                <div className="text-sm text-gray-300">
                  Click "Start Interview" to begin
                </div>
              )}
            </div>

            {/* Current Question Display */}
            <div className="absolute bottom-20 left-4 right-4 bg-black bg-opacity-75 rounded-lg p-4">
              <h3 className="text-lg font-medium mb-2">Current Question:</h3>
              <p className="text-gray-300">{interviewQuestions[currentQuestionIndex]}</p>
            </div>

            {/* Controls */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4">
              <button
                onClick={toggleMute}
                className={`p-3 rounded-full ${isMuted ? 'bg-red-600' : 'bg-gray-600'} hover:bg-opacity-80`}
              >
                {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              </button>
              <button
                onClick={toggleVideo}
                className={`p-3 rounded-full ${isVideoOff ? 'bg-red-600' : 'bg-gray-600'} hover:bg-opacity-80`}
              >
                {isVideoOff ? <CameraOff className="h-6 w-6" /> : <Camera className="h-6 w-6" />}
              </button>
              {!interviewState.isRecording ? (
                <button
                  onClick={startInterview}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-full font-medium"
                >
                  Start Interview
                </button>
              ) : (
                <button
                  onClick={endInterview}
                  className="p-3 rounded-full bg-red-600 hover:bg-red-700"
                >
                  <Phone className="h-6 w-6" />
                </button>
              )}
            </div>
          </div>

          {/* Side Panel */}
          <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
            {/* Transcription */}
            <div className="p-4 border-b border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Live Transcription</h3>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${interviewState.isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`}></div>
                  <span className="text-xs text-gray-400">
                    {interviewState.isRecording ? 'Live' : 'Stopped'}
                  </span>
                </div>
              </div>
              <div className="bg-gray-900 rounded p-3 h-32 overflow-y-auto text-sm">
                {interviewState.transcription || (
                  interviewState.isRecording 
                    ? 'Speak naturally - your voice will be transcribed here...' 
                    : 'Transcription will appear here when you start the interview...'
                )}
              </div>
            </div>

            {/* Emotion Analysis */}
            <div className="p-4 border-b border-gray-700">
              <EmotionAnalysis 
                emotions={interviewState.emotions || []} 
                currentScore={interviewState.currentScore}
                isInterviewActive={interviewState.isRecording}
              />
            </div>

            {/* AI Response */}
            <div className="p-4 flex-1">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold">Sarah (AI Interviewer)</h3>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                </div>
                {interviewState.isAiSpeaking && (
                  <div className="flex items-center space-x-2 text-sm text-blue-400">
                    <div className="animate-pulse">🗣️</div>
                    <span>Sarah is thinking...</span>
                  </div>
                )}
              </div>
              <div className="bg-gray-900 rounded p-3 h-full overflow-y-auto text-sm mb-4">
                {interviewState.aiResponse || 'Hi! I\'m Sarah, your AI interviewer. Click "Start Interview" to begin our conversation!'}
              </div>
              
              {/* Manual Input for Testing */}
              {interviewState.isRecording && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400">
                       Voice input enabled - speak naturally or type below
                    </p>
                    <div className="flex items-center space-x-2 text-xs">
                      <div className={`w-2 h-2 rounded-full ${interviewState.isRecording ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`}></div>
                      <span className="text-gray-400">
                        {interviewState.isRecording ? 'Listening...' : 'Not recording'}
                      </span>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={interviewState.userInput}
                    onChange={(e) => setInterviewState(prev => ({...prev, userInput: e.target.value}))}
                    placeholder="Type your response here (or speak naturally)..."
                    className="w-full px-3 py-2 bg-gray-700 text-white rounded text-sm border border-gray-600 focus:border-blue-500 focus:outline-none"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendResponse()
                      }
                    }}
                  />
                  <button
                    onClick={handleSendResponse}
                    disabled={!interviewState.userInput.trim() || interviewState.isAiSpeaking}
                    className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors"
                  >
                    {interviewState.isAiSpeaking ? 'AI Processing...' : 'Send Response'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* End Interview Modal */}
      {showEndModal && (
        <EndInterviewModal
          onClose={() => setShowEndModal(false)}
          interviewData={{
            duration: interviewState.duration,
            transcription: interviewState.transcription,
            emotions: interviewState.emotions || []
          }}
        />
      )}
    </div>
  )
}
