'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Smile, Meh, Frown, Eye, TrendingUp } from 'lucide-react'

interface Emotion {
  emotion: string
  score: number
  timestamp: number
}

interface EmotionAnalysisProps {
  emotions: Emotion[]
  currentScore?: number
  isInterviewActive?: boolean
}

export default function EmotionAnalysis({ emotions, currentScore, isInterviewActive }: EmotionAnalysisProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [currentEmotion, setCurrentEmotion] = useState<Emotion | null>(null)
  const [averageConfidence, setAverageConfidence] = useState(0)

  useEffect(() => {
    const validEmotions = emotions.filter(emotion => emotion && emotion.emotion && typeof emotion.score === 'number')
    
    if (validEmotions.length > 0) {
      const latest = validEmotions[validEmotions.length - 1]
      setCurrentEmotion(latest)
      
      // Calculate average confidence
      const avg = validEmotions.reduce((sum, emotion) => sum + emotion.score, 0) / validEmotions.length
      setAverageConfidence(avg)
    } else {
      setCurrentEmotion(null)
      setAverageConfidence(0)
    }
  }, [emotions])

  const getEmotionIcon = (emotion: string) => {
    switch (emotion.toLowerCase()) {
      case 'happy':
      case 'confident':
      case 'positive':
        return <Smile className="h-5 w-5 text-green-400" />
      case 'neutral':
      case 'calm':
        return <Meh className="h-5 w-5 text-yellow-400" />
      case 'sad':
      case 'nervous':
      case 'worried':
        return <Frown className="h-5 w-5 text-red-400" />
      default:
        return <Eye className="h-5 w-5 text-blue-400" />
    }
  }

  const getEmotionColor = (emotion: string) => {
    switch (emotion.toLowerCase()) {
      case 'happy':
      case 'confident':
      case 'positive':
        return 'text-green-400'
      case 'neutral':
      case 'calm':
        return 'text-yellow-400'
      case 'sad':
      case 'nervous':
      case 'worried':
        return 'text-red-400'
      default:
        return 'text-blue-400'
    }
  }

  const getConfidenceLevel = (score: number) => {
    if (score >= 0.8) return { level: 'High', color: 'text-green-400' }
    if (score >= 0.6) return { level: 'Medium', color: 'text-yellow-400' }
    return { level: 'Low', color: 'text-red-400' }
  }

  const emotionSummary = emotions
    .filter(emotion => emotion && emotion.emotion) // Filter out undefined/invalid emotions
    .reduce((acc, emotion) => {
      acc[emotion.emotion] = (acc[emotion.emotion] || 0) + 1
      return acc
    }, {} as Record<string, number>)

  const topEmotions = Object.entries(emotionSummary)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-white">Interview Analytics</h3>
      
      {/* Current Emotion */}
      {currentEmotion ? (
        <div className="bg-gray-900 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              {getEmotionIcon(currentEmotion.emotion)}
              <span className={`font-medium capitalize ${getEmotionColor(currentEmotion.emotion)}`}>
                {currentEmotion.emotion}
              </span>
            </div>
            <span className="text-xs text-gray-400">Now</span>
          </div>
          
          {/* Confidence Score */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Confidence</span>
              <span className={getConfidenceLevel(currentEmotion.score).color}>
                {getConfidenceLevel(currentEmotion.score).level}
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${currentEmotion.score * 100}%` }}
              />
            </div>
            <div className="text-xs text-gray-400 text-right">
              {Math.round(currentEmotion.score * 100)}%
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-gray-900 rounded-lg p-3">
          <div className="text-center py-4">
            <Eye className="h-8 w-8 text-gray-500 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Emotion analysis will appear here</p>
            <p className="text-xs text-gray-500 mt-1">
              Face API integration required for real-time emotion detection
            </p>
          </div>
        </div>
      )}

      {/* Overall Performance */}
      <div className="bg-gray-900 rounded-lg p-3">
        <div className="flex items-center space-x-2 mb-2">
          <TrendingUp className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-medium text-white">Overall Performance</span>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-gray-400">Average Confidence</span>
            <span className={getConfidenceLevel(averageConfidence).color}>
              {Math.round(averageConfidence * 100)}%
            </span>
          </div>
          
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${averageConfidence * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Top Emotions */}
      {topEmotions.length > 0 && (
        <div className="bg-gray-900 rounded-lg p-3">
          <h4 className="text-sm font-medium text-white mb-2">Emotion Breakdown</h4>
          <div className="space-y-2">
            {topEmotions.map(([emotion, count], index) => (
              <div key={emotion} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getEmotionIcon(emotion)}
                  <span className={`text-xs capitalize ${getEmotionColor(emotion)}`}>
                    {emotion}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-16 bg-gray-700 rounded-full h-1">
                    <div 
                      className="bg-blue-400 h-1 rounded-full"
                      style={{ width: `${(count / Math.max(emotions.filter(e => e && e.emotion).length, 1)) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-8 text-right">
                    {Math.round((count / Math.max(emotions.filter(e => e && e.emotion).length, 1)) * 100)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live AI Score Indicator */}
      {isInterviewActive && currentScore !== undefined && (
        <div className="bg-gray-900 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="h-4 w-4 text-green-400" />
            <span className="text-sm font-medium text-white">Live AI Score</span>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Current Performance</span>
              <span className={`font-bold ${
                currentScore >= 80 ? 'text-green-400' : 
                currentScore >= 60 ? 'text-yellow-400' : 
                'text-red-400'
              }`}>
                {Math.round(currentScore)}/100
              </span>
            </div>
            
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${
                  currentScore >= 80 ? 'bg-green-500' : 
                  currentScore >= 60 ? 'bg-yellow-500' : 
                  'bg-red-500'
                }`}
                style={{ width: `${Math.min(currentScore, 100)}%` }}
              />
            </div>
            
            <div className="text-xs text-center">
              <span className={`font-medium ${
                currentScore >= 80 ? 'text-green-400' : 
                currentScore >= 60 ? 'text-yellow-400' : 
                'text-red-400'
              }`}>
                {currentScore >= 80 ? 'Excellent Performance' : 
                 currentScore >= 60 ? 'Good Performance' : 
                 'Needs Improvement'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Feedback */}
      <div className="bg-gray-900 rounded-lg p-3">
        <h4 className="text-sm font-medium text-white mb-2">Live Feedback</h4>
        <div className="text-xs text-gray-400 space-y-1">
          {emotions.filter(e => e && e.emotion).length === 0 ? (
            <p>Emotion analysis will appear here during the interview...</p>
          ) : averageConfidence >= 0.7 ? (
            <div className="text-green-400">
              <p>✓ Great confidence level!</p>
              <p>✓ Maintaining good eye contact</p>
            </div>
          ) : averageConfidence >= 0.5 ? (
            <div className="text-yellow-400">
              <p>• Try to maintain steady eye contact</p>
              <p>• Relax your facial expressions</p>
            </div>
          ) : (
            <div className="text-red-400">
              <p>• Take a deep breath and relax</p>
              <p>• Look directly at the camera</p>
              <p>• Sit up straight and smile</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
