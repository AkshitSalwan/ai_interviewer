'use client'

import React from 'react'
import { CheckCircle, Clock, Camera, Mic, Headphones, Wifi } from 'lucide-react'

export default function Guidelines() {
  const guidelines = [
    {
      icon: <Camera className="h-5 w-5" />,
      title: "Camera Setup",
      description: "Ensure your camera is positioned at eye level with good lighting on your face",
      tips: ["Use natural light when possible", "Avoid backlighting", "Keep camera steady"]
    },
    {
      icon: <Mic className="h-5 w-5" />,
      title: "Audio Quality",
      description: "Test your microphone and ensure you're in a quiet environment",
      tips: ["Use headphones to prevent echo", "Minimize background noise", "Speak clearly"]
    },
    {
      icon: <Wifi className="h-5 w-5" />,
      title: "Internet Connection",
      description: "Stable internet connection is required for optimal performance",
      tips: ["Use wired connection if possible", "Close unnecessary apps", "Test connection speed"]
    },
    {
      icon: <Clock className="h-5 w-5" />,
      title: "Interview Duration",
      description: "The interview will last approximately 15-20 minutes",
      tips: ["Have your resume ready", "Prepare for common questions", "Stay relaxed and confident"]
    }
  ]

  const requirements = [
    "Modern web browser (Chrome, Firefox, Safari, Edge)",
    "Webcam and microphone access",
    "Stable internet connection (minimum 1 Mbps)",
    "Quiet environment with good lighting"
  ]

  return (
    <div className="space-y-8">
      {/* Interview Guidelines */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Interview Guidelines
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {guidelines.map((guideline, index) => (
            <div key={index} className="p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center mb-2">
                <div className="text-primary-600 mr-2">
                  {guideline.icon}
                </div>
                <h3 className="font-medium text-gray-900">{guideline.title}</h3>
              </div>
              <p className="text-sm text-gray-600 mb-2">{guideline.description}</p>
              <ul className="text-xs text-gray-500 space-y-1">
                {guideline.tips.map((tip, tipIndex) => (
                  <li key={tipIndex} className="flex items-center">
                    <div className="h-1 w-1 bg-gray-400 rounded-full mr-2" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Technical Requirements */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Technical Requirements
        </h2>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <ul className="space-y-2">
            {requirements.map((requirement, index) => (
              <li key={index} className="flex items-center text-sm text-gray-700">
                <CheckCircle className="h-4 w-4 text-success-600 mr-2 flex-shrink-0" />
                {requirement}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Interview Process */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          What to Expect
        </h2>
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
              1
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Initial Setup</h3>
              <p className="text-sm text-gray-600">Camera and microphone test, followed by brief instructions</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
              2
            </div>
            <div>
              <h3 className="font-medium text-gray-900">AI Interview</h3>
              <p className="text-sm text-gray-600">Interactive conversation with our AI interviewer</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
              3
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Analysis & Report</h3>
              <p className="text-sm text-gray-600">Real-time analysis of your responses and performance</p>
            </div>
          </div>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-2">Privacy & Data Protection</h3>
        <p className="text-sm text-gray-600">
          Your interview will be recorded and analyzed for assessment purposes. 
          All data is handled in accordance with our privacy policy and will be 
          used solely for evaluation and improvement of our services.
        </p>
      </div>
    </div>
  )
}
