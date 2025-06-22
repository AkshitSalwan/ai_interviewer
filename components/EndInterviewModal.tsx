'use client'

import React, { useState, useEffect } from 'react'
import { X, FileText, Download, Star, TrendingUp, Clock, MessageSquare } from 'lucide-react'

interface InterviewData {
  duration: number
  transcription: string
  emotions: any[]
}

interface EndInterviewModalProps {
  onClose: () => void
  interviewData: InterviewData
}

export default function EndInterviewModal({ onClose, interviewData }: EndInterviewModalProps) {
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [reportGenerated, setReportGenerated] = useState(false)
  const [scoringResult, setScoringResult] = useState<any>(null)
  const [isLoadingScore, setIsLoadingScore] = useState(true)

  // Ensure interviewData has safe defaults
  const safeInterviewData = {
    duration: interviewData?.duration || 0,
    transcription: interviewData?.transcription || '',
    emotions: interviewData?.emotions || []
  }

  // Get dynamic AI scoring on component mount
  useEffect(() => {
    const getAIScoring = async () => {
      try {
        const response = await fetch('/api/score-interview', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            transcription: safeInterviewData.transcription,
            emotions: safeInterviewData.emotions,
            duration: safeInterviewData.duration
          }),
        })
        
        if (response.ok) {
          const result = await response.json()
          setScoringResult(result)
        } else {
          // No API response - use actual computed score or 0
          setScoringResult({
            overallScore: computeFallbackScore(),
            breakdown: {
              communication: 0,
              confidence: 0,
              technicalKnowledge: 0,
              problemSolving: 0,
              emotionalIntelligence: 0,
              articulation: 0
            },
            insights: safeInterviewData.transcription.length > 0 
              ? ['Interview data collected successfully'] 
              : ['No interview data available'],
            recommendations: safeInterviewData.transcription.length > 0
              ? ['Review interview performance for improvement areas']
              : ['Complete an interview to receive recommendations'],
            hiringRecommendation: computeFallbackScore() >= 70 ? 'CONSIDER' : 'NEEDS_IMPROVEMENT'
          })
        }
      } catch (error) {
        console.error('Error getting AI scoring:', error)
        // Error case - use actual computed score or 0
        setScoringResult({
          overallScore: computeFallbackScore(),
          breakdown: {
            communication: 0,
            confidence: 0,
            technicalKnowledge: 0,
            problemSolving: 0,
            emotionalIntelligence: 0,
            articulation: 0
          },
          insights: ['Unable to complete AI analysis'],
          recommendations: safeInterviewData.transcription.length > 0
            ? ['Review interview recording for self-assessment']
            : ['No interview data to analyze'],
          hiringRecommendation: 'PENDING'
        })
      } finally {
        setIsLoadingScore(false)
      }
    }

    getAIScoring()
  }, [safeInterviewData])

  const generateReport = async () => {
    setIsGeneratingReport(true)
    
    try {
      // Call API to generate PDF report
      const response = await fetch('/api/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          duration: safeInterviewData.duration,
          transcription: safeInterviewData.transcription,
          emotions: safeInterviewData.emotions,
          timestamp: new Date().toISOString()
        }),
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `interview-report-${Date.now()}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        setReportGenerated(true)
      }
    } catch (error) {
      console.error('Error generating report:', error)
    } finally {
      setIsGeneratingReport(false)
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  const getScoreColor = (score: number) => {
    if (score === 0) return 'text-gray-500'
    if (score >= 80) return 'text-green-500'
    if (score >= 60) return 'text-yellow-500'
    return 'text-red-500'
  }

  const getRecommendation = (score: number) => {
    if (score === 0) return {
      level: 'No Data',
      message: 'Insufficient interview data to provide assessment.',
      color: 'bg-gray-500'
    }
    if (score >= 85) return { 
      level: 'Excellent', 
      message: 'Outstanding performance! Strong candidate for the role.',
      color: 'bg-green-500'
    }
    if (score >= 70) return { 
      level: 'Good', 
      message: 'Solid performance with strong potential.',
      color: 'bg-blue-500'
    }
    if (score >= 55) return { 
      level: 'Fair', 
      message: 'Adequate performance with room for improvement.',
      color: 'bg-yellow-500'
    }
    return { 
      level: 'Needs Improvement', 
      message: 'Consider additional preparation or training.',
      color: 'bg-red-500'
    }
  }

  // Safely compute score based on actual data only
  const computeFallbackScore = () => {
    // If no meaningful data, return 0
    if (!safeInterviewData.transcription && safeInterviewData.emotions.length === 0) {
      return 0
    }

    const validEmotions = safeInterviewData.emotions?.filter(emotion => 
      emotion && typeof emotion === 'object' && typeof emotion.score === 'number'
    ) || []
    
    const emotionScore = validEmotions.length > 0 
      ? validEmotions.reduce((sum, emotion) => sum + emotion.score, 0) / validEmotions.length
      : 0
    
    const durationScore = safeInterviewData.duration >= 300 ? 1 : safeInterviewData.duration / 300
    const transcriptionScore = safeInterviewData.transcription?.length > 100 ? 0.8 : 
                              safeInterviewData.transcription?.length > 50 ? 0.5 : 
                              safeInterviewData.transcription?.length > 0 ? 0.2 : 0
    
    const overall = (emotionScore * 0.4 + durationScore * 0.3 + transcriptionScore * 0.3) * 100
    return Math.round(Math.max(0, overall))
  }

  // Use dynamic scoring if available, otherwise use computed fallback
  const overallScore = scoringResult ? scoringResult.overallScore : computeFallbackScore()
  const recommendation = getRecommendation(overallScore)
  
  // Generate insights based on actual data
  const generateDataBasedInsights = () => {
    const insights = []
    
    if (safeInterviewData.duration > 0) {
      insights.push(`Interview duration: ${formatDuration(safeInterviewData.duration)}`)
    }
    
    if (safeInterviewData.transcription.length > 0) {
      insights.push(`Transcription captured: ${safeInterviewData.transcription.length} characters`)
    } else {
      insights.push('No speech was detected during the interview')
    }
    
    if (safeInterviewData.emotions.length > 0) {
      insights.push(`Emotion data collected: ${safeInterviewData.emotions.length} data points`)
    } else {
      insights.push('No emotion data was captured')
    }
    
    if (insights.length === 0) {
      insights.push('No interview data was collected')
    }
    
    return insights
  }
  
  const insights = scoringResult ? scoringResult.insights : generateDataBasedInsights()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Interview Complete</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Overall Score */}
          <div className="text-center">
            {isLoadingScore ? (
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mb-4" />
                <p className="text-gray-600">Analyzing interview performance...</p>
              </div>
            ) : (
              <>
                <div className="relative inline-flex items-center justify-center w-32 h-32 rounded-full bg-gray-100 mb-4">
                  <div className={`text-4xl font-bold ${getScoreColor(overallScore)}`}>
                    {overallScore}
                  </div>
                  <div className="absolute bottom-2 text-sm text-gray-500">/ 100</div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Overall Score</h3>
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium text-white ${recommendation.color}`}>
                  {recommendation.level}
                </div>
                <p className="text-gray-600 mt-2">{recommendation.message}</p>
                {scoringResult && (
                  <p className="text-sm text-gray-500 mt-1">
                    Hiring Recommendation: <span className="font-medium">{scoringResult.hiringRecommendation.replace('_', ' ')}</span>
                  </p>
                )}
              </>
            )}
          </div>

          {/* Detailed Score Breakdown */}
          {scoringResult && !isLoadingScore && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Score Breakdown</h3>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(scoringResult.breakdown).map(([skill, score]) => (
                  <div key={skill} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-gray-700 capitalize">
                        {skill.replace(/([A-Z])/g, ' $1').trim()}
                      </span>
                      <span className={`text-sm font-bold ${getScoreColor(Number(score))}`}>
                        {Number(score)}/100
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          Number(score) >= 80 ? 'bg-green-500' : 
                          Number(score) >= 60 ? 'bg-blue-500' : 
                          Number(score) >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Number(score)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interview Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <Clock className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{formatDuration(safeInterviewData.duration)}</div>
              <div className="text-sm text-gray-500">Duration</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <MessageSquare className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">
                {safeInterviewData.transcription.split(' ').length}
              </div>
              <div className="text-sm text-gray-500">Words Spoken</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <TrendingUp className="h-8 w-8 text-purple-500 mx-auto mb-2" />
              <div className="text-2xl font-bold text-gray-900">{safeInterviewData.emotions.length}</div>
              <div className="text-sm text-gray-500">Emotion Points</div>
            </div>
          </div>

          {/* Key Insights */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">AI-Generated Insights</h3>
            
            <div className="space-y-3">
              {insights.map((insight: string, index: number) => (
                <div key={index} className="flex items-start space-x-3">
                  <Star className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-600 text-sm">{insight}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">AI Recommendations</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              {(scoringResult?.recommendations || [
                'Continue practicing technical questions to improve confidence',
                'Work on providing more specific examples in responses',
                'Consider mock interviews to further develop skills'
              ]).map((rec: string, index: number) => (
                <li key={index}>• {rec}</li>
              ))}
            </ul>
          </div>

          {/* Actions */}
          <div className="flex space-x-4">
            <button
              onClick={generateReport}
              disabled={isGeneratingReport}
              className="flex-1 flex items-center justify-center px-4 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGeneratingReport ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
              ) : (
                <>
                  <FileText className="h-5 w-5 mr-2" />
                  Generate PDF Report
                </>
              )}
            </button>
            
            {reportGenerated && (
              <button
                onClick={() => window.location.href = '/dashboard'}
                className="flex-1 flex items-center justify-center px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                <TrendingUp className="h-5 w-5 mr-2" />
                View Dashboard
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
