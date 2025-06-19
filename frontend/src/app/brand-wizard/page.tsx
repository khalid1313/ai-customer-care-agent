"use client"

import { useState, useEffect } from "react"
import { 
  Sparkles,
  Bot,
  CheckCircle,
  Clock,
  ArrowRight,
  Loader2,
  Send,
  RefreshCw,
  Globe,
  ChevronRight
} from "lucide-react"
import Navigation from "@/components/Navigation"
import { useAuth } from "@/contexts/AuthContext"
import ProtectedRoute from "@/components/ProtectedRoute"
import { getBackendUrl } from "@/utils/config"

interface KnowledgeStep {
  id: string
  title: string
  description: string
  icon: string
  status: 'pending' | 'in-progress' | 'completed'
  scrapedData?: any
  aiQuestions?: string[]
  userResponses?: string[]
  generatedContent?: string
}

export default function BrandWizardPage() {
  const { business, user, loading: authLoading } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [scrapedData, setScrapedData] = useState(null)
  const [currentQuestion, setCurrentQuestion] = useState('')
  const [userInput, setUserInput] = useState('')
  const [isAiThinking, setIsAiThinking] = useState(false)
  const [showUrlInput, setShowUrlInput] = useState(true)
  const [showFinalReview, setShowFinalReview] = useState(false)
  const [finalKnowledgeBase, setFinalKnowledgeBase] = useState({})
  const [isGeneratingReview, setIsGeneratingReview] = useState(false)
  const [additionalFeedback, setAdditionalFeedback] = useState('')

  // Define the 10-step knowledge building process
  const knowledgeSteps: KnowledgeStep[] = [
    {
      id: 'returns-refunds',
      title: 'Returns & Refunds',
      description: 'Return policy and procedures',
      icon: '',
      status: 'pending'
    },
    {
      id: 'shipping-delivery',
      title: 'Shipping & Delivery',
      description: 'Shipping policies and timeframes',
      icon: '',
      status: 'pending'
    },
    {
      id: 'product-support',
      title: 'Product Information',
      description: 'Product details and support',
      icon: '',
      status: 'pending'
    },
    {
      id: 'customer-support',
      title: 'Customer Support',
      description: 'Support procedures and escalation',
      icon: '',
      status: 'pending'
    },
    {
      id: 'payment-billing',
      title: 'Payment & Billing',
      description: 'Payment methods and billing',
      icon: '',
      status: 'pending'
    },
    {
      id: 'order-management',
      title: 'Order Management',
      description: 'Order processing and changes',
      icon: '',
      status: 'pending'
    },
    {
      id: 'technical-support',
      title: 'Technical Support',
      description: 'Website and technical issues',
      icon: '',
      status: 'pending'
    },
    {
      id: 'business-operations',
      title: 'Business Operations',
      description: 'Hours and operational details',
      icon: '',
      status: 'pending'
    },
    {
      id: 'brand-communication',
      title: 'Brand Communication',
      description: 'Communication style and tone',
      icon: '',
      status: 'pending'
    },
    {
      id: 'knowledge-finalization',
      title: 'Knowledge Review',
      description: 'Final review and optimization',
      icon: '',
      status: 'pending'
    }
  ]

  const [steps, setSteps] = useState(knowledgeSteps)

  // Start website analysis
  const handleAnalyzeWebsite = async () => {
    if (!websiteUrl.trim()) return

    setIsAnalyzing(true)
    try {
      const backendUrl = await getBackendUrl()
      const authToken = localStorage.getItem('auth_token')

      const response = await fetch(`${backendUrl}/api/scraping/business-setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ url: websiteUrl.trim() })
      })

      const data = await response.json()
      
      if (data.success) {
        setScrapedData(data.data)
        setShowUrlInput(false)
        
        // Start first step
        await startKnowledgeBuilding(data.data)
      }
    } catch (error) {
      console.error('Website analysis failed:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Start the AI-powered knowledge building process
  const startKnowledgeBuilding = async (businessData) => {
    setSteps(prev => prev.map((step, idx) => 
      idx === 0 ? { ...step, status: 'in-progress' } : step
    ))
    
    // Show summary and start first question
    setCurrentQuestion(
      `Perfect! I analyzed your website and found:

Business: ${businessData.businessName}
Category: ${businessData.businessCategory}
Type: ${businessData.businessType}

I'll help you build customer service knowledge for your AI agent.

Let's start with your return policy. What's your current return timeframe?`
    )
  }

  // Generate AI questions for current step
  const generateStepQuestions = async (stepIndex, businessData = scrapedData) => {
    if (!businessData) return

    setIsAiThinking(true)
    try {
      const backendUrl = await getBackendUrl()
      const authToken = localStorage.getItem('auth_token')
      
      const currentStepData = steps[stepIndex]
      
      const prompt = `Generate 1 simple, direct question for ${currentStepData.title} for a ${businessData.businessCategory} business.

Business: ${businessData.businessName}
Focus: ${currentStepData.title}

Ask ONE specific question that helps build their ${currentStepData.title.toLowerCase()} policy. Keep it short and focused.

Return just the question text, no formatting.`

      const response = await fetch(`${backendUrl}/api/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          message: prompt,
          sessionId: 'brand-wizard-' + Date.now(),
          businessId: business?.id,
          source: 'brand-wizard-knowledge-building'
        })
      })

      if (response.ok) {
        const data = await response.json()
        const question = data.response.trim()
        setCurrentQuestion(question)
        
        // Update step with questions
        setSteps(prev => prev.map((step, idx) => 
          idx === stepIndex ? { ...step, aiQuestions: [question] } : step
        ))
      }
    } catch (error) {
      console.error('Error generating questions:', error)
      setCurrentQuestion(`Let's work on your ${steps[stepIndex].title}. What details should your AI agent know?`)
    } finally {
      setIsAiThinking(false)
    }
  }

  // Handle user response to AI question
  const handleUserResponse = async () => {
    if (!userInput.trim()) return

    console.log('handleUserResponse called', { userInput, currentStep, stepsLength: steps.length })
    setIsAiThinking(true)
    
    try {
      const backendUrl = await getBackendUrl()
      const authToken = localStorage.getItem('auth_token')
      
      const currentStepData = steps[currentStep]
      console.log('Current step data:', currentStepData)
      
      // Process user response and generate content
      const prompt = `You are helping build a ${currentStepData.title} knowledge base section.

User's response: "${userInput}"
Business: ${scrapedData?.businessName} (${scrapedData?.businessCategory})

Based on this response, create a comprehensive, actionable knowledge base entry for ${currentStepData.title} that an AI customer service agent can use.

Include:
1. Clear procedures/policies
2. Specific scenarios and responses
3. Escalation guidelines when needed
4. Key information for customer service

Format as a structured knowledge base entry that's ready for AI agent use.`

      console.log('Sending request to AI chat API...')
      const response = await fetch(`${backendUrl}/api/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          message: prompt,
          sessionId: 'brand-wizard-' + Date.now(),
          businessId: business?.id,
          source: 'brand-wizard-content-generation'
        })
      })

      console.log('AI chat response status:', response.status)
      if (response.ok) {
        const data = await response.json()
        console.log('AI response received:', data)
        
        // Update current step with generated content
        setSteps(prev => prev.map((step, idx) => 
          idx === currentStep ? { 
            ...step, 
            status: 'completed',
            userResponses: [...(step.userResponses || []), userInput],
            generatedContent: data.response
          } : step
        ))

        // Move to next step
        if (currentStep < steps.length - 1) {
          const nextStep = currentStep + 1
          console.log('Moving to next step:', nextStep)
          setCurrentStep(nextStep)
          setSteps(prev => prev.map((step, idx) => 
            idx === nextStep ? { ...step, status: 'in-progress' } : step
          ))
          
          setUserInput('')
          await generateStepQuestions(nextStep)
        } else {
          // All steps completed - show review stage
          console.log('All steps completed!')
          await generateFinalReview()
        }
      } else {
        console.error('AI chat response error:', response.status, response.statusText)
        const errorData = await response.text()
        console.error('Error response body:', errorData)
      }
    } catch (error) {
      console.error('Error processing response:', error)
    } finally {
      setIsAiThinking(false)
    }
  }

  // Generate final consolidated review
  const generateFinalReview = async () => {
    console.log('generateFinalReview called')
    setIsGeneratingReview(true)
    try {
      const backendUrl = await getBackendUrl()
      const authToken = localStorage.getItem('auth_token')

      // Collect all completed steps with user responses
      const completedSteps = steps.filter(step => step.status === 'completed')
      console.log('Completed steps:', completedSteps.length)
      const allResponses = completedSteps.map(step => ({
        category: step.title,
        userInput: step.userResponses?.[0] || '',
        aiGenerated: step.generatedContent || ''
      }))
      console.log('All responses:', allResponses)

      const consolidationPrompt = `Create structured knowledge base entries for ${scrapedData?.businessName}.

Categories and inputs:
${allResponses.slice(0, 3).map(resp => `${resp.category}: "${resp.userInput}"`).join('\n')}

Return JSON format:
{"category-id": {"title": "Title", "content": "Policy text", "keyPoints": ["point1"]}}

Make entries professional and AI-agent ready.`

      console.log('Sending consolidation request to AI...')
      const response = await fetch(`${backendUrl}/api/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          message: consolidationPrompt,
          sessionId: 'brand-wizard-final-' + Date.now(),
          businessId: business?.id,
          source: 'brand-wizard-final-review'
        })
      })

      console.log('Consolidation response status:', response.status)
      if (response.ok) {
        const data = await response.json()
        console.log('Consolidation response:', data)
        
        // For now, let's create a simplified structure without JSON parsing
        const knowledgeBase = {}
        completedSteps.forEach((step, index) => {
          const key = step.id
          knowledgeBase[key] = {
            title: step.title,
            content: step.generatedContent || step.userResponses?.[0] || '',
            keyPoints: []
          }
        })
        
        console.log('Created knowledge base:', knowledgeBase)
        setFinalKnowledgeBase(knowledgeBase)
        setShowFinalReview(true)
        setCurrentQuestion('')
      } else {
        console.error('Consolidation API error:', response.status, response.statusText)
        const errorText = await response.text()
        console.error('Error response:', errorText)
        
        // Fallback: create knowledge base from existing step data
        const knowledgeBase = {}
        completedSteps.forEach((step, index) => {
          const key = step.id
          knowledgeBase[key] = {
            title: step.title,
            content: step.generatedContent || step.userResponses?.[0] || '',
            keyPoints: []
          }
        })
        
        setFinalKnowledgeBase(knowledgeBase)
        setShowFinalReview(true)
        setCurrentQuestion('')
      }
    } catch (error) {
      console.error('Error generating final review:', error)
      
      // Emergency fallback: create knowledge base from existing step data
      const completedSteps = steps.filter(step => step.status === 'completed')
      const knowledgeBase = {}
      completedSteps.forEach((step, index) => {
        const key = step.id
        knowledgeBase[key] = {
          title: step.title,
          content: step.generatedContent || step.userResponses?.[0] || '',
          keyPoints: []
        }
      })
      
      setFinalKnowledgeBase(knowledgeBase)
      setShowFinalReview(true)
      setCurrentQuestion('')
    } finally {
      setIsGeneratingReview(false)
    }
  }

  // Update knowledge base section
  const updateKnowledgeSection = (sectionKey, field, value) => {
    setFinalKnowledgeBase(prev => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        [field]: value
      }
    }))
  }

  // Save final knowledge base
  const saveFinalKnowledgeBase = async () => {
    setIsGeneratingReview(true)
    try {
      const backendUrl = await getBackendUrl()
      const authToken = localStorage.getItem('auth_token')

      console.log('Saving knowledge base...', { 
        businessId: business?.id, 
        sectionsCount: Object.keys(finalKnowledgeBase).length 
      })

      const response = await fetch(`${backendUrl}/api/knowledge-base/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          businessId: business?.id,
          knowledgeBase: finalKnowledgeBase,
          additionalFeedback,
          scrapedData
        })
      })

      console.log('Save response status:', response.status)
      if (response.ok) {
        const data = await response.json()
        console.log('Knowledge base saved:', data)
        
        // Success - show success message
        setCurrentQuestion(`🎉 Knowledge base successfully saved! 
        
✅ ${data.data.sectionsCount} knowledge sections created
✅ AI agent ready for ${data.data.businessName}
✅ Saved at ${new Date(data.data.savedAt).toLocaleTimeString()}

Your AI customer service agent now has comprehensive knowledge and is ready to help customers!`)
        setShowFinalReview(false)
      } else {
        const errorData = await response.json()
        console.error('Save error:', errorData)
        alert('Failed to save knowledge base: ' + errorData.error)
      }
    } catch (error) {
      console.error('Error saving knowledge base:', error)
      alert('Failed to save knowledge base: ' + error.message)
    } finally {
      setIsGeneratingReview(false)
    }
  }

  if (authLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex">
          <Navigation />
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
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
                  <Bot className="w-6 h-6 mr-3 text-purple-600" />
                  AI Customer Service Knowledge Builder
                </h1>
                <p className="text-gray-600">Your AI assistant for building comprehensive customer service knowledge</p>
              </div>
            </div>
          </header>

          <main className="flex-1 bg-gradient-to-br from-gray-50 via-white to-gray-50 min-h-screen">
            <div className="max-w-6xl mx-auto py-8 px-6 space-y-8">
              
              {/* Website URL Input */}
              {showUrlInput && (
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="text-center max-w-2xl mx-auto">
                    <Globe className="w-12 h-12 text-purple-600 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                      Let's analyze your website first
                    </h2>
                    <p className="text-gray-600 mb-6">
                      I'll scrape your website to understand your business and then help you build a complete customer service knowledge base.
                    </p>
                    
                    <div className="flex space-x-3 max-w-md mx-auto">
                      <input
                        type="url"
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        placeholder="https://yourstore.com"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                      <button
                        onClick={handleAnalyzeWebsite}
                        disabled={!websiteUrl.trim() || isAnalyzing}
                        className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 flex items-center"
                      >
                        {isAnalyzing ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                          <Sparkles className="w-4 h-4 mr-2" />
                        )}
                        {isAnalyzing ? 'Analyzing...' : 'Start Building'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Final Review Stage */}
              {showFinalReview && (
                <div className="space-y-6">
                  <div className="bg-white rounded-lg shadow-sm border p-6">
                    <div className="text-center mb-6">
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        📋 Final Knowledge Base Review
                      </h2>
                      <p className="text-gray-600">
                        Review and edit your AI agent's knowledge base. Each section can be customized before final approval.
                      </p>
                    </div>

                    {isGeneratingReview ? (
                      <div className="text-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
                        <p className="text-gray-600">Consolidating your responses into structured knowledge base...</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {Object.entries(finalKnowledgeBase).map(([key, section]) => (
                          <div key={key} className="border border-gray-200 rounded-lg p-4">
                            <div className="mb-3">
                              <input
                                type="text"
                                value={section.title || ''}
                                onChange={(e) => updateKnowledgeSection(key, 'title', e.target.value)}
                                className="text-lg font-semibold text-gray-900 bg-transparent border-b border-gray-300 focus:border-purple-500 focus:outline-none w-full"
                              />
                            </div>
                            <div className="mb-4">
                              <textarea
                                value={section.content || ''}
                                onChange={(e) => updateKnowledgeSection(key, 'content', e.target.value)}
                                rows={6}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                                placeholder="Detailed knowledge base content for AI agent..."
                              />
                            </div>
                            {section.keyPoints && section.keyPoints.length > 0 && (
                              <div>
                                <h4 className="font-medium text-gray-900 mb-2">Key Points:</h4>
                                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                                  {section.keyPoints.map((point, idx) => (
                                    <li key={idx}>{point}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        ))}

                        {/* Additional Feedback Section */}
                        <div className="border border-gray-200 rounded-lg p-4 bg-blue-50">
                          <h3 className="text-lg font-semibold text-gray-900 mb-3">
                            💬 Additional Feedback or Instructions
                          </h3>
                          <textarea
                            value={additionalFeedback}
                            onChange={(e) => setAdditionalFeedback(e.target.value)}
                            rows={4}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Any additional instructions, special policies, or feedback for your AI agent? (Optional)"
                          />
                        </div>

                        {/* Action Buttons */}
                        <div className="flex space-x-4 pt-4">
                          <button
                            onClick={saveFinalKnowledgeBase}
                            disabled={isGeneratingReview}
                            className="flex-1 bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 font-medium disabled:opacity-50 flex items-center justify-center"
                          >
                            {isGeneratingReview ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                Saving...
                              </>
                            ) : (
                              '✅ Approve & Save Knowledge Base'
                            )}
                          </button>
                          <button
                            onClick={() => setShowFinalReview(false)}
                            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                          >
                            ← Back to Building
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Knowledge Building Process */}
              {!showUrlInput && !showFinalReview && (
                <div className="space-y-6">
                  
                  {/* Top Progress Stepper */}
                  <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 backdrop-blur-sm bg-white/90">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-semibold text-gray-800">Progress: {currentStep + 1} of {steps.length}</h3>
                      <span className="text-sm font-medium text-purple-600 bg-purple-50 px-3 py-1 rounded-full">{Math.round(((currentStep + 1) / steps.length) * 100)}% Complete</span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-100 rounded-full h-3 mb-6 shadow-inner">
                      <div 
                        className="bg-gradient-to-r from-purple-500 via-purple-600 to-purple-700 h-3 rounded-full transition-all duration-700 shadow-sm"
                        style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                      />
                    </div>
                    
                    {/* Mini Progress Stepper (3 steps visible) */}
                    <div className="flex items-center justify-center">
                      {/* Show previous step if exists */}
                      {currentStep > 0 && (
                        <>
                          <div className="flex flex-col items-center text-green-600">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold bg-gradient-to-br from-green-400 to-green-600 text-white shadow-lg">
                              ✓
                            </div>
                            <span className="text-xs mt-2 max-w-[70px] text-center font-medium text-gray-700">{steps[currentStep - 1]?.title}</span>
                          </div>
                          <div className="h-1 w-12 mx-3 bg-gradient-to-r from-green-400 to-purple-400 rounded-full" />
                        </>
                      )}
                      
                      {/* Current step */}
                      <div className="flex flex-col items-center text-purple-600">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold bg-gradient-to-br from-purple-500 to-purple-700 text-white ring-4 ring-purple-100 shadow-lg transform scale-110">
                          {currentStep + 1}
                        </div>
                        <span className="text-sm mt-2 max-w-[90px] text-center font-semibold text-gray-800">{steps[currentStep]?.title}</span>
                      </div>
                      
                      {/* Show next step if exists */}
                      {currentStep < steps.length - 1 && (
                        <>
                          <div className="h-1 w-12 mx-3 bg-gray-200 rounded-full" />
                          <div className="flex flex-col items-center text-gray-500">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold bg-gray-100 text-gray-600 border-2 border-gray-200 shadow-sm">
                              {currentStep + 2}
                            </div>
                            <span className="text-xs mt-2 max-w-[70px] text-center">{steps[currentStep + 1]?.title}</span>
                          </div>
                        </>
                      )}
                      
                      {/* Show "..." if more steps exist */}
                      {currentStep < steps.length - 2 && (
                        <>
                          <div className="h-1 w-8 mx-2 bg-gray-200 rounded-full" />
                          <div className="flex flex-col items-center text-gray-400">
                            <div className="text-lg">⋯</div>
                            <div className="text-xs text-gray-500 mt-1 bg-gray-50 px-2 py-1 rounded-full">{steps.length - currentStep - 2} more</div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Main Content Area - Single Column */}
                  <div className="max-w-4xl mx-auto">
                    {/* AI Assistant Chat */}
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden backdrop-blur-sm bg-white/95">
                      {/* Enhanced Header */}
                      <div className="bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 text-white p-6 relative overflow-hidden">
                        {/* Background Pattern */}
                        <div className="absolute inset-0 opacity-10">
                          <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full -translate-x-16 -translate-y-16"></div>
                          <div className="absolute bottom-0 right-0 w-24 h-24 bg-white rounded-full translate-x-12 translate-y-12"></div>
                        </div>
                        
                        <div className="relative flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                              <Bot className="w-6 h-6 text-white" />
                            </div>
                            <div>
                              <h3 className="text-xl font-semibold">{steps[currentStep]?.title}</h3>
                              <p className="text-purple-100 text-sm">AI Knowledge Assistant</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-purple-100 bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                              Question {currentStep + 1} of {steps.length}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Chat Body */}
                      <div className="p-10">
                        {/* Current Question */}
                        <div className="mb-10">
                          {isAiThinking ? (
                            <div className="flex items-center justify-center space-x-3 text-purple-600 bg-purple-50 rounded-2xl p-6">
                              <Loader2 className="w-6 h-6 animate-spin" />
                              <span className="text-lg font-medium">Preparing your next question...</span>
                            </div>
                          ) : (
                            <div className="text-center">
                              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl mb-6">
                                <span className="text-2xl">💭</span>
                              </div>
                              <p className="text-gray-900 text-2xl font-medium leading-relaxed mb-6 max-w-3xl mx-auto">{currentQuestion}</p>
                              {currentStep === 0 && (
                                <div className="text-base text-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100 max-w-2xl mx-auto">
                                  <div className="flex items-start space-x-3">
                                    <span className="text-2xl">💡</span>
                                    <div>
                                      <p className="font-semibold text-gray-900 mb-1">Pro Tip</p>
                                      <p>Be specific about your policies. This helps your AI give accurate answers to customers.</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* User Input Area */}
                        {currentQuestion && !isAiThinking && currentStep < steps.length && (
                          <div className="max-w-3xl mx-auto space-y-8">
                            <div className="relative">
                              <textarea
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                placeholder="Share your response here..."
                                rows={5}
                                className="w-full px-6 py-5 border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-purple-100 focus:border-purple-400 text-lg resize-none bg-gray-50/50 backdrop-blur-sm transition-all duration-300 placeholder-gray-400"
                              />
                              <div className="absolute top-4 right-4">
                                <span className="text-3xl opacity-20">✍️</span>
                              </div>
                            </div>
                            
                            {/* Action Button */}
                            <div className="flex justify-center">
                              <button
                                onClick={() => {
                                  console.log('Continue Building button clicked')
                                  handleUserResponse()
                                }}
                                disabled={!userInput.trim() || isAiThinking}
                                className="group px-12 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg shadow-purple-200"
                              >
                                {isAiThinking ? (
                                  <>
                                    <Loader2 className="w-5 h-5 animate-spin mr-3" />
                                    Processing...
                                  </>
                                ) : (
                                  <div className="flex items-center">
                                    Continue Building
                                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                                  </div>
                                )}
                              </button>
                            </div>
                            
                            {/* Subtle Progress Hint */}
                            <div className="text-center">
                              <p className="text-gray-500 text-sm">
                                {currentStep < steps.length - 1 ? (
                                  <>Next: <span className="font-medium text-gray-700">{steps[currentStep + 1]?.title}</span></>
                                ) : (
                                  <span className="text-green-600 font-medium">🎉 Final question! You're almost done!</span>
                                )}
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Completion State */}
                        {currentStep >= steps.length && (
                          <div className="text-center py-8">
                            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-gray-900 mb-2">
                              Knowledge Base Complete!
                            </h3>
                            <p className="text-gray-600 mb-6">
                              Your AI agent now has comprehensive customer service knowledge
                            </p>
                            <button className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center mx-auto">
                              Configure AI Agent
                              <ChevronRight className="w-4 h-4 ml-2" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}