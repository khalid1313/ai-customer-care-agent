"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Bot, Database, Globe, Loader2, MessageSquare, Package, Plus, Settings, ShoppingBag, Store, Zap, Brain, TrendingUp, Edit2, Save, X, CheckCircle, AlertCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Navigation from "@/components/Navigation"
import ProtectedRoute from "@/components/ProtectedRoute"
import { useAuth } from "@/contexts/AuthContext"
import { getBackendUrl } from "@/utils/config"

export default function IntegrationsPage() {
  const { business } = useAuth()
  const router = useRouter()
  const [integrations, setIntegrations] = useState<Record<string, { connected: boolean; [key: string]: unknown }>>({})
  const [loading, setLoading] = useState(true)
  const [shopifyModal, setShopifyModal] = useState(false)
  const [pineconeModal, setPineconeModal] = useState(false)
  const [syncing, setSyncing] = useState(false)
  
  // Form states
  const [shopifyForm, setShopifyForm] = useState({ domain: "", apiKey: "", accessToken: "" })
  const [pineconeForm, setPineconeForm] = useState({ apiKey: "", environment: "", namespace: "", indexName: "" })
  
  // Edit states
  const [editingShopify, setEditingShopify] = useState(false)
  const [editingPinecone, setEditingPinecone] = useState(false)
  const [editShopifyForm, setEditShopifyForm] = useState({ domain: "", apiKey: "", accessToken: "" })
  const [editPineconeForm, setEditPineconeForm] = useState({ apiKey: "", environment: "", namespace: "", indexName: "" })
  
  // Notification state
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | null }>({ message: '', type: null })

  useEffect(() => {
    fetchBusinessDetails()
  }, [business?.id])

  const fetchBusinessDetails = async () => {
    if (!business?.id) return
    
    try {
      const backendUrl = await getBackendUrl()
      const response = await fetch(`${backendUrl}/api/business/${business.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        setIntegrations(data.business.integrations?.status || {})
      }
    } catch (error) {
      console.error("Error fetching business details:", error)
    } finally {
      setLoading(false)
    }
  }

  // Notification functions
  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type })
    setTimeout(() => {
      setNotification({ message: '', type: null })
    }, 5000) // Auto-hide after 5 seconds
  }

  const handleShopifyConnect = async () => {
    try {
      setLoading(true)
      const backendUrl = await getBackendUrl()
      const response = await fetch(`${backendUrl}/api/business/${business?.id}/integrations/shopify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(shopifyForm)
      })
      
      const data = await response.json()
      if (response.ok) {
        showNotification('Shopify connected successfully!', 'success')
        setShopifyModal(false)
        fetchBusinessDetails()
      } else {
        showNotification(`Failed to connect: ${data.error}`, 'error')
      }
    } catch {
      showNotification('Connection failed. Please check your credentials.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handlePineconeConnect = async () => {
    try {
      setLoading(true)
      const backendUrl = await getBackendUrl()
      const response = await fetch(`${backendUrl}/api/business/${business?.id}/integrations/pinecone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(pineconeForm)
      })
      
      const data = await response.json()
      if (response.ok) {
        showNotification('Pinecone connected successfully!', 'success')
        setPineconeModal(false)
        fetchBusinessDetails()
      } else {
        showNotification(`Failed to connect: ${data.error}`, 'error')
      }
    } catch {
      showNotification('Connection failed. Please check your settings.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSyncProducts = async () => {
    try {
      setSyncing(true)
      const backendUrl = await getBackendUrl()
      const response = await fetch(`${backendUrl}/api/business/${business?.id}/sync/products`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })
      
      const data = await response.json()
      if (response.ok) {
        showNotification(`Successfully synced ${data.synced.products} products!`, 'success')
        fetchBusinessDetails()
      } else {
        showNotification(`Sync failed: ${data.error}`, 'error')
      }
    } catch {
      showNotification('Product sync failed.', 'error')
    } finally {
      setSyncing(false)
    }
  }

  const handleEditShopify = () => {
    const config = integrations.shopify
    setEditShopifyForm({
      domain: config?.domain || '',
      apiKey: config?.apiKey || '',
      accessToken: config?.accessToken || ''
    })
    setEditingShopify(true)
  }

  const handleEditPinecone = () => {
    const config = integrations.pinecone
    setEditPineconeForm({
      apiKey: config?.apiKey || '',
      environment: config?.environment || '',
      namespace: config?.namespace || '',
      indexName: config?.indexName || ''
    })
    setEditingPinecone(true)
  }

  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionTestResult, setConnectionTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleTestShopifyConnection = async () => {
    try {
      setTestingConnection(true)
      setConnectionTestResult(null)
      const backendUrl = await getBackendUrl()
      const response = await fetch(`${backendUrl}/api/business/${business?.id}/integrations/shopify/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(editShopifyForm)
      })
      
      const data = await response.json()
      if (response.ok) {
        setConnectionTestResult({ success: true, message: data.message || 'Connection successful!' })
        showNotification('✅ Shopify connection test successful!', 'success')
      } else {
        setConnectionTestResult({ success: false, message: data.error || 'Connection failed' })
        showNotification(`❌ Connection failed: ${data.error}`, 'error')
      }
    } catch {
      setConnectionTestResult({ success: false, message: 'Network error during test' })
      showNotification('❌ Connection test failed. Please check your network.', 'error')
    } finally {
      setTestingConnection(false)
    }
  }

  const handleSaveShopify = async () => {
    try {
      setLoading(true)
      const backendUrl = await getBackendUrl()
      const response = await fetch(`${backendUrl}/api/business/${business?.id}/integrations/shopify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(editShopifyForm)
      })
      
      const data = await response.json()
      if (response.ok) {
        showNotification('Shopify configuration updated successfully!', 'success')
        setEditingShopify(false)
        setConnectionTestResult(null)
        fetchBusinessDetails()
      } else {
        showNotification(`Failed to update: ${data.error}`, 'error')
      }
    } catch {
      showNotification('Update failed. Please check your credentials.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSavePinecone = async () => {
    try {
      setLoading(true)
      const backendUrl = await getBackendUrl()
      const response = await fetch(`${backendUrl}/api/business/${business?.id}/integrations/pinecone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(editPineconeForm)
      })
      
      const data = await response.json()
      if (response.ok) {
        showNotification('Pinecone configuration updated successfully!', 'success')
        setEditingPinecone(false)
        fetchBusinessDetails()
      } else {
        showNotification(`Failed to update: ${data.error}`, 'error')
      }
    } catch {
      showNotification('Update failed. Please check your settings.', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Business integrations for data and AI
  const businessIntegrations = [
    {
      id: "shopify",
      name: "Shopify",
      description: "Connect your Shopify store for live product data and order management",
      icon: ShoppingBag,
      status: integrations.shopify?.connected ? "connected" : "not_connected",
      color: "from-green-600 to-emerald-600",
      features: ["Live product sync", "Order tracking", "Inventory management", "Customer data"],
      config: integrations.shopify,
      category: "E-commerce"
    },
    {
      id: "pinecone",
      name: "Pinecone",
      description: "Vector database for intelligent product search and recommendations",
      icon: Database,
      status: integrations.pinecone?.connected ? "connected" : "not_connected", 
      color: "from-purple-600 to-pink-600",
      features: ["Semantic search", "Product similarity", "AI recommendations", "Fast retrieval"],
      config: integrations.pinecone,
      category: "AI & Search"
    },
    {
      id: "openai",
      name: "OpenAI GPT",
      description: "Advanced AI models for natural conversations and understanding",
      icon: Bot,
      status: "connected",
      color: "from-blue-600 to-indigo-600",
      features: ["GPT-4 Turbo", "Function calling", "Structured outputs", "Vision capabilities"],
      category: "AI & LLM"
    },
    {
      id: "anthropic",
      name: "Anthropic Claude",
      description: "Claude AI for advanced reasoning and analysis",
      icon: Brain,
      status: "connected",
      color: "from-orange-600 to-red-600",
      features: ["Advanced reasoning", "Long context", "Code analysis", "Creative writing"],
      category: "AI & LLM"
    }
  ]

  // Available for future (moved to channels)
  const upcomingIntegrations = [
    {
      id: "google-analytics",
      name: "Google Analytics",
      description: "Track customer interactions and conversation analytics",
      icon: TrendingUp,
      status: "coming_soon",
      color: "from-yellow-600 to-orange-600",
      features: ["Conversation tracking", "User behavior", "Performance metrics", "Custom events"],
      category: "Analytics"
    },
    {
      id: "hubspot",
      name: "HubSpot CRM",
      description: "Sync customer data and conversation history with your CRM",
      icon: Globe,
      status: "coming_soon", 
      color: "from-orange-600 to-pink-600",
      features: ["Contact sync", "Deal tracking", "Automated workflows", "Lead scoring"],
      category: "CRM"
    }
  ]

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex">
          <Navigation />
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 flex">
        <Navigation />

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
                <p className="text-gray-600">Connect your business tools and services</p>
              </div>
              <div className="flex items-center space-x-4">
                <Button variant="outline">
                  <Settings className="w-4 h-4 mr-2" />
                  API Settings
                </Button>
              </div>
            </div>
          </header>
          
          {/* Notification */}
          {notification.type && (
            <div className={`mx-6 mt-4 p-4 rounded-lg border-l-4 ${
              notification.type === 'success' 
                ? 'bg-green-50 border-green-500 text-green-700' 
                : 'bg-red-50 border-red-500 text-red-700'
            }`}>
              <div className="flex items-center">
                {notification.type === 'success' ? (
                  <CheckCircle className="h-5 w-5 mr-2" />
                ) : (
                  <AlertCircle className="h-5 w-5 mr-2" />
                )}
                <span className="font-medium">{notification.message}</span>
                <button 
                  onClick={() => setNotification({ message: '', type: null })}
                  className="ml-auto text-current hover:opacity-70"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
          
          {/* Content */}
          <main className="flex-1 p-6">
            <div className="max-w-6xl mx-auto space-y-8">
              {/* Status Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-600">Connected</p>
                        <p className="text-2xl font-bold text-green-900">
                          {businessIntegrations.filter(i => i.status === "connected").length}
                        </p>
                      </div>
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <Zap className="h-5 w-5 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border-yellow-200 bg-yellow-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-yellow-600">Available</p>
                        <p className="text-2xl font-bold text-yellow-900">
                          {businessIntegrations.filter(i => i.status === "not_connected").length}
                        </p>
                      </div>
                      <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                        <Plus className="h-5 w-5 text-yellow-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-purple-200 bg-purple-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-purple-600">Products</p>
                        <p className="text-2xl font-bold text-purple-900">
                          {integrations.shopify?.connected ? "Live" : "Static"}
                        </p>
                      </div>
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Package className="h-5 w-5 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-600">Last Sync</p>
                        <p className="text-lg font-bold text-blue-900">
                          {integrations.shopify?.lastSync 
                            ? new Date(integrations.shopify.lastSync).toLocaleDateString()
                            : "Never"}
                        </p>
                      </div>
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Store className="h-5 w-5 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Active Integrations */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Business Integrations</h2>
                  <Badge variant="secondary">{businessIntegrations.length} available</Badge>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {businessIntegrations.map((integration) => {
                    const Icon = integration.icon
                    return (
                      <Card key={integration.id} className="hover:shadow-lg transition-all">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-12 h-12 bg-gradient-to-r ${integration.color} rounded-xl flex items-center justify-center`}>
                              <Icon className="h-6 w-6 text-white" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{integration.name}</CardTitle>
                              <CardDescription className="mt-1">{integration.description}</CardDescription>
                            </div>
                          </div>
                          <Badge 
                            variant={
                              integration.status === "connected" ? "default" : 
                              integration.status === "coming_soon" ? "secondary" : 
                              "outline"
                            }
                          >
                            {integration.status === "connected" ? "Connected" :
                             integration.status === "coming_soon" ? "Coming Soon" :
                             "Not Connected"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-2">
                            {integration.features.map((feature, index) => (
                              <div key={index} className="flex items-center space-x-2 text-sm text-gray-600">
                                <div className="w-1.5 h-1.5 bg-purple-600 rounded-full"></div>
                                <span>{feature}</span>
                              </div>
                            ))}
                          </div>
                          
                          {integration.config && integration.status === "connected" && (
                            <div className="p-3 bg-gray-50 rounded-lg text-sm space-y-2">
                              {integration.id === "shopify" && (
                                <>
                                  {editingShopify ? (
                                    <div className="space-y-3">
                                      <div>
                                        <p className="text-gray-600 mb-1">AdminURL / Domain:</p>
                                        <Input
                                          value={editShopifyForm.domain}
                                          onChange={(e) => setEditShopifyForm({...editShopifyForm, domain: e.target.value})}
                                                                className="text-sm"
                                        />
                                      </div>
                                      <div>
                                        <p className="text-gray-600 mb-1">API Key:</p>
                                        <Input
                                          type="password"
                                          value={editShopifyForm.apiKey}
                                          onChange={(e) => setEditShopifyForm({...editShopifyForm, apiKey: e.target.value})}
                                                          className="text-sm font-mono"
                                        />
                                      </div>
                                      <div>
                                        <p className="text-gray-600 mb-1">API Access Token:</p>
                                        <Input
                                          type="password"
                                          value={editShopifyForm.accessToken}
                                          onChange={(e) => setEditShopifyForm({...editShopifyForm, accessToken: e.target.value})}
                                                          className="text-sm font-mono"
                                        />
                                      </div>
                                      
                                      {/* Test Connection Result */}
                                      {connectionTestResult && (
                                        <div className={`p-3 rounded-lg ${connectionTestResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                                          <p className={`text-sm ${connectionTestResult.success ? 'text-green-800' : 'text-red-800'}`}>
                                            {connectionTestResult.success ? '✅' : '❌'} {connectionTestResult.message}
                                          </p>
                                        </div>
                                      )}
                                      
                                      <div className="flex space-x-2">
                                        <Button 
                                          size="sm" 
                                          variant="outline" 
                                          onClick={handleTestShopifyConnection} 
                                          disabled={testingConnection || !editShopifyForm.domain || !editShopifyForm.accessToken}
                                        >
                                          {testingConnection ? (
                                            <>
                                              <div className="w-3 h-3 mr-1 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                              Testing...
                                            </>
                                          ) : (
                                            <>
                                              <CheckCircle className="w-3 h-3 mr-1" />
                                              Test Connection
                                            </>
                                          )}
                                        </Button>
                                        <Button 
                                          size="sm" 
                                          onClick={handleSaveShopify} 
                                          disabled={loading || (!connectionTestResult?.success && editShopifyForm.domain && editShopifyForm.accessToken)}
                                        >
                                          <Save className="w-3 h-3 mr-1" />
                                          Save
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => setEditingShopify(false)}>
                                          <X className="w-3 h-3 mr-1" />
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1 space-y-2">
                                          <div>
                                            <p className="text-gray-600">AdminURL:</p>
                                            <p className="font-medium text-gray-900 truncate">{integration.config.domain}</p>
                                          </div>
                                          <div>
                                            <p className="text-gray-600">API Key:</p>
                                            <p className="font-mono text-xs bg-white p-1 rounded border">
                                              {integration.config.apiKey ? `${integration.config.apiKey.substring(0, 8)}...` : 'Not set'}
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-gray-600">Access Token:</p>
                                            <p className="font-mono text-xs bg-white p-1 rounded border">
                                              {integration.config.accessToken ? `${integration.config.accessToken.substring(0, 12)}...` : 'Not set'}
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-gray-600">Last sync:</p>
                                            <p className="font-medium text-gray-900">
                                              {integration.config.lastSync ? new Date(integration.config.lastSync).toLocaleString() : "Never"}
                                            </p>
                                          </div>
                                        </div>
                                        <Button size="sm" variant="ghost" onClick={handleEditShopify} className="ml-2">
                                          <Edit2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </>
                                  )}
                                </>
                              )}
                              {integration.id === "pinecone" && (
                                <>
                                  {editingPinecone ? (
                                    <div className="space-y-3">
                                      <div>
                                        <p className="text-gray-600 mb-1">API Key:</p>
                                        <Input
                                          type="password"
                                          value={editPineconeForm.apiKey}
                                          onChange={(e) => setEditPineconeForm({...editPineconeForm, apiKey: e.target.value})}
                                                          className="text-sm font-mono"
                                        />
                                      </div>
                                      <div>
                                        <p className="text-gray-600 mb-1">Environment:</p>
                                        <Input
                                          value={editPineconeForm.environment}
                                          onChange={(e) => setEditPineconeForm({...editPineconeForm, environment: e.target.value})}
                                          placeholder="e.g., us-east1-gcp"
                                                          className="text-sm font-mono"
                                        />
                                      </div>
                                      <div>
                                        <p className="text-gray-600 mb-1">Namespace:</p>
                                        <Input
                                          value={editPineconeForm.namespace}
                                          onChange={(e) => setEditPineconeForm({...editPineconeForm, namespace: e.target.value})}
                                                          className="text-sm font-mono"
                                        />
                                      </div>
                                      <div>
                                        <p className="text-gray-600 mb-1">Index Name:</p>
                                        <Input
                                          value={editPineconeForm.indexName}
                                          onChange={(e) => setEditPineconeForm({...editPineconeForm, indexName: e.target.value})}
                                                          className="text-sm"
                                        />
                                      </div>
                                      <div className="flex space-x-2">
                                        <Button size="sm" onClick={handleSavePinecone} disabled={loading}>
                                          <Save className="w-3 h-3 mr-1" />
                                          Save
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => setEditingPinecone(false)}>
                                          <X className="w-3 h-3 mr-1" />
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1 space-y-2">
                                          <div>
                                            <p className="text-gray-600">API Key:</p>
                                            <p className="font-mono text-xs bg-white p-1 rounded border">
                                              {integration.config.apiKey ? `${integration.config.apiKey.substring(0, 8)}...` : 'Not set'}
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-gray-600">Environment:</p>
                                            <p className="font-mono text-xs bg-white p-1 rounded border">
                                              {integration.config.environment || 'Not set'}
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-gray-600">Namespace:</p>
                                            <p className="font-mono text-xs bg-white p-2 rounded border break-all">{integration.config.namespace}</p>
                                          </div>
                                          <div>
                                            <p className="text-gray-600">Index:</p>
                                            <p className="font-medium text-gray-900">{integration.config.indexName}</p>
                                          </div>
                                        </div>
                                        <Button size="sm" variant="ghost" onClick={handleEditPinecone} className="ml-2">
                                          <Edit2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                          
                          <div className="flex space-x-3">
                            {integration.status === "connected" ? (
                              <>
                                {(integration.id === "shopify" || integration.id === "pinecone") && (
                                  <Button 
                                    variant="outline" 
                                    className="flex-1"
                                    onClick={() => {
                                      if (integration.id === "shopify") handleEditShopify()
                                      else if (integration.id === "pinecone") handleEditPinecone()
                                    }}
                                  >
                                    <Edit2 className="w-4 h-4 mr-2" />
                                    Edit Config
                                  </Button>
                                )}
                                {integration.id !== "shopify" && integration.id !== "pinecone" && (
                                  <Button variant="outline" className="flex-1">
                                    <Settings className="w-4 h-4 mr-2" />
                                    Configure
                                  </Button>
                                )}
                                {integration.id === "shopify" && (
                                  <Button 
                                    variant="outline" 
                                    className="flex-1"
                                    onClick={() => router.push('/synced-products')}
                                  >
                                    <Package className="w-4 h-4 mr-2" />
                                    Manage Products
                                  </Button>
                                )}
                              </>
                            ) : integration.status === "not_connected" ? (
                              <Button 
                                className="w-full" 
                                onClick={() => {
                                  if (integration.id === "shopify") setShopifyModal(true)
                                  else if (integration.id === "pinecone") setPineconeModal(true)
                                }}
                              >
                                Connect {integration.name}
                              </Button>
                            ) : (
                              <Button className="w-full" disabled>
                                Coming Soon
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                      </Card>
                    )
                })}
              </div>
              </div>

              {/* Coming Soon */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">Coming Soon</h2>
                  <Badge variant="outline">{upcomingIntegrations.length} planned</Badge>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {upcomingIntegrations.map((integration) => {
                    const Icon = integration.icon
                    return (
                      <Card key={integration.id} className="opacity-75">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={`w-12 h-12 bg-gradient-to-r ${integration.color} rounded-xl flex items-center justify-center opacity-60`}>
                                <Icon className="h-6 w-6 text-white" />
                              </div>
                              <div>
                                <CardTitle className="text-lg flex items-center space-x-2">
                                  <span>{integration.name}</span>
                                  <Badge variant="secondary" className="text-xs">
                                    {integration.category}
                                  </Badge>
                                </CardTitle>
                                <CardDescription className="mt-1">{integration.description}</CardDescription>
                              </div>
                            </div>
                            <Badge variant="secondary">Coming Soon</Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-2">
                              {integration.features.map((feature, index) => (
                                <div key={index} className="flex items-center space-x-2 text-sm text-gray-500">
                                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                                  <span>{feature}</span>
                                </div>
                              ))}
                            </div>
                            <Button className="w-full" disabled>
                              Notify Me When Available
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </div>

              {/* Quick Access */}
              <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Need help setting up integrations?</h3>
                      <p className="text-gray-600 mt-1">Our team can help you connect your tools and configure everything perfectly.</p>
                    </div>
                    <div className="flex space-x-3">
                      <Button variant="outline">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Contact Support
                      </Button>
                      <Button>
                        <Globe className="w-4 h-4 mr-2" />
                        View Documentation
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>

        {/* Shopify Connection Modal */}
        {shopifyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Connect Shopify Store</CardTitle>
                <CardDescription>Enter your Shopify store details to enable product sync</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="domain">AdminURL / Store Domain</Label>
                  <Input
                    id="domain"
                    value={shopifyForm.domain}
                    onChange={(e) => setShopifyForm({...shopifyForm, domain: e.target.value})}
                  />
                  <p className="text-xs text-gray-500 mt-1">Your Shopify admin URL without https://</p>
                </div>
                <div>
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    value={shopifyForm.apiKey}
                    onChange={(e) => setShopifyForm({...shopifyForm, apiKey: e.target.value})}
                  />
                  <p className="text-xs text-gray-500 mt-1">Your Shopify API Key from private app settings</p>
                </div>
                <div>
                  <Label htmlFor="accessToken">API Access Token</Label>
                  <Input
                    id="accessToken"
                    type="password"
                    value={shopifyForm.accessToken}
                    onChange={(e) => setShopifyForm({...shopifyForm, accessToken: e.target.value})}
                  />
                  <p className="text-xs text-gray-500 mt-1">Generate from Shopify Admin → Apps → Private apps</p>
                </div>
                <div className="flex space-x-3">
                  <Button variant="outline" onClick={() => setShopifyModal(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={handleShopifyConnect} disabled={loading} className="flex-1">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Connect"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Pinecone Connection Modal */}
        {pineconeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Connect Pinecone</CardTitle>
                <CardDescription>Configure Pinecone for vector search capabilities</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="pineconeApiKey">API Key</Label>
                  <Input
                    id="pineconeApiKey"
                    type="password"
                    value={pineconeForm.apiKey}
                    onChange={(e) => setPineconeForm({...pineconeForm, apiKey: e.target.value})}
                  />
                  <p className="text-xs text-gray-500 mt-1">Your Pinecone API key for authentication</p>
                </div>
                <div>
                  <Label htmlFor="environment">Environment (Optional)</Label>
                  <Input
                    id="environment"
                    value={pineconeForm.environment}
                    onChange={(e) => setPineconeForm({...pineconeForm, environment: e.target.value})}
                    placeholder="Auto-detected from API key (optional)"
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave empty for modern Pinecone setups (auto-detected)</p>
                </div>
                <div>
                  <Label htmlFor="namespace">Namespace</Label>
                  <Input
                    id="namespace"
                    value={pineconeForm.namespace}
                    onChange={(e) => setPineconeForm({...pineconeForm, namespace: e.target.value})}
                  />
                  <p className="text-xs text-gray-500 mt-1">Unique namespace for your business data</p>
                </div>
                <div>
                  <Label htmlFor="indexName">Index Name</Label>
                  <Input
                    id="indexName"
                    value={pineconeForm.indexName}
                    onChange={(e) => setPineconeForm({...pineconeForm, indexName: e.target.value})}
                  />
                  <p className="text-xs text-gray-500 mt-1">Pinecone index to use for products</p>
                </div>
                <div className="flex space-x-3">
                  <Button variant="outline" onClick={() => setPineconeModal(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={handlePineconeConnect} disabled={loading} className="flex-1">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Connect"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}