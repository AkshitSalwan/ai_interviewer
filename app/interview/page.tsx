'use client'

import React, { useState, useEffect } from 'react'
import Guidelines from '@/components/Guidelines'
import InterviewRoom from '@/components/InterviewRoom'
import { CheckCircle, Camera, Mic, Monitor } from 'lucide-react'

interface SystemCheck {
  camera: boolean
  microphone: boolean
  browser: boolean
}

export default function InterviewPage() {
  const [isReady, setIsReady] = useState(false)
  const [showGuidelines, setShowGuidelines] = useState(true)
  const [systemCheck, setSystemCheck] = useState<SystemCheck>({
    camera: false,
    microphone: false,
    browser: true
  })

  const checkSystemRequirements = async () => {
    try {
      // Check camera and microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      })
      
      setSystemCheck({
        camera: true,
        microphone: true,
        browser: true
      })
      
      // Stop the stream after checking
      stream.getTracks().forEach(track => track.stop())
    } catch (error) {
      console.error('Media access error:', error)
      // Check individual permissions
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true })
        setSystemCheck(prev => ({ ...prev, camera: true }))
        videoStream.getTracks().forEach(track => track.stop())
      } catch {}
      
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
        setSystemCheck(prev => ({ ...prev, microphone: true }))
        audioStream.getTracks().forEach(track => track.stop())
      } catch {}
    }
  }

  useEffect(() => {
    checkSystemRequirements()
  }, [])

  const allSystemsReady = Object.values(systemCheck).every(check => check)

  if (showGuidelines) {
    return (
      <div className="interview-container">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              Interview Preparation
            </h1>
            
            <Guidelines />
            
            {/* System Requirements Check */}
            <div className="mt-8 p-6 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                System Requirements Check
              </h3>
              <div className="space-y-3">
                <SystemCheckItem
                  icon={<Camera className="h-5 w-5" />}
                  label="Camera Access"
                  checked={systemCheck.camera}
                />
                <SystemCheckItem
                  icon={<Mic className="h-5 w-5" />}
                  label="Microphone Access"
                  checked={systemCheck.microphone}
                />
                <SystemCheckItem
                  icon={<Monitor className="h-5 w-5" />}
                  label="Browser Compatibility"
                  checked={systemCheck.browser}
                />
              </div>
              
              {!allSystemsReady && (
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-yellow-800 text-sm">
                    Please allow camera and microphone access to continue with the interview.
                  </p>
                  <button
                    onClick={checkSystemRequirements}
                    className="mt-2 btn-primary px-4 py-2 text-sm"
                  >
                    Retry Permissions
                  </button>
                </div>
              )}
            </div>

            {/* Start Interview Button */}
            <div className="mt-8 text-center">
              <button
                onClick={() => {
                  if (allSystemsReady) {
                    setShowGuidelines(false)
                    setIsReady(true)
                  }
                }}
                disabled={!allSystemsReady}
                className={`px-8 py-4 text-lg font-semibold rounded-lg transition-colors ${
                  allSystemsReady
                    ? 'btn-success hover:bg-success-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {allSystemsReady ? 'Start Interview' : 'Complete System Check'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="interview-container">
      <InterviewRoom />
    </div>
  )
}

function SystemCheckItem({ 
  icon, 
  label, 
  checked 
}: { 
  icon: React.ReactNode
  label: string
  checked: boolean 
}) {
  return (
    <div className="flex items-center space-x-3">
      <div className={`flex items-center space-x-2 ${
        checked ? 'text-success-600' : 'text-gray-400'
      }`}>
        {icon}
        <span className="font-medium">{label}</span>
      </div>
      {checked ? (
        <CheckCircle className="h-5 w-5 text-success-600" />
      ) : (
        <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
      )}
    </div>
  )
}
