'use client'

import React, { useState, useEffect } from 'react'
import { Clock, Play, Pause } from 'lucide-react'

interface InterviewTimerProps {
  duration: number
  isRecording: boolean
  maxDuration?: number
  onTimeUp?: () => void
}

export default function InterviewTimer({ 
  duration, 
  isRecording, 
  maxDuration = 1200, // 20 minutes default
  onTimeUp 
}: InterviewTimerProps) {
  const [seconds, setSeconds] = useState(0)
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    setIsActive(isRecording)
  }, [isRecording])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isActive) {
      interval = setInterval(() => {
        setSeconds(seconds => {
          const newSeconds = seconds + 1
          
          // Check if max duration is reached
          if (newSeconds >= maxDuration && onTimeUp) {
            onTimeUp()
          }
          
          return newSeconds
        })
      }, 1000)
    } else if (!isActive && seconds !== 0) {
      if (interval) clearInterval(interval)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isActive, seconds, maxDuration, onTimeUp])

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const secs = totalSeconds % 60

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getTimeColor = () => {
    const percentage = (seconds / maxDuration) * 100
    
    if (percentage >= 90) return 'text-red-400'
    if (percentage >= 75) return 'text-yellow-400'
    return 'text-green-400'
  }

  const getProgressPercentage = () => {
    return Math.min((seconds / maxDuration) * 100, 100)
  }

  return (
    <div className="flex items-center space-x-3">
      {/* Timer Display */}
      <div className="flex items-center space-x-2">
        <Clock className="h-5 w-5 text-gray-400" />
        <span className={`font-mono text-lg font-semibold ${getTimeColor()}`}>
          {formatTime(seconds)}
        </span>
        {isActive ? (
          <div className="flex items-center">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse ml-2" />
            <span className="text-xs text-red-400 ml-1">REC</span>
          </div>
        ) : (
          <div className="flex items-center ml-2">
            <Pause className="h-3 w-3 text-gray-400" />
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-300 ${
            getProgressPercentage() >= 90 
              ? 'bg-red-500' 
              : getProgressPercentage() >= 75 
                ? 'bg-yellow-500' 
                : 'bg-green-500'
          }`}
          style={{ width: `${getProgressPercentage()}%` }}
        />
      </div>

      {/* Remaining Time Display */}
      <div className="text-xs text-gray-400">
        {Math.max(0, Math.ceil((maxDuration - seconds) / 60))} min left
      </div>
    </div>
  )
}
