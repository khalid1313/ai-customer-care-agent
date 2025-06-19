"use client"

import { Bell, Shield, Database, Globe, Key, Palette, Monitor, Settings, Bot, Users, ShoppingCart } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Navigation from "@/components/Navigation"
import { useState, useEffect } from "react"
import { getBackendUrl } from "@/utils/config"
import { useAuth } from "@/contexts/AuthContext"
import ProtectedRoute from "@/components/ProtectedRoute"

export default function SettingsPage() {
  const { business, loading: authLoading, user } = useAuth()
  
  // Debug logging
  console.log('[SettingsPage] Auth state:', {
    authLoading,
    business,
    businessId: business?.id,
    user,
    userId: user?.id
  })
  
  // State for order tracking source
  const [orderTrackingSource, setOrderTrackingSource] = useState("Local Database")
  const [originalOrderTrackingSource, setOriginalOrderTrackingSource] = useState("Local Database")
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // State for AI mode
  const [aiModeEnabled, setAiModeEnabled] = useState(false)
  const [originalAiModeEnabled, setOriginalAiModeEnabled] = useState(false)
  const [aiModeEditing, setAiModeEditing] = useState(false)
  const [aiModeSaving, setAiModeSaving] = useState(false)

  // Load current settings
  useEffect(() => {
    const loadSettings = async () => {
      // Wait for auth to load
      if (authLoading) {
        return;
      }
      
      try {
        const backendUrl = await getBackendUrl()
        
        // Load order tracking settings
        console.log('Settings page - business context:', business)
        console.log('Settings page - user context:', user)
        
        if (!business?.id) {
          console.error('No business ID available from auth context', { business, user })
          setIsLoading(false)
          return
        }
        
        console.log('Loading settings for business:', business.id)
        
        // Get auth token for GET requests
        const authToken = localStorage.getItem('auth_token')
        if (!authToken) {
          console.error('No auth token found for loading settings')
          setIsLoading(false)
          return
        }
        
        const orderResponse = await fetch(`${backendUrl}/api/settings/order-tracking/${business.id}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        })
        if (orderResponse.ok) {
          const orderData = await orderResponse.json()
          const displayValue = orderData.orderTrackingSource === 'local' ? 'Local Database' : 'Shopify'
          setOrderTrackingSource(displayValue)
          setOriginalOrderTrackingSource(displayValue)
          console.log('Loaded order tracking settings:', orderData)
        }
        
        // Load AI mode settings
        const aiResponse = await fetch(`${backendUrl}/api/settings/ai-mode/${business.id}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        })
        if (aiResponse.ok) {
          const aiData = await aiResponse.json()
          setAiModeEnabled(aiData.aiModeEnabled)
          setOriginalAiModeEnabled(aiData.aiModeEnabled)
          console.log('Loaded AI mode settings:', aiData)
        }
        
      } catch (error) {
        console.error('Error loading settings:', error)
      } finally {
        setIsLoading(false)
      }
    }
    
    loadSettings()
  }, [business?.id, authLoading])

  const saveSettings = async () => {
    console.log('saveSettings called, current state:', {
      orderTrackingSource,
      originalOrderTrackingSource,
      hasUnsavedChanges,
      isEditing,
      isSaving
    })
    
    if (!business?.id) {
      alert('Business ID not available. Please refresh the page and try again.')
      return
    }
    
    setIsSaving(true)
    try {
      // Convert the display value to what the backend expects
      const backendValue = orderTrackingSource === "Local Database" ? "local" : "shopify"
      
      console.log('Sending request with:', {
        orderTrackingSource: backendValue,
        businessId: business.id
      })
      
      const backendUrl = await getBackendUrl()
      
      // Get auth token
      const authToken = localStorage.getItem('auth_token')
      if (!authToken) {
        console.error('[saveSettings] No auth token found')
        alert('Authentication required. Please log in again.')
        setIsSaving(false)
        return
      }
      
      const response = await fetch(`${backendUrl}/api/settings/order-tracking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          orderTrackingSource: backendValue,
          businessId: business.id
        })
      })
      
      console.log('Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Settings saved successfully:', data)
        setOriginalOrderTrackingSource(orderTrackingSource)
        setIsEditing(false)
        setHasUnsavedChanges(false)
        alert('Settings saved successfully! The AI agent will use the new configuration.')
      } else {
        const errorText = await response.text()
        console.error('Failed to save settings:', response.status, errorText)
        alert(`Failed to save settings: ${response.status} - ${errorText}`)
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      alert(`Error saving settings: ${error.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  const startEditing = () => {
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setOrderTrackingSource(originalOrderTrackingSource)
    setIsEditing(false)
    setHasUnsavedChanges(false)
  }

  const handleOrderTrackingChange = (value: string) => {
    setOrderTrackingSource(value)
    setHasUnsavedChanges(value !== originalOrderTrackingSource)
  }

  // AI Mode functions
  const saveAiModeSettings = async () => {
    console.log('[saveAiModeSettings] Starting save with:', {
      business,
      businessId: business?.id,
      aiModeEnabled
    })
    
    if (!business?.id) {
      alert('Business ID not available. Please refresh the page and try again.')
      return
    }
    
    setAiModeSaving(true)
    try {
      const backendUrl = await getBackendUrl()
      
      // Get auth token
      const authToken = localStorage.getItem('auth_token')
      console.log('[saveAiModeSettings] Auth token check:', {
        tokenExists: !!authToken,
        tokenLength: authToken ? authToken.length : 0,
        tokenStart: authToken ? authToken.substring(0, 20) + '...' : 'null'
      })
      
      if (!authToken) {
        console.error('[saveAiModeSettings] No auth token found in localStorage')
        alert('Authentication required. Please log in again.')
        setAiModeSaving(false)
        return
      }
      
      const requestBody = {
        aiModeEnabled: aiModeEnabled,
        businessId: business.id
      }
      
      console.log('[saveAiModeSettings] Sending request:', {
        url: `${backendUrl}/api/settings/ai-mode`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: requestBody
      })
      
      const response = await fetch(`${backendUrl}/api/settings/ai-mode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(requestBody)
      })
      
      console.log('[saveAiModeSettings] Response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('[saveAiModeSettings] Success response:', data)
        setOriginalAiModeEnabled(aiModeEnabled)
        setAiModeEditing(false)
        alert(`AI Mode ${aiModeEnabled ? 'enabled' : 'disabled'} successfully! This will apply to all playground sessions.`)
      } else {
        const errorText = await response.text()
        console.error('[saveAiModeSettings] Error response:', {
          status: response.status,
          statusText: response.statusText,
          errorText,
          requestBody
        })
        alert(`Failed to save AI mode: ${response.status} - ${errorText}`)
      }
    } catch (error) {
      console.error('Error saving AI mode:', error)
      alert(`Error saving AI mode: ${error.message}`)
    } finally {
      setAiModeSaving(false)
    }
  }

  const startAiModeEditing = () => {
    setAiModeEditing(true)
  }

  const cancelAiModeEditing = () => {
    setAiModeEnabled(originalAiModeEnabled)
    setAiModeEditing(false)
  }

  const handleAiModeChange = (checked: boolean) => {
    setAiModeEnabled(checked)
  }
  
  const settingsCategories = [
    {
      id: "general",
      title: "General Settings",
      description: "Basic configuration and preferences",
      icon: Settings,
      items: [
        { label: "Business Name", type: "input", value: "Demo Business", description: "Your business display name" },
        { label: "Time Zone", type: "select", value: "UTC-8 (PST)", description: "Used for timestamps and scheduling" },
        { label: "Language", type: "select", value: "English (US)", description: "Default language for the interface" },
        { label: "Auto-save", type: "switch", value: true, description: "Automatically save changes" }
      ]
    },
    {
      id: "notifications",
      title: "Notifications",
      description: "Configure alerts and notifications",
      icon: Bell,
      items: [
        { label: "Email Notifications", type: "switch", value: true, description: "Receive updates via email" },
        { label: "SMS Alerts", type: "switch", value: false, description: "Get urgent alerts via SMS" },
        { label: "Desktop Notifications", type: "switch", value: true, description: "Show browser notifications" },
        { label: "Weekly Reports", type: "switch", value: true, description: "Receive weekly performance reports" }
      ]
    },
    {
      id: "security",
      title: "Security & Privacy",
      description: "Manage security settings and data privacy",
      icon: Shield,
      items: [
        { label: "Two-Factor Authentication", type: "switch", value: false, description: "Add extra security to your account" },
        { label: "Session Timeout", type: "select", value: "30 minutes", description: "Auto logout after inactivity" },
        { label: "Data Retention", type: "select", value: "90 days", description: "How long to keep conversation data" },
        { label: "API Access", type: "switch", value: true, description: "Allow API access to your data" }
      ]
    },
    {
      id: "integrations",
      title: "Integrations",
      description: "Connect with external services",
      icon: Globe,
      items: [
        { label: "Shopify Integration", type: "switch", value: true, description: "Connect to your Shopify store" },
        { label: "WhatsApp Business", type: "switch", value: false, description: "Enable WhatsApp messaging" },
        { label: "Slack Notifications", type: "switch", value: false, description: "Send alerts to Slack" },
        { label: "Google Analytics", type: "switch", value: true, description: "Track customer interactions" }
      ]
    },
    {
      id: "ai-management",
      title: "AI Management",
      description: "Configure AI assistant settings and behavior",
      icon: Bot,
      items: [
        { label: "AI Mode", type: "switch", value: aiModeEnabled, description: "Enable or disable AI responses in the playground and customer interactions", special: "ai-mode" }
      ]
    },
    {
      id: "order-management",
      title: "Order Management",
      description: "Configure order tracking and fulfillment settings",
      icon: ShoppingCart,
      items: [
        { label: "Order Tracking Source", type: "select", value: orderTrackingSource, description: "Primary source for order tracking", options: ["Shopify", "Local Database"] },
        { label: "Auto-detect Order Format", type: "switch", value: true, description: "Automatically detect order number formats" },
        { label: "Show Tracking URLs", type: "switch", value: true, description: "Display carrier tracking links when available" },
        { label: "Order Status Updates", type: "switch", value: true, description: "Send notifications when order status changes" }
      ]
    }
  ]

  const apiKeys = [
    { name: "OpenAI API", status: "active", lastUsed: "2 hours ago", masked: "sk-...abc123" },
    { name: "Anthropic API", status: "active", lastUsed: "5 minutes ago", masked: "sk-...def456" },
    { name: "Shopify API", status: "inactive", lastUsed: "2 days ago", masked: "shpat_...ghi789" }
  ]

  // Show loading state while auth is loading
  if (authLoading || (isLoading && !business)) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex">
          <Navigation />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading settings...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  // Show error if no business is available after loading
  if (!authLoading && !business) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex">
          <Navigation />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-red-600 mb-4">Unable to load business information</p>
              <p className="text-gray-600">Please try logging out and logging back in.</p>
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

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-600">Manage your account and preferences</p>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline">Reset to Defaults</Button>
            </div>
          </div>
        </header>
        
        {/* Content */}
        <main className="flex-1 p-6">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Settings Categories */}
            {settingsCategories.map((category) => {
              const Icon = category.icon
              return (
                <Card key={category.id} className={category.id === "order-management" && isEditing ? "ring-2 ring-purple-200 border-purple-300" : ""}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
                          <Icon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <CardTitle>{category.title}</CardTitle>
                          <CardDescription>
                            {category.description}
                            {category.id === "order-management" && isEditing && (
                              <span className="text-purple-600 font-medium ml-2">(Editing Mode)</span>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                      
                      {/* AI Management specific buttons */}
                      {category.id === "ai-management" && (
                        <div className="flex items-center space-x-2">
                          {!aiModeEditing ? (
                            <Button variant="outline" size="sm" onClick={startAiModeEditing}>
                              Edit Settings
                            </Button>
                          ) : (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={cancelAiModeEditing}
                                disabled={aiModeSaving}
                              >
                                Cancel
                              </Button>
                              <Button 
                                size="sm" 
                                onClick={saveAiModeSettings}
                                disabled={aiModeSaving || aiModeEnabled === originalAiModeEnabled}
                              >
                                {aiModeSaving ? "Saving..." : "Save Changes"}
                              </Button>
                            </>
                          )}
                        </div>
                      )}

                      {/* Order Management specific buttons */}
                      {category.id === "order-management" && (
                        <div className="flex items-center space-x-2">
                          {!isEditing ? (
                            <Button variant="outline" size="sm" onClick={startEditing}>
                              Edit Settings
                            </Button>
                          ) : (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={cancelEditing}
                                disabled={isSaving}
                              >
                                Cancel
                              </Button>
                              <Button 
                                size="sm" 
                                onClick={saveSettings}
                                disabled={isSaving || !hasUnsavedChanges}
                              >
                                {isSaving ? "Saving..." : "Save Changes"}
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {category.items.map((item, index) => (
                        <div key={index} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                          <div className="flex-1">
                            <Label className="text-sm font-medium text-gray-900">{item.label}</Label>
                            <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                          </div>
                          <div className="ml-6">
                            {item.type === "input" && (
                              <Input 
                                defaultValue={item.value as string}
                                className="w-48"
                              />
                            )}
                            {item.type === "select" && (
                              <div className="w-48">
                                {item.options ? (
                                  <Select 
                                    value={item.value as string} 
                                    onValueChange={(value) => {
                                      if (item.label === "Order Tracking Source") {
                                        handleOrderTrackingChange(value)
                                      }
                                    }}
                                    disabled={category.id === "order-management" && !isEditing}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {item.options.map((option) => (
                                        <SelectItem key={option} value={option}>
                                          {option}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <div className="p-2 border border-gray-300 rounded-xl bg-white">
                                    <span className="text-sm text-gray-900">{item.value}</span>
                                  </div>
                                )}
                              </div>
                            )}
                            {item.type === "switch" && (
                              <Switch 
                                checked={
                                  item.special === "ai-mode" ? aiModeEnabled : item.value as boolean
                                }
                                onCheckedChange={
                                  item.special === "ai-mode" ? handleAiModeChange : undefined
                                }
                                disabled={
                                  (category.id === "order-management" && !isEditing) ||
                                  (category.id === "ai-management" && !aiModeEditing)
                                }
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}

            {/* API Keys Management */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-orange-600 to-red-600 rounded-xl flex items-center justify-center">
                    <Key className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle>API Keys</CardTitle>
                    <CardDescription>Manage your API keys and integrations</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {apiKeys.map((key, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-xl">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                          <Key className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{key.name}</p>
                          <p className="text-sm text-gray-600">{key.masked}</p>
                          <p className="text-xs text-gray-500">Last used: {key.lastUsed}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge variant={key.status === "active" ? "default" : "secondary"}>
                          {key.status}
                        </Badge>
                        <Button variant="outline" size="sm">Edit</Button>
                        <Button variant="outline" size="sm">Revoke</Button>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full">
                    <Key className="w-4 h-4 mr-2" />
                    Add New API Key
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Theme & Appearance */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-teal-600 rounded-xl flex items-center justify-center">
                    <Palette className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle>Theme & Appearance</CardTitle>
                    <CardDescription>Customize the look and feel</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { name: "Light", preview: "bg-white border-2 border-purple-500", active: true },
                    { name: "Dark", preview: "bg-gray-900 border-2 border-gray-600", active: false },
                    { name: "Auto", preview: "bg-gradient-to-r from-white to-gray-900 border-2 border-gray-400", active: false }
                  ].map((theme, index) => (
                    <button
                      key={index}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        theme.active ? "border-purple-500 bg-purple-50" : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className={`w-full h-20 rounded-lg ${theme.preview} mb-3 flex items-center justify-center`}>
                        <Monitor className="h-6 w-6 text-gray-600" />
                      </div>
                      <p className="font-medium text-gray-900">{theme.name}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Data & Storage */}
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                    <Database className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle>Data & Storage</CardTitle>
                    <CardDescription>Manage your data and storage usage</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      { title: "Conversations", value: "2,847", usage: "73%", color: "purple" },
                      { title: "Knowledge Base", value: "1.2 GB", usage: "45%", color: "blue" },
                      { title: "File Storage", value: "456 MB", usage: "22%", color: "green" }
                    ].map((item, index) => (
                      <div key={index} className="text-center p-4 bg-gray-50 rounded-xl">
                        <h3 className="font-medium text-gray-900">{item.title}</h3>
                        <p className="text-2xl font-bold text-purple-600 mt-2">{item.value}</p>
                        <p className="text-sm text-gray-600 mt-1">{item.usage} used</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex space-x-4">
                    <Button variant="outline">Export Data</Button>
                    <Button variant="outline">Clear Cache</Button>
                    <Button variant="outline">Archive Old Data</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}