"use client"

import { Send, RotateCcw, Save, Download, Trash2, FileDown, BookmarkPlus, ImagePlus, X, Plus } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState, useEffect, useRef, useCallback } from "react"
import Navigation from "@/components/Navigation"
import { getBackendUrl } from "@/utils/config"
import { useAuth } from "@/contexts/AuthContext"
import ProtectedRoute from "@/components/ProtectedRoute"

export default function PlaygroundPage() {
  const { business, loading: authLoading } = useAuth()
  const [selectedAgent, setSelectedAgent] = useState("core-ai-agent")
  const [testMessage, setTestMessage] = useState("")
  const [isAiEnabled, setIsAiEnabled] = useState(true) // Default to true, will be updated from backend
  const [isLoading, setIsLoading] = useState(false)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [sessionId, setSessionId] = useState<string>('')
  const [conversation, setConversation] = useState<Message[]>([])
  const [sessionCreatedAt, setSessionCreatedAt] = useState<string>('')
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Initialize session ID on client side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Always check for session, even if sessionId exists (to handle refreshes)
      const existingSession = localStorage.getItem('playground-session-id')
      if (existingSession && existingSession !== sessionId) {
        console.log('Loading session from localStorage:', existingSession)
        setSessionId(existingSession)
        setSessionCreatedAt('Loaded')
      } else if (!existingSession && !sessionId) {
        // Create new session only if none exists
        const newSessionId = `playground-${Date.now()}`
        console.log('Creating initial session:', newSessionId)
        localStorage.setItem('playground-session-id', newSessionId)
        setSessionId(newSessionId)
        setSessionCreatedAt(new Date().toLocaleTimeString())
      }
    }
  }, []) // Keep empty dependency array

  // Load AI toggle state from backend business settings
  useEffect(() => {
    const loadAiModeSettings = async () => {
      // Wait for auth to load
      if (authLoading || !business?.id) {
        return
      }
      
      try {
        const backendUrl = await getBackendUrl()
        
        // Get auth token for request
        const authToken = localStorage.getItem('auth_token')
        if (!authToken) {
          console.error('No auth token found for loading AI mode settings')
          return
        }
        
        const response = await fetch(`${backendUrl}/api/settings/ai-mode/${business.id}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          setIsAiEnabled(data.aiModeEnabled)
          console.log('AI Mode loaded from backend:', data.aiModeEnabled)
        } else {
          // Fallback to localStorage if backend call fails
          if (typeof window !== 'undefined') {
            const savedState = localStorage.getItem('playground-ai-enabled')
            if (savedState !== null) {
              setIsAiEnabled(JSON.parse(savedState))
              console.log('AI Mode loaded from localStorage (fallback):', JSON.parse(savedState))
            }
          }
        }
      } catch (error) {
        console.error('Error loading AI mode settings:', error)
        // Fallback to localStorage
        if (typeof window !== 'undefined') {
          const savedState = localStorage.getItem('playground-ai-enabled')
          if (savedState !== null) {
            setIsAiEnabled(JSON.parse(savedState))
          }
        }
      }
    }
    
    loadAiModeSettings()
  }, [business?.id, authLoading])
  
  // Load conversation history when sessionId is available
  useEffect(() => {
    if (!sessionId || authLoading || !business?.id) return // Don't load if sessionId is not set yet or auth not ready
    
    const loadConversationHistory = async () => {
      try {
        console.log('Loading conversation history for session:', sessionId)
        const backendUrl = await getBackendUrl()
        
        // Get auth token for request
        const authToken = localStorage.getItem('auth_token')
        if (!authToken) {
          console.error('No auth token found for loading conversation history')
          return
        }
        
        const response = await fetch(`${backendUrl}/api/ai-chat/history/${sessionId}?businessId=${business.id}`, {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          console.log('Conversation history loaded:', data)
          if (data.messages && data.messages.length > 0) {
            setConversation(data.messages)
          }
        } else {
          console.error('Failed to load conversation history:', response.status)
        }
      } catch (error) {
        console.error('Failed to load conversation history:', error)
      }
    }
    
    loadConversationHistory()
  }, [sessionId, business?.id, authLoading])

  // AI mode is now controlled by backend settings - no localStorage saving needed

  // Conversations are automatically saved to database via API calls

  // Auto-scroll to bottom when new messages are added
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [conversation])

  const agents = [
    { id: "core-ai-agent", name: "Core AI Agent", status: "active" }
  ]

  // Handle image upload
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // Remove selected image
  const removeImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
  }

  const startNewSession = () => {
    if (typeof window !== 'undefined') {
      console.log('🆕 NEW SESSION - Starting fresh session')
      // Generate new session ID and save to localStorage
      const newSessionId = `playground-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('playground-session-id', newSessionId)
      console.log('✅ New session created:', newSessionId)
      
      // Force page refresh to ensure clean state
      window.location.reload()
    }
  }

  // Convert image to base64
  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = error => reject(error)
    })
  }


  const handleSendMessage = async () => {
    console.log('🔍 handleSendMessage called with:', { testMessage, selectedImage, isLoading });
    if ((!testMessage.trim() && !selectedImage) || isLoading) return
    
    // Get the most current session ID from localStorage as backup
    const currentSessionFromStorage = localStorage.getItem('playground-session-id')
    const actualSessionId = sessionId || currentSessionFromStorage
    
    console.log('🚀 SENDING MESSAGE - Full Debug Info:')
    console.log('- React sessionId state:', sessionId)
    console.log('- localStorage sessionId:', currentSessionFromStorage)
    console.log('- Using sessionId:', actualSessionId)
    console.log('- Message:', testMessage)
    
    if (!actualSessionId) {
      console.error('❌ No session ID available!')
      return
    }
    
    let imageBase64 = null
    if (selectedImage) {
      imageBase64 = await convertToBase64(selectedImage)
    }
    
    const newMessage = {
      role: "user" as const,
      message: testMessage || (selectedImage ? "🖼️ Image uploaded" : ""),
      image: imagePreview,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
    
    setConversation(prev => [...prev, newMessage])
    const currentMessage = testMessage
    const currentImage = imageBase64
    console.log('💾 Saving values before clearing:', { currentMessage, currentImage });
    setTestMessage("")
    removeImage()
    setIsLoading(true)
    
    try {
      if (isAiEnabled) {
        // Use real AI backend
        console.log('📤 FINAL: Sending message with sessionId:', actualSessionId)
        console.log('📤 FINAL: Message content:', currentMessage)
        
        const backendUrl = await getBackendUrl()
        const requestBody = {
          message: currentMessage || (currentImage ? "I uploaded an image" : ""),
          image: currentImage,
          sessionId: actualSessionId,
          businessId: business?.id || 'default-business-id',
          source: 'playground'
        }
        
        console.log('📤 FINAL: Full request body:', requestBody)
        
        // Get auth token for request
        const authToken = localStorage.getItem('auth_token')
        
        const response = await fetch(`${backendUrl}/api/ai-chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken && { 'Authorization': `Bearer ${authToken}` })
          },
          body: JSON.stringify(requestBody)
        })
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        
        console.log('📥 RECEIVED RESPONSE:', data)
        console.log('📥 Response sessionId:', data.sessionId)
        console.log('📥 Expected sessionId:', actualSessionId)
        
        if (data.sessionId !== actualSessionId) {
          console.warn('⚠️ MISMATCH: Response sessionId differs from sent sessionId!')
        }
        
        const agentResponse = {
          role: "agent" as const,
          message: data.response || "I apologize, but I couldn't process your request at the moment.",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
        
        setConversation(prev => [...prev, agentResponse])
      } else {
        // Use mock response
        setTimeout(() => {
          const agentResponse = {
            role: "agent" as const,
            message: "Thank you for your message. I'm processing your request and will provide you with the most helpful information possible. (This is a mock response - toggle AI ON to use real AI responses)",
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
          setConversation(prev => [...prev, agentResponse])
          setIsLoading(false)
        }, 1000)
        return
      }
    } catch (error) {
      console.error('Error sending message:', error)
      const errorResponse = {
        role: "agent" as const,
        message: "I apologize, but I'm having trouble connecting to the AI service. Please try again later.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      setConversation(prev => [...prev, errorResponse])
    } finally {
      setIsLoading(false)
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
              <p className="text-gray-600">Loading playground...</p>
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
              <h1 className="text-2xl font-bold text-gray-900">Playground</h1>
              <p className="text-gray-600">Test and refine your AI agents</p>
              {sessionId && (
                <div className="text-xs text-gray-500 mt-2 p-2 bg-gray-50 rounded border">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-green-600">🟢</span>
                    <span className="font-medium text-gray-700">Active Session</span>
                  </div>
                  <p className="font-mono text-xs">ID: {sessionId}</p>
                  {sessionCreatedAt && (
                    <p>Started: {sessionCreatedAt}</p>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center space-x-3">
              {/* AI Status Display */}
              <div className="flex items-center space-x-3 px-4 py-2 bg-gray-100 rounded-lg">
                <Label className="text-sm font-medium text-gray-700">
                  AI Mode
                </Label>
                <Badge variant={isAiEnabled ? "default" : "secondary"} className="text-xs">
                  {isAiEnabled ? "ON" : "OFF"}
                </Badge>
                <span className="text-xs text-gray-500">(Controlled by Admin)</span>
              </div>
              
              {/* Action Icons */}
              <Button variant="outline" size="sm" title="Save Session">
                <BookmarkPlus className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" title="Export Chat">
                <FileDown className="w-4 h-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                title="Clear Current Chat (keeps same session)" 
                onClick={() => {
                  setConversation([])
                  console.log('Chat cleared for session:', sessionId)
                }}
                className="text-gray-600 hover:text-red-600 hover:border-red-300"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              <Button 
                variant="default" 
                size="sm" 
                title="Start New Session (creates new conversation in inbox)" 
                onClick={startNewSession}
                className="bg-green-600 hover:bg-green-700 text-white border-green-600"
              >
                <Plus className="w-4 h-4 mr-1" />
                New
              </Button>
            </div>
          </div>
        </header>
        
        {/* Content - Full Width Chat */}
        <main className="flex-1 flex flex-col">
          {/* Chat Messages - Full Height */}
          <div className="flex-1 overflow-y-auto bg-gray-50 p-4 pb-28">
            <div className="max-w-3xl mx-auto space-y-3">
              {conversation.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-md px-3 py-2 rounded-2xl ${
                      msg.role === "user"
                        ? "bg-purple-600 text-white rounded-br-md"
                        : "bg-white border border-gray-200 text-gray-900 shadow-sm rounded-bl-md"
                    }`}
                  >
                    {(msg as any).image && (
                      <div className="mb-2">
                        <img 
                          src={(msg as any).image} 
                          alt="Uploaded image" 
                          className="max-w-full h-32 object-cover rounded-lg"
                        />
                      </div>
                    )}
                    <p className="text-sm">{msg.message}</p>
                    <div
                      className={`text-xs mt-1 ${
                        msg.role === "user" ? "text-purple-200" : "text-gray-500"
                      }`}
                    >
                      <p>{msg.timestamp}</p>
                      {msg.role === "user" && sessionId && (
                        <p className="text-purple-300 font-mono text-xs opacity-75">
                          Session: {sessionId.substring(sessionId.lastIndexOf('-') + 1)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Fixed Input at Bottom */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-50">
            <div className="max-w-4xl mx-auto">
              {/* Image Preview */}
              {imagePreview && (
                <div className="mb-3 p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="h-16 w-16 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <p className="text-sm text-gray-600">Image ready to send</p>
                      <p className="text-xs text-gray-400">{selectedImage?.name}</p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={removeImage}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
              
              {/* Input Row */}
              <div className="flex space-x-3">
                <div className="flex-1 flex space-x-2">
                  <Input
                    value={testMessage}
                    onChange={(e) => setTestMessage(e.target.value)}
                    placeholder="Type your message or upload an image..."
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    className="flex-1 h-12 text-base"
                  />
                  
                  {/* Image Upload Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('image-upload')?.click()}
                    className="h-12 px-3"
                    title="Upload Image"
                  >
                    <ImagePlus className="w-4 h-4" />
                  </Button>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
                
                <Button 
                  onClick={handleSendMessage} 
                  disabled={isLoading || (!testMessage.trim() && !selectedImage)} 
                  className="h-12 px-6"
                >
                  {isLoading ? (
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-gray-300 border-t-white" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
    </ProtectedRoute>
  )
}