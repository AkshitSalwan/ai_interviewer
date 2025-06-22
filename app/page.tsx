'use client'

import React from 'react'
import Link from 'next/link'
import { Video, Mic, Camera, Brain, FileText, BarChart3 } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Brain className="h-8 w-8 text-primary-600" />
              <h1 className="ml-3 text-2xl font-bold text-gray-900">
                AI Interview Platform
              </h1>
            </div>
            <nav className="hidden md:flex space-x-8">
              <Link href="/interview" className="text-gray-700 hover:text-primary-600">
                Start Interview
              </Link>
              <Link href="/dashboard" className="text-gray-700 hover:text-primary-600">
                Dashboard
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            Next-Generation
            <span className="text-primary-600"> AI Video Interviews</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600 max-w-3xl mx-auto">
            Experience the future of hiring with our AI-powered interview platform. 
            Real-time transcription, emotion analysis, and intelligent assessment 
            help you make better hiring decisions.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              href="/interview"
              className="btn-primary px-8 py-4 text-lg font-semibold shadow-lg"
            >
              Start Interview
            </Link>
            <Link
              href="/demo"
              className="btn-secondary px-8 py-4 text-lg font-semibold"
            >
              View Demo
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-24 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={<Video className="h-8 w-8 text-primary-600" />}
            title="Live Video Calls"
            description="High-quality video interviews powered by ZEGOCLOUD with crystal clear audio and video."
          />
          <FeatureCard
            icon={<Mic className="h-8 w-8 text-primary-600" />}
            title="Real-time Transcription"
            description="Automatic speech-to-text conversion using Deepgram for accurate interview transcripts."
          />
          <FeatureCard
            icon={<Brain className="h-8 w-8 text-primary-600" />}
            title="AI-Powered Analysis"
            description="Advanced AI evaluation using Gemini/OpenAI for intelligent candidate assessment."
          />
          <FeatureCard
            icon={<Camera className="h-8 w-8 text-primary-600" />}
            title="Emotion Detection"
            description="Real-time facial expression and emotion analysis using Face API.js technology."
          />
          <FeatureCard
            icon={<FileText className="h-8 w-8 text-primary-600" />}
            title="PDF Reports"
            description="Comprehensive interview reports with AI insights and hiring recommendations."
          />
          <FeatureCard
            icon={<BarChart3 className="h-8 w-8 text-primary-600" />}
            title="Analytics Dashboard"
            description="Detailed analytics and visualizations of interview performance and trends."
          />
        </div>

        {/* CTA Section */}
        <div className="mt-24 bg-primary-600 rounded-2xl p-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Transform Your Hiring Process?
          </h2>
          <p className="text-primary-100 text-lg mb-8 max-w-2xl mx-auto">
            Join thousands of companies using AI-powered interviews to find the best talent faster and more efficiently.
          </p>
          <Link
            href="/interview"
            className="bg-white text-primary-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
          >
            Get Started Now
          </Link>
        </div>
      </main>
    </div>
  )
}

function FeatureCard({ icon, title, description }: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="card p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center mb-4">
        {icon}
        <h3 className="ml-3 text-xl font-semibold text-gray-900">{title}</h3>
      </div>
      <p className="text-gray-600">{description}</p>
    </div>
  )
}
