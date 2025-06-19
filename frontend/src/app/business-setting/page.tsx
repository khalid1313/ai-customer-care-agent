"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Globe, 
  Search, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Play, 
  ExternalLink,
  Building,
  Users,
  Phone,
  Mail,
  MapPin
} from "lucide-react"
import Navigation from "@/components/Navigation"
import { useAuth } from "@/contexts/AuthContext"
import ProtectedRoute from "@/components/ProtectedRoute"
import { getBackendUrl } from "@/utils/config"
import { useRouter } from 'next/navigation'

interface FooterPage {
  url: string
  text: string
  category: string
}

interface AnalysisResult {
  success: boolean
  data: {
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
    extractedAt: string
    readyForSetup: boolean
  }
  summary: {
    businessName: string
    businessCategory: string
    industry: string
    footerPagesFound: number
    importantPagesFound: number
    readyForSetup: boolean
  }
}

export default function BusinessSettingPage() {
  const { business, user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [targetUrl, setTargetUrl] = useState('')
  const [error, setError] = useState('')

  // Load existing business data when component mounts
  useEffect(() => {
    const loadExistingData = async () => {
      if (!business?.id) return
      
      try {
        const backendUrl = await getBackendUrl()
        const authToken = localStorage.getItem('auth_token')
        
        if (!authToken) return

        // Try to get existing business context data
        const response = await fetch(`${backendUrl}/api/business/${business.id}/context`, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        })

        if (response.ok) {
          const contextData = await response.json()
          
          if (contextData.success && contextData.data) {
            // Transform context data to match our AnalysisResult format
            const businessInfo = JSON.parse(contextData.data.businessInfo || '{}')
            const contactInfo = JSON.parse(contextData.data.contactInfo || '{}')
            const serviceInfo = JSON.parse(contextData.data.serviceInfo || '{}')
            
            const analysisResult: AnalysisResult = {
              success: true,
              data: {
                businessName: businessInfo.name || 'Unknown Business',
                businessCategory: businessInfo.category || 'Unknown',
                industry: businessInfo.industry || 'Unknown',
                businessType: businessInfo.businessType || 'Unknown',
                platform: businessInfo.platform || 'Unknown',
                description: businessInfo.description || '',
                website: contactInfo.website || '',
                footerPages: serviceInfo.footerPages || { policies: [], legal: [], support: [], company: [], resources: [], other: [] },
                importantPages: serviceInfo.importantPages || [],
                extractedAt: contactInfo.extractedAt || new Date().toISOString(),
                readyForSetup: serviceInfo.readyForSetup || false
              },
              summary: {
                businessName: businessInfo.name || 'Unknown Business',
                businessCategory: businessInfo.category || 'Unknown',
                industry: businessInfo.industry || 'Unknown',
                footerPagesFound: Object.values(serviceInfo.footerPages || {}).reduce((total: number, pages: any) => total + (pages?.length || 0), 0),
                importantPagesFound: (serviceInfo.importantPages || []).length,
                readyForSetup: serviceInfo.readyForSetup || false
              }
            }
            
            setAnalysisResult(analysisResult)
            setTargetUrl(contactInfo.website || '')
            console.log('Loaded existing business data:', analysisResult)
          }
        }
      } catch (error) {
        console.error('Error loading existing business data:', error)
      }
    }

    loadExistingData()
  }, [business?.id])

  const startAnalysis = async () => {
    if (!targetUrl.trim() || !business?.id) return
    
    try {
      setIsAnalyzing(true)
      setError('')
      
      const backendUrl = await getBackendUrl()
      const authToken = localStorage.getItem('auth_token')
      
      if (!authToken) {
        throw new Error('No authentication token found')
      }

      const response = await fetch(`${backendUrl}/api/scraping/business-setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          url: targetUrl.trim()
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`)
      }
      
      if (data.success) {
        setAnalysisResult(data)
      } else {
        throw new Error(data.error || 'Analysis failed')
      }
      
    } catch (error: any) {
      console.error('Error analyzing business:', error)
      setError(error.message || 'Failed to analyze business website')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'restaurant/food service': return '🍽️'
      case 'retail/e-commerce': return '🛍️'
      case 'healthcare/medical': return '🏥'
      case 'technology/software': return '💻'
      case 'professional services': return '💼'
      case 'education/training': return '🎓'
      case 'real estate': return '🏠'
      case 'automotive': return '🚗'
      case 'beauty/wellness': return '💅'
      case 'home services': return '🔧'
      case 'travel/tourism': return '✈️'
      case 'entertainment/events': return '🎭'
      case 'non-profit/organization': return '🤝'
      case 'manufacturing/industrial': return '🏭'
      case 'finance/insurance': return '💰'
      default: return '🏢'
    }
  }

  const getBusinessTypeColor = (type: string) => {
    switch (type) {
      case 'B2B': return 'bg-blue-100 text-blue-800'
      case 'B2C': return 'bg-green-100 text-green-800'
      default: return 'bg-purple-100 text-purple-800'
    }
  }

  const handleConfigureAgent = () => {
    // Save the business analysis data to localStorage for the agent configuration
    if (analysisResult) {
      localStorage.setItem('business_analysis', JSON.stringify(analysisResult.data))
      
      // Show success message with business info
      const category = analysisResult.data?.businessCategory || 'Unknown'
      const products = analysisResult.data?.productsServices?.slice(0, 3).join(', ') || 'Not specified'
      const shouldHelp = analysisResult.data?.agentScope?.should_help_with?.slice(0, 2).join(', ') || 'General inquiries'
      
      alert(`✅ Business analysis saved! 

Your AI agent now knows:
• Business Category: ${category}
• Products/Services: ${products}
• Should help with: ${shouldHelp}

This information is now available for your AI agent configuration.`)
    }
  }

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
                  <Building className="w-6 h-6 mr-3 text-purple-600" />
                  Business Setting
                </h1>
                <p className="text-gray-600">Analyze your website to configure your AI customer care agent</p>
              </div>
            </div>
          </header>

          <main className="flex-1 p-6">
            <div className="max-w-4xl mx-auto space-y-6">
              
              {/* Start Analysis */}
              {!analysisResult && (
                <Card>
                  <CardHeader>
                    <CardTitle>Analyze Your Business Website</CardTitle>
                    <CardDescription>
                      Enter your website URL to automatically detect your business category and important pages
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
                            placeholder="https://yourwebsite.com"
                            value={targetUrl}
                            onChange={(e) => setTargetUrl(e.target.value)}
                            className="flex-1"
                          />
                          <Button 
                            onClick={startAnalysis}
                            disabled={!targetUrl.trim() || isAnalyzing}
                            className="px-6"
                          >
                            {isAnalyzing ? (
                              <div className="flex items-center">
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                                Analyzing...
                              </div>
                            ) : (
                              <div className="flex items-center">
                                <Search className="w-4 h-4 mr-2" />
                                Analyze Website
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
                      
                      <div className="text-sm text-gray-600">
                        <p className="mb-2"><strong>What we'll analyze:</strong></p>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          <li>Business category and industry type</li>
                          <li>Footer pages (policies, support, company info)</li>
                          <li>Navigation structure and important pages</li>
                          <li>Platform detection (Shopify, WordPress, etc.)</li>
                          <li>Business type (B2B vs B2C)</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Analysis Results */}
              {analysisResult && (
                <div className="space-y-6">
                  
                  {/* Business Overview */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center">
                            <Globe className="w-5 h-5 mr-2" />
                            {analysisResult.data?.businessName || 'Unknown Business'}
                          </CardTitle>
                          <CardDescription>
                            {analysisResult.data?.website || ''}
                          </CardDescription>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={analysisResult.data?.readyForSetup ? "default" : "secondary"}>
                            {analysisResult.data?.readyForSetup ? "Ready for Setup" : "Needs Review"}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAnalysisResult(null)}
                          >
                            Analyze Different Site
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        
                        {/* Business Category */}
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                          <div className="text-3xl mb-2">
                            {getCategoryIcon(analysisResult.data?.businessCategory || 'General Business')}
                          </div>
                          <h3 className="font-medium text-gray-900">Business Category</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {analysisResult.data?.businessCategory || 'General Business'}
                          </p>
                        </div>

                        {/* Industry */}
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                          <div className="text-3xl mb-2">🏭</div>
                          <h3 className="font-medium text-gray-900">Industry</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {analysisResult.data?.industry || 'Other'}
                          </p>
                        </div>

                        {/* Business Type */}
                        <div className="text-center p-4 bg-gray-50 rounded-lg">
                          <div className="text-3xl mb-2">
                            {analysisResult.data.businessType === 'B2B' ? '🏢' : 
                             analysisResult.data?.businessType === 'B2C' ? '👥' : '🔄'}
                          </div>
                          <h3 className="font-medium text-gray-900">Business Type</h3>
                          <Badge className={getBusinessTypeColor(analysisResult.data?.businessType || 'B2B/B2C')}>
                            {analysisResult.data?.businessType || 'B2B/B2C'}
                          </Badge>
                        </div>
                      </div>

                      {analysisResult.data?.description && (
                        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                          <h4 className="font-medium text-gray-900 mb-2">Business Description</h4>
                          <p className="text-sm text-gray-700">{analysisResult.data?.description}</p>
                        </div>
                      )}

                      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Platform:</span> {analysisResult.data?.platform || 'Unknown'}
                        </div>
                        <div>
                          <span className="font-medium">Pages Found:</span> {(analysisResult.summary?.footerPagesFound || 0) + (analysisResult.summary?.importantPagesFound || 0)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Footer Pages */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Footer Pages Found</CardTitle>
                      <CardDescription>
                        Important pages discovered in your website footer
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {Object.entries(analysisResult.data?.footerPages || {}).map(([category, pages]) => (
                          pages.length > 0 && (
                            <div key={category} className="p-4 border rounded-lg">
                              <h4 className="font-medium text-gray-900 mb-2 capitalize">
                                {category} ({pages.length})
                              </h4>
                              <div className="space-y-1">
                                {pages.slice(0, 3).map((page, idx) => (
                                  <div key={idx} className="flex items-center text-sm">
                                    <ExternalLink className="w-3 h-3 mr-2 text-gray-400" />
                                    <span className="truncate">{page.text}</span>
                                  </div>
                                ))}
                                {pages.length > 3 && (
                                  <div className="text-xs text-gray-500">
                                    +{pages.length - 3} more
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Important Pages */}
                  {(analysisResult.data?.importantPages?.length || 0) > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Navigation Pages</CardTitle>
                        <CardDescription>
                          Important pages found in navigation menus
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {(analysisResult.data?.importantPages || []).slice(0, 10).map((page, idx) => (
                            <div key={idx} className="flex items-center p-2 text-sm border rounded">
                              <ExternalLink className="w-3 h-3 mr-2 text-gray-400" />
                              <span className="truncate">{page.text}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* AI Agent Scope */}
                  {analysisResult.data?.agentScope && (
                    <Card>
                      <CardHeader>
                        <CardTitle>AI Agent Configuration</CardTitle>
                        <CardDescription>
                          Based on your business analysis, here's what your AI agent should handle
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          
                          {/* Products/Services */}
                          {analysisResult.data?.productsServices && analysisResult.data.productsServices.length > 0 && (
                            <div>
                              <h4 className="font-medium text-gray-900 mb-2">Products & Services</h4>
                              <div className="space-y-1">
                                {analysisResult.data.productsServices.slice(0, 5).map((item, idx) => (
                                  <div key={idx} className="flex items-center text-sm">
                                    <CheckCircle className="w-3 h-3 mr-2 text-green-500" />
                                    <span>{item}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Agent Scope */}
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">AI Agent Scope</h4>
                            <div className="space-y-2">
                              {analysisResult.data?.agentScope?.should_help_with && (
                                <div>
                                  <span className="text-xs text-green-600 font-medium">SHOULD HELP WITH:</span>
                                  <div className="text-xs text-gray-600 mt-1">
                                    {analysisResult.data.agentScope.should_help_with.join(', ')}
                                  </div>
                                </div>
                              )}
                              {analysisResult.data?.agentScope?.should_not_help_with && analysisResult.data.agentScope.should_not_help_with.length > 0 && (
                                <div>
                                  <span className="text-xs text-red-600 font-medium">SHOULD NOT HELP WITH:</span>
                                  <div className="text-xs text-gray-600 mt-1">
                                    {analysisResult.data.agentScope.should_not_help_with.join(', ')}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Category Analysis Details */}
                        {analysisResult.data?.categoryReasoning && (
                          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-blue-900">Category Analysis</span>
                              {analysisResult.data?.categoryConfidence && (
                                <Badge variant="outline" className="text-blue-700">
                                  {Math.round(analysisResult.data.categoryConfidence * 100)}% confidence
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-blue-800">{analysisResult.data.categoryReasoning}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Next Steps */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Next Steps</CardTitle>
                      <CardDescription>
                        Your business analysis is complete. Configure your AI agent settings.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex space-x-4">
                        <Button className="flex-1" onClick={handleConfigureAgent}>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Configure AI Agent
                        </Button>
                        <Button variant="outline">
                          <FileText className="w-4 h-4 mr-2" />
                          View Full Report
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}