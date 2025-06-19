"use client"

import { useState, useEffect } from "react"
import { 
  Sparkles,
  Building,
  Users,
  MessageSquare,
  Target,
  Globe,
  Shield,
  ChevronRight,
  ChevronLeft,
  Loader2,
  CheckCircle,
  AlertCircle,
  Bot,
  Send,
  RefreshCw
} from "lucide-react"
import Navigation from "@/components/Navigation"
import { useAuth } from "@/contexts/AuthContext"
import ProtectedRoute from "@/components/ProtectedRoute"
import { getBackendUrl } from "@/utils/config"
import { useRouter } from 'next/navigation'

interface BrandStep {
  id: string
  title: string
  description: string
  icon: any
  fields: BrandField[]
}

interface BrandField {
  id: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'radio'
  value: string
  placeholder?: string
  options?: string[]
  required?: boolean
}

export default function BrandWizardPage() {
  const { business, user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [currentAiQuestion, setCurrentAiQuestion] = useState("Tell me more about your business to help configure your brand.")
  const [userInput, setUserInput] = useState("")
  const [brandData, setBrandData] = useState<Record<string, any>>({})
  const [completedSteps, setCompletedSteps] = useState<string[]>([])

  // Define brand configuration steps
  const brandSteps: BrandStep[] = [
    {
      id: 'basic-info',
      title: 'Basic Business Information',
      description: 'Core details about your business',
      icon: Building,
      fields: [
        { id: 'businessName', label: 'Business Name', type: 'text', value: '', required: true },
        { id: 'tagline', label: 'Business Tagline', type: 'text', value: '', placeholder: 'Your catchy business phrase' },
        { id: 'description', label: 'Business Description', type: 'textarea', value: '', required: true },
        { id: 'foundedYear', label: 'Founded Year', type: 'text', value: '', placeholder: 'e.g., 2020' },
        { id: 'headquarters', label: 'Headquarters Location', type: 'text', value: '' }
      ]
    },
    {
      id: 'brand-voice',
      title: 'Brand Voice & Personality',
      description: 'How your brand communicates',
      icon: MessageSquare,
      fields: [
        { 
          id: 'voiceTone', 
          label: 'Brand Voice Tone', 
          type: 'radio', 
          value: '',
          options: ['Professional', 'Friendly', 'Casual', 'Authoritative', 'Playful', 'Empathetic'],
          required: true 
        },
        { 
          id: 'communicationStyle', 
          label: 'Communication Style', 
          type: 'radio', 
          value: '',
          options: ['Formal', 'Conversational', 'Technical', 'Simple', 'Storytelling'],
          required: true 
        },
        { id: 'brandPersonality', label: 'Brand Personality Traits', type: 'textarea', value: '', placeholder: 'e.g., Innovative, Trustworthy, Customer-focused' },
        { id: 'avoidPhrases', label: 'Phrases to Avoid', type: 'textarea', value: '', placeholder: 'Words or phrases that don\'t align with your brand' }
      ]
    },
    {
      id: 'target-audience',
      title: 'Target Audience',
      description: 'Who your customers are',
      icon: Users,
      fields: [
        { id: 'primaryAudience', label: 'Primary Target Audience', type: 'textarea', value: '', required: true },
        { id: 'ageRange', label: 'Typical Age Range', type: 'text', value: '', placeholder: 'e.g., 25-45' },
        { id: 'customerNeeds', label: 'Key Customer Needs', type: 'textarea', value: '', placeholder: 'What problems do you solve?' },
        { id: 'customerPainPoints', label: 'Customer Pain Points', type: 'textarea', value: '' }
      ]
    },
    {
      id: 'values-mission',
      title: 'Values & Mission',
      description: 'What your brand stands for',
      icon: Target,
      fields: [
        { id: 'mission', label: 'Mission Statement', type: 'textarea', value: '', required: true },
        { id: 'vision', label: 'Vision Statement', type: 'textarea', value: '' },
        { id: 'coreValues', label: 'Core Values', type: 'textarea', value: '', placeholder: 'List your key values' },
        { id: 'uniqueProposition', label: 'Unique Value Proposition', type: 'textarea', value: '', required: true }
      ]
    },
    {
      id: 'products-services',
      title: 'Products & Services',
      description: 'What you offer',
      icon: Globe,
      fields: [
        { id: 'mainProducts', label: 'Main Products/Services', type: 'textarea', value: '', required: true },
        { id: 'pricingTier', label: 'Pricing Tier', type: 'radio', value: '', options: ['Budget', 'Mid-range', 'Premium', 'Luxury'] },
        { id: 'deliveryMethod', label: 'Delivery Method', type: 'radio', value: '', options: ['Physical Products', 'Digital Products', 'Services', 'Hybrid'] },
        { id: 'specialties', label: 'Specialties or Unique Features', type: 'textarea', value: '' }
      ]
    },
    {
      id: 'policies-support',
      title: 'Policies & Customer Support',
      description: 'How you handle customer interactions',
      icon: Shield,
      fields: [
        { id: 'returnPolicy', label: 'Return Policy Summary', type: 'textarea', value: '' },
        { id: 'shippingPolicy', label: 'Shipping Policy Summary', type: 'textarea', value: '' },
        { id: 'supportHours', label: 'Customer Support Hours', type: 'text', value: '', placeholder: 'e.g., Mon-Fri 9AM-6PM EST' },
        { id: 'responseTime', label: 'Typical Response Time', type: 'text', value: '', placeholder: 'e.g., Within 24 hours' },
        { id: 'supportChannels', label: 'Support Channels', type: 'textarea', value: '', placeholder: 'e.g., Email, Chat, Phone' }
      ]
    }
  ]

  // Handle field changes
  const handleFieldChange = (fieldId: string, value: string) => {
    setBrandData(prev => ({ ...prev, [fieldId]: value }))
  }

  // Check if current step is complete
  const isStepComplete = () => {
    const currentStepData = brandSteps[currentStep]
    const requiredFields = currentStepData.fields.filter(f => f.required)
    return requiredFields.every(field => brandData[field.id]?.trim())
  }

  // Navigation
  const handleNext = () => {
    if (isStepComplete()) {
      const currentStepId = brandSteps[currentStep].id
      setCompletedSteps(prev => [...new Set([...prev, currentStepId])])
      
      if (currentStep < brandSteps.length - 1) {
        setCurrentStep(currentStep + 1)
      }
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    router.push('/settings')
  }

  // Show loading only while authenticating
  if (authLoading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex">
          <Navigation />
          <div className="flex-1 ml-64 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  const currentStepData = brandSteps[currentStep]
  const StepIcon = currentStepData?.icon
  const progress = ((currentStep + 1) / brandSteps.length) * 100

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
                  <Sparkles className="w-6 h-6 mr-3 text-purple-600" />
                  AI Brand Configuration Wizard
                </h1>
                <p className="text-gray-600">Interactive brand setup powered by AI - Step {currentStep + 1} of {brandSteps.length}</p>
              </div>
            </div>
          </header>

          <main className="flex-1 p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              
              {/* Test Content */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Simple Test Content</h2>
                <p className="text-gray-600">This should be centered exactly like business-setting page.</p>
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    If this content appears centered (not pushed to the left), then the structure is correct.
                  </p>
                </div>
              </div>

              {/* Original Form Section - commented out for testing
              <div className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                      <StepIcon className="w-5 h-5 mr-2 text-purple-600" />
                      {currentStepData.title}
                    </h2>
                    <p className="text-gray-600 mt-1">
                      {currentStepData.description}
                    </p>
                  </div>

                  <div className="space-y-4">
                    {currentStepData.fields.map((field) => (
                      <div key={field.id} className="space-y-2">
                        <label htmlFor={field.id} className="block text-sm font-medium text-gray-700">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        
                        {field.type === 'text' && (
                          <input
                            id={field.id}
                            type="text"
                            value={brandData[field.id] || ''}
                            onChange={(e) => handleFieldChange(field.id, e.target.value)}
                            placeholder={field.placeholder}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        )}
                        
                        {field.type === 'textarea' && (
                          <textarea
                            id={field.id}
                            value={brandData[field.id] || ''}
                            onChange={(e) => handleFieldChange(field.id, e.target.value)}
                            placeholder={field.placeholder}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        )}
                        
                        {field.type === 'radio' && (
                          <div className="grid grid-cols-2 gap-2">
                            {field.options?.map((option) => (
                              <label key={option} className="flex items-center space-x-2 cursor-pointer">
                                <input
                                  type="radio"
                                  name={field.id}
                                  value={option}
                                  checked={brandData[field.id] === option}
                                  onChange={() => handleFieldChange(field.id, option)}
                                  className="text-purple-600 focus:ring-purple-500"
                                />
                                <span className="text-sm text-gray-700">{option}</span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Navigation Buttons */}
                  <div className="flex justify-between pt-6 mt-6 border-t border-gray-200">
                    <button
                      onClick={handlePrevious}
                      disabled={currentStep === 0}
                      className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4 mr-2" />
                      Previous
                    </button>
                    
                    {currentStep === brandSteps.length - 1 ? (
                      <button 
                        onClick={handleComplete} 
                        disabled={!isStepComplete()}
                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Complete Setup
                        <CheckCircle className="w-4 h-4 ml-2" />
                      </button>
                    ) : (
                      <button 
                        onClick={handleNext} 
                        disabled={!isStepComplete()}
                        className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </button>
                    )}
                  </div>
              </div>

              {/* AI Assistant Section */}
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <Bot className="w-5 h-5 mr-2 text-purple-600" />
                      AI Assistant
                    </h3>
                    <p className="text-gray-600 text-sm mt-1">
                      Let me help you configure your brand
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    {/* AI Question */}
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <p className="text-sm font-medium text-purple-900">
                        {currentAiQuestion}
                      </p>
                    </div>
                    
                    {/* User Input */}
                    <div className="space-y-2">
                      <textarea
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder="Type your answer here..."
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                      />
                      <button
                        disabled={!userInput.trim() || aiLoading}
                        className="w-full flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {aiLoading ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4 mr-2" />
                        )}
                        Send to AI
                      </button>
                    </div>

                    {/* AI Tips */}
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <div className="flex items-start">
                        <Sparkles className="h-4 w-4 text-blue-600 mt-0.5 mr-2" />
                        <p className="text-sm text-blue-800">
                          <strong>AI Tip:</strong> The more details you provide, the better I can help configure your brand voice and personality.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress Overview */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Configuration Progress</h3>
                  <div className="space-y-2">
                    {brandSteps.map((step, idx) => {
                      const Icon = step.icon
                      const isComplete = completedSteps.includes(step.id)
                      const isCurrent = idx === currentStep
                      
                      return (
                        <div
                          key={step.id}
                          className={`flex items-center space-x-2 text-sm ${
                            isCurrent ? 'text-purple-600 font-medium' : 
                            isComplete ? 'text-green-600' : 'text-gray-400'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{step.title}</span>
                          {isComplete && <CheckCircle className="w-4 h-4 ml-auto" />}
                        </div>
                      )
                    })}
                  </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}