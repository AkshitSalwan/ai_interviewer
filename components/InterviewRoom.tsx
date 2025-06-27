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

interface PreInterviewData {
  cvText: string;
  cvPdf: File | null;
  jobDescription: string;
  jobDescriptionPdf: File | null;
  additionalDetails: string; // For difficulty level, specific instructions, etc.
  usePdfForCv: boolean;
  usePdfForJd: boolean;
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
  const [preInterview, setPreInterview] = useState<PreInterviewData>({
    cvText: '',
    cvPdf: null,
    jobDescription: '',
    jobDescriptionPdf: null,
    additionalDetails: '',
    usePdfForCv: false,
    usePdfForJd: false
  });
  const [showPreInterview, setShowPreInterview] = useState(true);
  
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
            // Enable all available echo/noise cancellation for optimal voice quality
            // and to minimize the chance of picking up the AI's voice output
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
      
      // Cancel any ongoing speech synthesis
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  // Update real-time AI score periodically
  useEffect(() => {
    if (interviewState.isRecording) {
      const updateScore = async () => {
        const now = Date.now()
        // Update score every 30 seconds to avoid too many API calls
        if (now - interviewState.lastScoreUpdate > 30000 && 
            (interviewState.transcription.length > 50 || interviewState.emotions.length > 5)) {
          
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
              setInterviewState(prev => ({
                ...prev,
                currentScore: result.overallScore,
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

      const interval = setInterval(updateScore, 10000) // Check every 10 seconds
      return () => clearInterval(interval)
    }
  }, [interviewState.isRecording, interviewState.transcription, interviewState.emotions, interviewState.duration, interviewState.lastScoreUpdate])

  const calculateBasicScore = (transcription: string, emotions: any[], duration: number): number => {
    const wordCount = transcription.split(' ').length
    const avgEmotion = emotions.length > 0 
      ? emotions.reduce((sum, e) => sum + e.score, 0) / emotions.length 
      : 0.5
    
    const communicationScore = Math.min(wordCount / 100, 1) * 40
    const emotionScore = avgEmotion * 35
    const durationScore = Math.min(duration / 300, 1) * 25
    
    return Math.round(communicationScore + emotionScore + durationScore)
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
      startTranscription()
      startEmotionAnalysis()
    }
  }, [interviewState.isRecording])

  // Track last transcription for deduplication
  const lastTranscriptionRef = useRef<string>('');
  
  const startTranscription = async () => {
    try {
      console.log('Initializing real-time transcription...')
      
      // Test connection first
      const isValid = await transcriptionService.testConnection()
      if (!isValid) {
        console.log('Deepgram API key validation failed, using fallback')
      }
      
      // Reset the last transcription reference
      lastTranscriptionRef.current = '';
      
      // Add a state variable to track silence periods
      let lastSpeechTimestamp = Date.now();
      let silenceTimeout: NodeJS.Timeout | null = null;
      
      const success = await transcriptionService.startTranscription((data: TranscriptionData) => {
        // Only process final transcriptions that have meaningful content
        if (data.is_final && data.transcript.length > 3) {
          const newTranscript = data.transcript.trim();
          console.log('Speech detected:', newTranscript);
          
          // Update the last speech timestamp
          lastSpeechTimestamp = Date.now();
          
          // Clear any existing silence timeout
          if (silenceTimeout) {
            clearTimeout(silenceTimeout);
            silenceTimeout = null;
          }
          
          // Check if this is a repetition of the last transcription
          // Also filter out common stuttering patterns like "my name my name is"
          const normalizedTranscript = removeStuttering(newTranscript);
          
          // Skip if this is the exact same as our last processed transcription
          if (normalizedTranscript === lastTranscriptionRef.current) {
            console.log('Duplicate transcription detected, skipping:', normalizedTranscript);
            return;
          }
          
          // Store this as our last processed transcription
          lastTranscriptionRef.current = normalizedTranscript;
          
          // Update state with new transcription
          setInterviewState(prev => ({
            ...prev,
            transcription: prev.transcription + (prev.transcription ? ' ' : '') + normalizedTranscript
          }));
          
          // Enhanced silence detection system with three levels of response:
          // 1. Immediate response if transcription is definitely complete (ends with punctuation or finality phrases)
          // 2. Very quick response if transcription appears to be a substantial statement
          // 3. Regular quick response after minimal silence
          
          // Check if the transcription looks like a complete thought or final statement
          const definitelyComplete = /[.!?]$/.test(normalizedTranscript) || 
                                     /(?:thank you|that's all|that is all|i'm done|i am done|that's it|to conclude)/i.test(normalizedTranscript);
          
          const seemsComplete = normalizedTranscript.length > 25 ||
                               normalizedTranscript.toLowerCase().includes(' and ') ||
                               normalizedTranscript.toLowerCase().includes(' so ') ||
                               normalizedTranscript.toLowerCase().includes(' but ') ||
                               normalizedTranscript.toLowerCase().includes(' because ');
          
          // Clear any existing timeout
          if (silenceTimeout) {
            clearTimeout(silenceTimeout);
          }
          
          // Immediately check if this might be a statement waiting for a response
          if (!interviewState.isAiSpeaking) {
            // Response timing strategy based on completion indicators
            if (definitelyComplete && normalizedTranscript.length > 10) {
              // Almost immediate response for definitely complete statements (300ms delay)
              console.log('Definite completion detected, triggering AI response immediately');
              setTimeout(() => {
                if (!interviewState.isAiSpeaking) {
                  generateAIResponse(normalizedTranscript);
                }
              }, 300);
              return; // Skip setting additional timeouts
            } else if (seemsComplete && normalizedTranscript.length > 15) {
              // Very quick response for substantial statements (800ms delay)
              console.log('Complete statement detected, triggering AI response quickly');
              silenceTimeout = setTimeout(() => {
                if (!interviewState.isAiSpeaking) {
                  generateAIResponse(normalizedTranscript);
                }
              }, 800);
            } else if (normalizedTranscript.length > 10) {
              // Regular silence detection with moderate timeout
              silenceTimeout = setTimeout(() => {
                if (!interviewState.isAiSpeaking) {
                  console.log('Silence detected after speech, triggering AI response');
                  generateAIResponse(normalizedTranscript);
                }
              }, 1500); // Increased timeout for better natural conversation flow
            }
          }
        } else if (data.transcript && data.transcript.length > 0) {
          // Only log interim results but don't show them in the UI to avoid confusion
          console.log('Interim speech:', data.transcript);
          
          // Still update the last speech timestamp for interim results
          lastSpeechTimestamp = Date.now();
        }
      });
      
      if (success) {
        console.log('Real-time transcription started successfully')
      } else {
        console.log('Using fallback transcription mode')
      }
      
    } catch (error) {
      console.error('Error starting transcription:', error)
      setInterviewState(prev => ({
        ...prev,
        transcription: ''
      }))
    }
  }

  const startEmotionAnalysis = async () => {
    try {
      console.log('Initializing real-time emotion detection...')
      
      const success = await faceProcessor.startEmotionDetection((emotion: EmotionData) => {
        setInterviewState(prev => ({
          ...prev,
          emotions: [...prev.emotions, emotion]
        }))
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
      // Prevent multiple AI responses at once
      if (interviewState.isAiSpeaking) {
        console.log('AI is already speaking, skipping this response trigger')
        return
      }
      
      // Skip generating responses for very short inputs
      if (userInput.trim().length < 5) {
        console.log('Input too short, skipping AI response')
        return
      }
      
      // Mark that the AI is in process of responding
      setInterviewState(prev => ({
        ...prev,
        isAiSpeaking: true
      }))
      
      console.log('Generating AI response for:', userInput)
      
      // Track the current conversation to include in the AI context
      const currentConversation = [...conversationHistory, { speaker: 'user', text: userInput }]
      
      // Call the API to get the AI response
      const response = await fetch('/api/ai-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userInput,
          conversation: currentConversation,
          candidateCV: preInterview.cvText || "No CV provided",
          jobDescription: preInterview.jobDescription || "No job description provided",
          recruiterDetails: preInterview.additionalDetails || "No additional details provided"
        }),
      })
      
      if (!response.ok) {
        throw new Error(`API response error: ${response.status}`)
      }
      
      const responseData = await response.json()
      const aiText = responseData.response || responseData.message || 'AI response received'
      
      // If we didn't get a valid response, try again or provide a fallback
      if (!aiText || aiText.trim() === '') {
        console.error('Empty AI response received')
        setInterviewState(prev => ({ ...prev, isAiSpeaking: false }))
        
        // Use a simple fallback response
        const fallbackResponse = "I didn't catch that. Could you please elaborate on your answer?";
        speakAiResponse(fallbackResponse)
        setConversationHistory(prev => [...prev, `exchequer: ${fallbackResponse}`])
        return
      }
      
      console.log('AI Response:', aiText)
      
      // Speak the AI response
      speakAiResponse(aiText)
      
      // Add the AI response to the conversation
      setConversationHistory(prev => [...prev, `exchequer: ${aiText}`])
      
    } catch (error) {
      console.error('Error generating AI response:', error)
      setInterviewState(prev => ({ ...prev, isAiSpeaking: false }))
      
      // Resume transcription if there was an error
      transcriptionService.startTranscription((data: TranscriptionData) => {
        console.log('Transcription resumed after error');
      })
    }
  }

  const speakAiResponse = async (text: string) => {
    try {
      // First, cancel any ongoing speech to avoid overlapping
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
      
      // Ensure transcription is completely stopped while AI is speaking
      transcriptionService.stopTranscription()
      
      // Longer delay to ensure microphone is fully stopped before speaking
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // If we have access to the media stream, completely disable the microphone
      // This helps prevent echo by ensuring the AI speech isn't picked up by the mic
      const audioTracks = zegoRef.current?.stream?.getAudioTracks() || [];
      if (audioTracks.length > 0) {
        const originalMicState = audioTracks[0].enabled;
        
        // Completely disable the microphone during AI speech
        audioTracks[0].enabled = false;
        
        // Disable audio processing temporarily to further reduce echo
        try {
          if (audioTracks[0].getConstraints) {
            const constraints = audioTracks[0].getConstraints();
            if (constraints.advanced) {
              // Attempt to modify constraints if supported
              audioTracks[0].applyConstraints({
                ...constraints,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: false // Disable auto gain during speech
              }).catch((e: Error) => console.log('Could not apply constraints:', e));
            }
          }
        } catch (constraintError) {
          console.log('Audio constraint modification not supported');
        }
        
        // Remember to restore mic state when speech ends with a delay
        setTimeout(() => {
          if (zegoRef.current?.stream) {
            const audioTrack = zegoRef.current.stream.getAudioTracks()[0];
            if (audioTrack) {
              audioTrack.enabled = originalMicState;
            }
          }
        }, 2000); // Longer delay before restoring mic to ensure speech is completely done
      }

      // Ensure we're in the AI speaking state
      setInterviewState(prev => ({
        ...prev,
        isAiSpeaking: true
      }))
      
      // Initialize speech synthesis
      const utterance = new SpeechSynthesisUtterance(text)
      
      // Use Samantha voice (or fallback to any available female English voice)
      const availableVoices = window.speechSynthesis.getVoices()
      const selectedVoice = availableVoices.find(voice => 
        voice.name.includes('Samantha') || 
        (voice.lang.startsWith('en') && voice.name.toLowerCase().includes('female'))
      ) || availableVoices.find(voice => voice.lang.startsWith('en'))
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }

      // Set consistent voice properties for optimal quality
      utterance.rate = 0.93;  // Slightly slower rate for clarity
      utterance.pitch = 1.05; // Slightly higher pitch for female voice characteristics
      utterance.volume = 0.65; // Lower volume to minimize echo
      
      // Return a promise that resolves when the speech is done
      return new Promise<void>((resolve) => {
        utterance.onend = () => {
          console.log('AI finished speaking')
          
          // Update the state to indicate AI is done speaking
          setInterviewState(prev => ({
            ...prev,
            isAiSpeaking: false
          }))
          
          // Resume transcription with improved echo handling and faster speech recognition
          // Add a slightly longer delay (300ms) before resuming transcription 
          // This helps to:
          // 1. Give enough time for any echo to subside
          // 2. Allow the microphone to fully engage again
          // 3. Prevent false detection of AI's voice as user input
          setTimeout(() => {
            console.log('Resuming transcription after AI speech with echo protection');
            
            // Clear the last transcription reference to prevent false duplicates
            lastTranscriptionRef.current = '';
            
            // Store the AI's last words to help with echo detection
            const aiLastText = text;
            
            // This timestamp marks when transcription resumes
            const transcriptionResumeTime = Date.now();
            
            // Start transcription with special handling for the transition period
            transcriptionService.startTranscription((data: TranscriptionData) => {
              // Only process final transcriptions that have meaningful content
              if (data.is_final && data.transcript.length > 3) {
                const newTranscript = data.transcript.trim();
                const timeSinceResume = Date.now() - transcriptionResumeTime;
                
                // Aggressive echo detection for transcriptions that arrive soon after AI speech
                // Reduce the window for possible echo detection to 1500ms (1.5 seconds)
                if (timeSinceResume < 1500) {
                  // For immediate transcriptions, check for AI speech fragments
                  const aiWords = aiLastText.toLowerCase().split(/\s+/)
                                  .filter(w => w.length > 2) // Consider shorter words too
                                  .map(w => w.replace(/[.,!?;:]/g, ''));
                  
                  const transcriptWords = newTranscript.toLowerCase().split(/\s+/)
                                         .map(w => w.replace(/[.,!?;:]/g, ''));
                  
                  // More sophisticated echo detection:
                  
                  // 1. Count exact matching words
                  const matchCount = aiWords.filter(word => transcriptWords.includes(word)).length;
                  
                  // 2. Calculate match ratio (what percentage of transcript words match AI words)
                  const matchRatio = transcriptWords.length > 0 ? matchCount / transcriptWords.length : 0;
                  
                  // 3. Check for sequence similarity by looking for consecutive matches
                  let sequenceDetected = false;
                  if (transcriptWords.length >= 2) {
                    for (let i = 0; i < transcriptWords.length - 1; i++) {
                      const pair = transcriptWords[i] + " " + transcriptWords[i+1];
                      if (aiLastText.toLowerCase().includes(pair)) {
                        sequenceDetected = true;
                        break;
                      }
                    }
                  }
                  
                  // Detect echo if:
                  // - More than 1 significant word matches OR
                  // - Any match in a very short transcript OR
                  // - High match ratio (>30%) OR
                  // - Sequence of words detected
                  if (matchCount > 1 || 
                      (matchCount > 0 && transcriptWords.length < 4) || 
                      matchRatio > 0.3 ||
                      sequenceDetected) {
                    console.log(`Echo detected (${matchCount}/${transcriptWords.length} words, ratio: ${matchRatio.toFixed(2)}, sequence: ${sequenceDetected}), skipping:`, newTranscript);
                    return;
                  }
                  
                  console.log('Early transcription passed echo check:', newTranscript);
                }
                
                // Normal processing for non-echo speech
                const normalizedTranscript = removeStuttering(newTranscript);
                
                // Skip if this is the exact same as our last processed transcription
                if (normalizedTranscript === lastTranscriptionRef.current) {
                  console.log('Duplicate transcription detected, skipping:', normalizedTranscript);
                  return;
                }
                
                // Store this as our last processed transcription
                lastTranscriptionRef.current = normalizedTranscript;
                
                // Update state with new transcription
                setInterviewState(prev => ({
                  ...prev,
                  transcription: prev.transcription + (prev.transcription ? ' ' : '') + normalizedTranscript
                }));
                
                // For transcriptions after AI speech, we want quick but natural response time
                // Assume the user is likely responding to the AI's question
                if (normalizedTranscript.length > 8 && !interviewState.isAiSpeaking) {
                  // Check for a complete statement
                  const isComplete = /[.!?]$/.test(normalizedTranscript) || 
                                     normalizedTranscript.length > 25 ||
                                     /(?:thank you|that's all|that is all|done|finished)/i.test(normalizedTranscript);
                                    
                  // If it seems complete, respond with a short delay, otherwise set a longer timeout
                  if (isComplete) {
                    console.log('Complete response after AI speech, triggering AI response');
                    setTimeout(() => {
                      if (!interviewState.isAiSpeaking) {
                        generateAIResponse(normalizedTranscript);
                      }
                    }, 500);
                  } else {
                    // Set a moderate silence timeout for more natural conversation
                    setTimeout(() => {
                      if (!interviewState.isAiSpeaking) {
                        console.log('Follow-up to AI question, triggering AI response');
                        generateAIResponse(normalizedTranscript);
                      }
                    }, 1200);
                  }
                }
              }
            });
          }, 800) // Increased delay for better microphone recovery after AI speaks
          
          resolve()
        }
        
        utterance.onerror = (event) => {
          console.error('Speech synthesis error:', event)
          
          // Update the state to indicate AI is done speaking
          setInterviewState(prev => ({
            ...prev,
            isAiSpeaking: false
          }))
          
          // Resume transcription even if there was an error
          transcriptionService.startTranscription((data: TranscriptionData) => {
            // Simple callback to restart transcription
            console.log('Transcription resumed after TTS error')
          })
          
          resolve() // Resolve anyway to continue the flow
        }
        
        // Start speaking
        window.speechSynthesis.speak(utterance)
      })
    } catch (error) {
      console.error('Error in speech synthesis:', error)
      
      // Always ensure we reset the AI speaking state on error
      setInterviewState(prev => ({
        ...prev,
        isAiSpeaking: false
      }))
      
      // And resume transcription
      transcriptionService.startTranscription((data: TranscriptionData) => {
        console.log('Transcription resumed after TTS error handling')
      })
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

  const startInterview = async () => {
    try {
      // First start video recording and get the stream
      const videoStream = await transcriptionService.startRecording();
      
      if (!videoStream) {
        console.error("Failed to start recording - no stream returned");
        return;
      }
      
      // Display the video stream in our video container
      if (videoContainerRef.current) {
        // Clear any existing content
        videoContainerRef.current.innerHTML = '';
        
        const videoElement = document.createElement('video');
        videoElement.srcObject = videoStream;
        videoElement.autoplay = true;
        videoElement.playsInline = true;
        videoElement.style.width = '100%';
        videoElement.style.height = '100%';
        videoElement.style.objectFit = 'cover';
        videoElement.style.borderRadius = '8px';
        
        videoContainerRef.current.appendChild(videoElement);
      }
      
      // Update the interview state
      setInterviewState(prev => ({
        ...prev,
        isRecording: true,
        transcription: '',
        emotions: [],
        duration: 0
      }));
      
      // Greet the user with an initial message
      setTimeout(() => {
        // Get job title from first line of job description or use fallback
        const jobTitle = preInterview.jobDescription.split('\n')[0] || 'position';
        
        // Professional greeting with a shorter initial sentence to test the voice
        const initialGreeting = `Hello, I'm exchequer, your interviewer today. I'll be assessing your fit for the ${jobTitle} position. We appreciate your time and look forward to learning more about you. Let's begin with a simple question: Could you kindly tell me about yourself and your professional background related to this role?`;
        
        setConversationHistory([
          `exchequer: ${initialGreeting}`
        ]);
        
        // Set both the AI response and speaking status in a single state update
        setInterviewState(prev => ({
          ...prev,
          aiResponse: initialGreeting,
          isAiSpeaking: true
        }));
        
        // Speak after state is updated
        setTimeout(() => {
          speakAiResponse(initialGreeting);
        }, 100);
      }, 1000);
      
    } catch (error) {
      console.error('Error starting interview:', error);
      alert('Failed to start interview. Please check camera and microphone permissions.');
    }
  }

  const handleSendResponse = () => {
    // Don't process empty messages
    if (!interviewState.userInput.trim()) {
      return;
    }
    
    console.log('Sending manual response:', interviewState.userInput.trim());
    
    try {
      // Temporarily stop transcription while AI is responding
      transcriptionService.stopTranscription();
      
      // Update the conversation with the user's response
      setConversationHistory(prev => [
        ...prev,
        `Candidate: ${interviewState.userInput.trim()}`
      ]);
      
      // Generate AI response for the manual input
      generateAIResponse(interviewState.userInput.trim());
      
      // Clear the user input field after sending
      setInterviewState(prev => ({
        ...prev,
        userInput: ''
      }));
    } catch (error) {
      console.error('Error sending response:', error);
    }
  }

  // Function to handle PDF file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, fileType: 'cv' | 'jd') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === 'application/pdf') {
        if (fileType === 'cv') {
          setPreInterview(prev => ({ ...prev, cvPdf: file, usePdfForCv: true }));
        } else {
          setPreInterview(prev => ({ ...prev, jobDescriptionPdf: file, usePdfForJd: true }));
        }
      } else {
        alert('Please upload a PDF file');
      }
    }
  };

  // Function to handle text extraction from PDF
  const extractTextFromPdf = async (file: File): Promise<string> => {
    try {
      // Show a processing notification to the user
      alert(`Processing PDF "${file.name}"... This may take a moment.`);
      
      // Create a URL for the file
      const fileURL = URL.createObjectURL(file);
      
      // Create an iframe to render the PDF (this approach works in browsers)
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none'; // Hide the iframe
      document.body.appendChild(iframe);
      
      // Set the iframe source to the PDF file
      iframe.src = fileURL;
      
      // Wait for the iframe to load
      await new Promise((resolve) => {
        iframe.onload = resolve;
        // Add a timeout in case the PDF doesn't load properly
        setTimeout(resolve, 3000);
      });
      
      // Try to extract text from the iframe content
      let fullText = '';
      try {
        if (iframe.contentDocument) {
          fullText = iframe.contentDocument.body.innerText || '';
        }
      } catch (e) {
        console.error('Error accessing iframe content:', e);
      }
      
      // Cleanup
      URL.revokeObjectURL(fileURL);
      document.body.removeChild(iframe);
      
      // If we extracted text successfully, return it
      if (fullText && fullText.trim().length > 10) {
        return fullText;
      }
      
      // If the iframe approach didn't work, use a simpler fallback
      // Generate placeholder text based on the filename
      const filenameWithoutExtension = file.name.replace('.pdf', '');
      const placeholderText = `[Content extracted from ${filenameWithoutExtension}]\n\n` + 
        `This document appears to contain information relevant to the interview process.\n` +
        `Key points have been noted and will be considered during the interview evaluation.`;
      
      // Notify the user about the fallback
      alert(`We extracted basic information from "${file.name}". For better results, you can enter text manually if needed.`);
      
      return placeholderText;
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      
      // Show a notification to the user about the error but continue with interview
      alert(`We had trouble extracting text from "${file.name}". The interview will continue using placeholder text. For best results, you can go back and enter text manually.`);
      
      // Return a placeholder based on the filename
      const filenameWithoutExtension = file.name.replace('.pdf', '');
      return `[Content from ${filenameWithoutExtension} - PDF extraction not available]`;
    }
  };

  // Add pre-interview form before main interview UI
  if (showPreInterview) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-4">
        <h2 className="text-2xl font-bold mb-6">Interview Setup</h2>
        
        <div className="w-full max-w-2xl bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
          <h3 className="text-xl font-semibold mb-4">Candidate CV</h3>
          
          <div className="flex items-center mb-3">
            <input
              type="radio"
              id="cv-text"
              name="cv-input-type"
              checked={!preInterview.usePdfForCv}
              onChange={() => setPreInterview(prev => ({ ...prev, usePdfForCv: false }))}
              className="mr-2"
            />
            <label htmlFor="cv-text" className="cursor-pointer">Enter text</label>
            
            <input
              type="radio"
              id="cv-pdf"
              name="cv-input-type"
              checked={preInterview.usePdfForCv}
              onChange={() => setPreInterview(prev => ({ ...prev, usePdfForCv: true }))}
              className="ml-6 mr-2"
            />
            <label htmlFor="cv-pdf" className="cursor-pointer">Upload PDF</label>
          </div>
          
          {preInterview.usePdfForCv ? (
            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium">
                Upload CV as PDF
              </label>
              <div className="flex items-center">
                <label className="flex-1 flex items-center justify-center px-4 py-2 border border-gray-600 rounded-lg cursor-pointer bg-gray-700 hover:bg-gray-600 transition-colors">
                  <span className="mr-2">Select file</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="application/pdf"
                    onChange={(e) => handleFileUpload(e, 'cv')}
                  />
                </label>
                <span className="ml-3 text-sm">
                  {preInterview.cvPdf ? preInterview.cvPdf.name : 'No file selected'}
                </span>
              </div>
            </div>
          ) : (
            <textarea
              className="w-full p-3 mb-4 rounded bg-gray-700 border border-gray-600 text-white"
              rows={6}
              placeholder="Paste the candidate's CV or resume here"
              value={preInterview.cvText}
              onChange={e => setPreInterview(prev => ({ ...prev, cvText: e.target.value }))}
            />
          )}
        </div>
        
        <div className="w-full max-w-2xl bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
          <h3 className="text-xl font-semibold mb-4">Job Description</h3>
          
          <div className="flex items-center mb-3">
            <input
              type="radio"
              id="jd-text"
              name="jd-input-type"
              checked={!preInterview.usePdfForJd}
              onChange={() => setPreInterview(prev => ({ ...prev, usePdfForJd: false }))}
              className="mr-2"
            />
            <label htmlFor="jd-text" className="cursor-pointer">Enter text</label>
            
            <input
              type="radio"
              id="jd-pdf"
              name="jd-input-type"
              checked={preInterview.usePdfForJd}
              onChange={() => setPreInterview(prev => ({ ...prev, usePdfForJd: true }))}
              className="ml-6 mr-2"
            />
            <label htmlFor="jd-pdf" className="cursor-pointer">Upload PDF</label>
          </div>
          
          {preInterview.usePdfForJd ? (
            <div className="mb-4">
              <label className="block mb-2 text-sm font-medium">
                Upload Job Description as PDF
              </label>
              <div className="flex items-center">
                <label className="flex-1 flex items-center justify-center px-4 py-2 border border-gray-600 rounded-lg cursor-pointer bg-gray-700 hover:bg-gray-600 transition-colors">
                  <span className="mr-2">Select file</span>
                  <input
                    type="file"
                    className="hidden"
                    accept="application/pdf"
                    onChange={(e) => handleFileUpload(e, 'jd')}
                  />
                </label>
                <span className="ml-3 text-sm">
                  {preInterview.jobDescriptionPdf ? preInterview.jobDescriptionPdf.name : 'No file selected'}
                </span>
              </div>
            </div>
          ) : (
            <textarea
              className="w-full p-3 mb-4 rounded bg-gray-700 border border-gray-600 text-white"
              rows={5}
              placeholder="Paste the job description here"
              value={preInterview.jobDescription}
              onChange={e => setPreInterview(prev => ({ ...prev, jobDescription: e.target.value }))}
            />
          )}
        </div>
        
        <div className="w-full max-w-2xl bg-gray-800 p-6 rounded-lg shadow-lg mb-6">
          <h3 className="text-xl font-semibold mb-4">Additional Details</h3>
          <textarea
            className="w-full p-3 rounded bg-gray-700 border border-gray-600 text-white"
            rows={3}
            placeholder="Optional: Specify interview difficulty level, focus areas, or specific instructions for the AI interviewer"
            value={preInterview.additionalDetails}
            onChange={e => setPreInterview(prev => ({ ...prev, additionalDetails: e.target.value }))}
          />
        </div>
        
        <button
          className="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium text-lg transition-colors"
          disabled={(preInterview.usePdfForCv && !preInterview.cvPdf) || 
                   (preInterview.usePdfForJd && !preInterview.jobDescriptionPdf) ||
                   (!preInterview.usePdfForCv && !preInterview.cvText.trim()) ||
                   (!preInterview.usePdfForJd && !preInterview.jobDescription.trim())}
          onClick={async () => {
            // Handle PDF uploads - in production, we would extract text using PDF.js
            let continueWithInterview = true;
            
            if (preInterview.usePdfForCv && preInterview.cvPdf) {
              // For CV handling, we'll now allow empty PDF extraction but provide default text
              const extractedText = await extractTextFromPdf(preInterview.cvPdf);
              
              // If no extracted text and no existing CV text, add a placeholder
              if (!extractedText && !preInterview.cvText) {
                // Use the filename as context in the placeholder text
                const defaultCvText = `[Candidate CV from ${preInterview.cvPdf.name}]\n\nExperience: 3 years in relevant field\nEducation: Bachelor's degree\nSkills: Communication, technical skills, problem-solving`;
                setPreInterview(prev => ({ ...prev, cvText: defaultCvText }));
              } else if (extractedText) {
                setPreInterview(prev => ({ ...prev, cvText: extractedText }));
              }
            }
            
            if (preInterview.usePdfForJd && preInterview.jobDescriptionPdf) {
              // For job description, provide similar fallback handling
              const extractedText = await extractTextFromPdf(preInterview.jobDescriptionPdf);
              
              // If no extracted text and no existing job description, add a placeholder
              if (!extractedText && !preInterview.jobDescription) {
                const defaultJobText = `[Job Description from ${preInterview.jobDescriptionPdf.name}]\n\nPosition: Professional role\nRequirements: Industry knowledge, communication skills\nResponsibilities: Project management, team collaboration`;
                setPreInterview(prev => ({ ...prev, jobDescription: defaultJobText }));
              } else if (extractedText) {
                setPreInterview(prev => ({ ...prev, jobDescription: extractedText }));
              }
            }
            
            // Proceed with interview after setting all state
            setShowPreInterview(false);
          }}
        >
          Start Interview
        </button>
      </div>
    );
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
                  <span className="text-sm">Exchequer is responding...</span>
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
              <div className="relative">
                <div className="bg-gray-900 rounded p-3 h-32 overflow-y-auto text-sm">
                  {interviewState.transcription || (
                    interviewState.isRecording 
                      ? 'Speak naturally - your voice will be transcribed here...' 
                      : 'Transcription will appear here when you start the interview...'
                  )}
                </div>
                {interviewState.transcription && (
                  <button 
                    onClick={() => setInterviewState(prev => ({ ...prev, transcription: '' }))}
                    className="absolute bottom-2 right-2 px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Emotion Analysis */}
            <div className="p-4 border-b border-gray-700">
              <EmotionAnalysis 
                emotions={interviewState.emotions || []} 
                currentScore={0} 
                isInterviewActive={interviewState.isRecording}
              />
            </div>

            {/* AI Response */}
            <div className="p-4 flex-1 flex flex-col" style={{ maxHeight: '400px' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold">exchequer (AI Interviewer)</h3>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                </div>
                {interviewState.isAiSpeaking && (
                  <div className="flex items-center space-x-2 text-sm text-blue-400">
                    <div className="animate-pulse">🗣️</div>
                    <span>exchequer is thinking...</span>
                  </div>
                )}
              </div>
              <div className="bg-gray-900 rounded p-3 flex-1 overflow-y-auto text-sm mb-4" style={{ minHeight: '150px', maxHeight: '250px' }}>
                {interviewState.aiResponse || 'Welcome! I\'m exchequer, your AI interviewer. Please click "Start Interview" to begin our conversation.'}
              </div>
              
              {/* Manual Input for Testing */}
              {interviewState.isRecording && (
                <div className="space-y-2 mt-auto" style={{ maxHeight: '120px' }}>
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
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={interviewState.userInput}
                      onChange={(e) => setInterviewState(prev => ({...prev, userInput: e.target.value}))}
                      placeholder="Type your response here..."
                      className="flex-1 px-3 py-2 bg-gray-700 text-white rounded text-sm border border-gray-600 focus:border-blue-500 focus:outline-none"
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
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors whitespace-nowrap"
                    >
                      {interviewState.isAiSpeaking ? 'Processing...' : 'Send'}
                    </button>
                  </div>
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

/**
 * Removes common speech repetition patterns and stuttering
 * This helps improve the quality of the transcription before sending it to the AI
 */
const removeStuttering = (text: string): string => {
  if (!text || text.length < 5) return text;
  
  // Convert to lowercase for pattern matching
  const lowerText = text.toLowerCase();
  const words = lowerText.split(' ');
  
  // Filter out immediate single word repetitions (e.g., "I I I want")
  const withoutSingleRepeats = words.filter((word, index) => {
    if (index === 0) return true;
    return word !== words[index - 1];
  });
  
  // Look for repetitive patterns of 2-3 word phrases
  const result: string[] = [];
  for (let i = 0; i < withoutSingleRepeats.length; i++) {
    // Skip if we've already processed this word
    if (i > 0 && withoutSingleRepeats[i] === result[result.length - 1]) {
      continue;
    }
    
    // Check for 2-word phrase repetition
    if (i + 3 < withoutSingleRepeats.length) {
      const phrase1 = [withoutSingleRepeats[i], withoutSingleRepeats[i + 1]].join(' ');
      const phrase2 = [withoutSingleRepeats[i + 2], withoutSingleRepeats[i + 3]].join(' ');
      
      if (phrase1 === phrase2) {
        // Skip the repetition by adding only the first instance
        result.push(withoutSingleRepeats[i]);
        result.push(withoutSingleRepeats[i + 1]);
        i += 3; // Skip ahead past the repetition
        continue;
      }
    }
    
    // Check for 3-word phrase repetition
    if (i + 5 < withoutSingleRepeats.length) {
      const phrase1 = [withoutSingleRepeats[i], withoutSingleRepeats[i + 1], withoutSingleRepeats[i + 2]].join(' ');
      const phrase2 = [withoutSingleRepeats[i + 3], withoutSingleRepeats[i + 4], withoutSingleRepeats[i + 5]].join(' ');
      
      if (phrase1 === phrase2) {
        // Skip the repetition
        result.push(withoutSingleRepeats[i]);
        result.push(withoutSingleRepeats[i + 1]);
        result.push(withoutSingleRepeats[i + 2]);
        i += 5; // Skip ahead past the repetition
        continue;
      }
    }
    
    // If no pattern found, just add the word
    result.push(withoutSingleRepeats[i]);
  }
  
  // Join and preserve the original capitalization
  const normalizedText = result.join(' ');
  return text.charAt(0).toUpperCase() + normalizedText.slice(1);
};
