"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { 
  Globe, 
  Search, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Play, 
  Pause,
  RotateCcw,
  ExternalLink,
  Building,
  Users,
  Phone,
  Mail,
  MapPin,
  Loader2,
  RefreshCw,
  Settings
} from "lucide-react"
import Navigation from "@/components/Navigation"
import { useAuth } from "@/contexts/AuthContext"
import ProtectedRoute from "@/components/ProtectedRoute"
import { getBackendUrl } from "@/utils/config"
import { useRouter } from 'next/navigation'

interface ScrapingStep {
  id: number
  title: string
  description: string
  status: 'pending' | 'running' | 'completed' | 'error'
  progress: number
  details?: string
  error?: string
}

interface ScrapingSession {
  sessionId: string
  url: string
  status: 'pending' | 'running' | 'completed' | 'error' | 'paused'
  currentStep: number
  steps: ScrapingStep[]
  startedAt: string
  completedAt?: string
  businessData?: any
  canResume: boolean
}

interface FooterPage {
  url: string
  text: string
  category: string
}

interface BusinessData {
  businessName: string
  businessCategory: string
  industry: string
  businessType: string
  platform: string
  description: string
  website: string
  footerPages: {
    policies: FooterPage[]
    legal: FooterPage[]
    support: FooterPage[]
    company: FooterPage[]
    resources: FooterPage[]
    other: FooterPage[]
  }
  importantPages: Array<{
    url: string
    text: string
    source: string
  }>
  agentScope?: {
    should_help_with: string[]
    should_not_help_with: string[]
  }
  productsServices?: string[]
  categoryConfidence?: number
  categoryReasoning?: string
  extractedAt: string
  readyForSetup: boolean
}

export default function ScrapingPage() {
  const { business, user, loading: authLoading } = useAuth()
  const router = useRouter()
  const wsRef = useRef<WebSocket | null>(null)
  
  const [session, setSession] = useState<ScrapingSession | null>(null)
  const [targetUrl, setTargetUrl] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState('')
  const [recoverySessions, setRecoverySessions] = useState<ScrapingSession[]>([])

  // Initialize the 8 steps
  const initializeSteps = (): ScrapingStep[] => [
    {
      id: 1,
      title: "Initialize Scraping",
      description: "Setting up scraping environment and validating URL",
      status: 'pending',
      progress: 0
    },
    {
      id: 2,
      title: "Fetch Website Content",
      description: "Downloading and parsing website HTML content",
      status: 'pending',
      progress: 0
    },
    {
      id: 3,
      title: "Extract Business Information",
      description: "Identifying business name, description, and basic details",
      status: 'pending',
      progress: 0
    },
    {
      id: 4,
      title: "Analyze Navigation Structure",
      description: "Mapping website navigation and important pages",
      status: 'pending',
      progress: 0
    },
    {
      id: 5,
      title: "Extract Footer Pages",
      description: "Categorizing footer links (policies, support, company info)",
      status: 'pending',
      progress: 0
    },
    {
      id: 6,
      title: "AI Category Analysis",
      description: "Using OpenAI to determine business category and scope",
      status: 'pending',
      progress: 0
    },
    {
      id: 7,
      title: "Platform & Technology Detection",
      description: "Identifying website platform and technology stack",
      status: 'pending',
      progress: 0
    },
    {
      id: 8,
      title: "Finalize Analysis",
      description: "Compiling results and saving to database",
      status: 'pending',
      progress: 0
    }
  ]

  // WebSocket connection
  useEffect(() => {
    if (!business?.id) return

    const connectWebSocket = async () => {
      try {
        const backendUrl = await getBackendUrl()
        const wsUrl = backendUrl.replace('http', 'ws') + '/ws/scraping'
        
        wsRef.current = new WebSocket(wsUrl)
        
        wsRef.current.onopen = () => {
          console.log('WebSocket connected')
          // Send authentication after a small delay to ensure connection is ready
          setTimeout(() => {
            safeSendWebSocketMessage({
              type: 'auth',
              businessId: business.id,
              token: localStorage.getItem('auth_token')
            })
          }, 100)
        }
        
        wsRef.current.onmessage = (event) => {
          const data = JSON.parse(event.data)
          handleWebSocketMessage(data)
        }
        
        wsRef.current.onclose = () => {
          console.log('WebSocket disconnected')
          // Attempt to reconnect after 3 seconds
          setTimeout(connectWebSocket, 3000)
        }
        
        wsRef.current.onerror = (error) => {
          console.error('WebSocket error:', error)
        }
      } catch (error) {
        console.error('WebSocket connection failed:', error)
      }
    }

    connectWebSocket()

    return () => {
      wsRef.current?.close()
    }
  }, [business?.id])

  const safeSendWebSocketMessage = (message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket not ready, queuing message:', message.type)
      // Retry after a short delay
      setTimeout(() => safeSendWebSocketMessage(message), 200)
    }
  }

  const handleWebSocketMessage = (data: any) => {
    console.log('WebSocket message received:', data.type, data)
    switch (data.type) {
      case 'session_update':
        setSession(data.session)
        break
      case 'step_update':
        setSession(prev => {
          if (!prev) return prev
          const updatedSteps = prev.steps.map(step => 
            step.id === data.stepId ? { ...step, ...data.stepData } : step
          )
          return { ...prev, steps: updatedSteps }
        })
        break
      case 'progress_update':
        setSession(prev => {
          if (!prev) return prev
          const updatedSteps = prev.steps.map(step => 
            step.id === data.stepId ? { ...step, progress: data.progress } : step
          )
          return { ...prev, steps: updatedSteps }
        })
        break
      case 'session_complete':
        setSession(prev => prev ? { 
          ...prev, 
          status: 'completed', 
          completedAt: new Date().toISOString(),
          businessData: data.businessData 
        } : null)
        break
      case 'error':
        setError(data.error)
        setSession(prev => prev ? { ...prev, status: 'error' } : null)
        break
      case 'recovery_sessions':
        setRecoverySessions(data.sessions)
        break
    }
  }

  const startNewSession = async () => {
    if (!targetUrl.trim() || !business?.id) return
    
    try {
      setIsConnecting(true)
      setError('')
      
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      const newSession: ScrapingSession = {
        sessionId,
        url: targetUrl.trim(),
        status: 'pending',
        currentStep: 1,
        steps: initializeSteps(),
        startedAt: new Date().toISOString(),
        canResume: true
      }
      
      setSession(newSession)
      
      // Send start command via WebSocket
      safeSendWebSocketMessage({
        type: 'start_session',
        sessionId,
        url: targetUrl.trim(),
        businessId: business.id
      })
      
    } catch (error: any) {
      console.error('Error starting session:', error)
      setError(error.message || 'Failed to start scraping session')
    } finally {
      setIsConnecting(false)
    }
  }

  const pauseSession = () => {
    if (!session) return
    
    safeSendWebSocketMessage({
      type: 'pause_session',
      sessionId: session.sessionId
    })
  }

  const resumeSession = (sessionId?: string) => {
    const targetSessionId = sessionId || session?.sessionId
    if (!targetSessionId) return
    
    safeSendWebSocketMessage({
      type: 'resume_session',
      sessionId: targetSessionId
    })
  }

  const loadRecoverySessions = async () => {
    if (!business?.id) return
    
    try {
      const backendUrl = await getBackendUrl()
      const authToken = localStorage.getItem('auth_token')
      
      const response = await fetch(`${backendUrl}/api/scraping/sessions/${business.id}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setRecoverySessions(data.sessions || [])
      }
    } catch (error) {
      console.error('Error loading recovery sessions:', error)
    }
  }

  const getStepIcon = (step: ScrapingStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'running':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      default:
        return <Clock className="w-5 h-5 text-gray-400" />
    }
  }

  const getStepStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 border-green-200'
      case 'running': return 'bg-blue-100 border-blue-200'
      case 'error': return 'bg-red-100 border-red-200'
      default: return 'bg-gray-50 border-gray-200'
    }
  }

  const calculateOverallProgress = () => {
    if (!session) return 0
    const totalSteps = session.steps.length
    const completedSteps = session.steps.filter(step => step.status === 'completed').length
    return Math.round((completedSteps / totalSteps) * 100)
  }

  // Load recovery sessions on component mount
  useEffect(() => {
    loadRecoverySessions()
  }, [business?.id])

  // Show loading state while auth is loading
  if (authLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex">
          <Navigation />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 flex">
        <Navigation />

        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                  <Search className="w-6 h-6 mr-3 text-purple-600" />
                  Website Scraping
                </h1>
                <p className="text-gray-600">Comprehensive business analysis with session management</p>
              </div>
              <div className="flex items-center space-x-2">
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => {
                    console.log('Header button clicked - navigating to business-setting')
                    window.location.href = '/business-setting'
                  }}
                  className="bg-green-600 hover:bg-green-700"
                >
                  View Business Data
                </Button>
                <Button variant="outline" size="sm" onClick={loadRecoverySessions}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Load Sessions
                </Button>
              </div>
            </div>
          </header>

          <main className="flex-1 p-6">
            <div className="max-w-6xl mx-auto space-y-6">
              
              {/* Recovery Sessions */}
              {recoverySessions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Recovery Sessions</CardTitle>
                    <CardDescription>
                      Resume incomplete scraping sessions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {recoverySessions.map((recoverySession) => (
                        <div key={recoverySession.sessionId} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                              <Globe className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{recoverySession.url}</p>
                              <p className="text-sm text-gray-600">
                                Step {recoverySession.currentStep}/8 • Started {new Date(recoverySession.startedAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant={recoverySession.status === 'error' ? 'destructive' : 'secondary'}>
                              {recoverySession.status}
                            </Badge>
                            <Button 
                              size="sm" 
                              onClick={() => resumeSession(recoverySession.sessionId)}
                              disabled={!recoverySession.canResume}
                            >
                              <Play className="w-4 h-4 mr-2" />
                              Resume
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Start New Session */}
              {!session && (
                <Card>
                  <CardHeader>
                    <CardTitle>Start New Scraping Session</CardTitle>
                    <CardDescription>
                      Enter a website URL to begin comprehensive analysis
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="website-url">Website URL</Label>
                        <div className="flex space-x-2 mt-1">
                          <Input
                            id="website-url"
                            type="url"
                            placeholder="https://example.com"
                            value={targetUrl}
                            onChange={(e) => setTargetUrl(e.target.value)}
                            className="flex-1"
                          />
                          <Button 
                            onClick={startNewSession}
                            disabled={!targetUrl.trim() || isConnecting}
                            className="px-6"
                          >
                            {isConnecting ? (
                              <div className="flex items-center">
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Starting...
                              </div>
                            ) : (
                              <div className="flex items-center">
                                <Play className="w-4 h-4 mr-2" />
                                Start Session
                              </div>
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      {error && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>
                            {error}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Active Session */}
              {session && (
                <div className="space-y-6">
                  {/* Session Overview */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center">
                            <Globe className="w-5 h-5 mr-2" />
                            {session.url}
                          </CardTitle>
                          <CardDescription>
                            Session ID: {session.sessionId} • Started: {new Date(session.startedAt).toLocaleString()}
                          </CardDescription>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={
                            session.status === 'completed' ? 'default' :
                            session.status === 'error' ? 'destructive' :
                            session.status === 'running' ? 'secondary' : 'outline'
                          }>
                            {session.status}
                          </Badge>
                          {/* Debug info */}
                          {console.log('DEBUG - Session status:', session.status)}
                          {console.log('DEBUG - Business data exists:', !!session.businessData)}
                          {console.log('DEBUG - Full session:', session)}
                          {session.status === 'running' && (
                            <Button variant="outline" size="sm" onClick={pauseSession}>
                              <Pause className="w-4 h-4 mr-2" />
                              Pause
                            </Button>
                          )}
                          {session.status === 'paused' && (
                            <Button variant="outline" size="sm" onClick={() => resumeSession()}>
                              <Play className="w-4 h-4 mr-2" />
                              Resume
                            </Button>
                          )}
                          {session.status === 'completed' && session.businessData && (
                            <Button variant="outline" size="sm" onClick={() => {
                              console.log('Configure Agent button clicked')
                              console.log('Session status:', session.status)
                              console.log('Business data exists:', !!session.businessData)
                              console.log('Business data:', session.businessData)
                              console.log('Router:', router)
                              try {
                                router.push('/business-setting')
                                console.log('Router.push called successfully')
                              } catch (error) {
                                console.error('Router.push failed:', error)
                              }
                            }}>
                              <Settings className="w-4 h-4 mr-2" />
                              Configure Agent
                            </Button>
                          )}
                          {/* Temporary button for testing */}
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={() => {
                              console.log('Temp button clicked - navigating to business-setting')
                              window.location.href = '/business-setting'
                            }}
                          >
                            Go to Business Setting (Temp)
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-2">
                            <span>Overall Progress</span>
                            <span>{calculateOverallProgress()}%</span>
                          </div>
                          <Progress value={calculateOverallProgress()} className="w-full" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Steps */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Scraping Steps</CardTitle>
                      <CardDescription>
                        8-step comprehensive website analysis process
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {session.steps.map((step, index) => (
                          <div 
                            key={step.id} 
                            className={`p-4 border rounded-lg ${getStepStatusColor(step.status)}`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                {getStepIcon(step)}
                                <div>
                                  <h4 className="font-medium text-gray-900">
                                    Step {step.id}: {step.title}
                                  </h4>
                                  <p className="text-sm text-gray-600">{step.description}</p>
                                  {step.details && (
                                    <p className="text-xs text-gray-500 mt-1">{step.details}</p>
                                  )}
                                  {step.error && (
                                    <p className="text-xs text-red-600 mt-1">{step.error}</p>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium text-gray-900">
                                  {step.progress}%
                                </div>
                                {step.status === 'running' && (
                                  <Progress value={step.progress} className="w-24 mt-1" />
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Results */}
                  {session.status === 'completed' && session.businessData && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Analysis Results</CardTitle>
                        <CardDescription>
                          Complete business analysis results
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="text-center p-4 bg-gray-50 rounded-lg">
                              <h4 className="font-medium text-gray-900">Business Category</h4>
                              <p className="text-sm text-gray-600 mt-1">
                                {session.businessData.businessCategory}
                              </p>
                            </div>
                            <div className="text-center p-4 bg-gray-50 rounded-lg">
                              <h4 className="font-medium text-gray-900">Industry</h4>
                              <p className="text-sm text-gray-600 mt-1">
                                {session.businessData.industry}
                              </p>
                            </div>
                            <div className="text-center p-4 bg-gray-50 rounded-lg">
                              <h4 className="font-medium text-gray-900">Platform</h4>
                              <p className="text-sm text-gray-600 mt-1">
                                {session.businessData.platform}
                              </p>
                            </div>
                          </div>

                          <div className="flex space-x-4">
                            <Button className="flex-1">
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Configure AI Agent
                            </Button>
                            <Button variant="outline">
                              <FileText className="w-4 h-4 mr-2" />
                              View Full Report
                            </Button>
                            <Button variant="outline" onClick={() => setSession(null)}>
                              <RotateCcw className="w-4 h-4 mr-2" />
                              Start New Session
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}