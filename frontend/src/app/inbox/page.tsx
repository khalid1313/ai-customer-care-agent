"use client"

import { useState, useEffect } from "react"
import { Search, Filter, Archive, Star, Clock, AlertCircle, MessageSquare, Bot, Users, Package, Ticket, Plus, MoreVertical, Send, Phone, Mail, Facebook, Instagram, Twitter, RefreshCw } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import Navigation from "@/components/Navigation"
import ProtectedRoute from "@/components/ProtectedRoute"
import { useAuth } from "@/contexts/AuthContext"
import { getBackendUrl } from "@/utils/config"
import { usePresence } from "@/hooks/usePresence"

export default function InboxPage() {
  const { business, user } = useAuth()
  usePresence() // Track presence for live monitoring
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [rightTab, setRightTab] = useState('products') // 'products' or 'tickets'
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState({})
  const [conversations, setConversations] = useState([])
  const [loadingMessages, setLoadingMessages] = useState({})
  const [messageInput, setMessageInput] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [tickets, setTickets] = useState([])
  const [loadingTickets, setLoadingTickets] = useState(false)

  // State for auto-refresh
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())

  // Fetch actual products and conversations on component mount
  useEffect(() => {
    if (business?.id) {
      fetchProducts()
      fetchConversations()
      
      // Set up auto-refresh for conversations every 15 seconds
      const refreshInterval = setInterval(() => {
        if (isAutoRefreshing) {
          fetchConversations()
          setLastRefresh(new Date())
        }
      }, 15000) // 15 seconds
      
      return () => clearInterval(refreshInterval)
    }
  }, [business?.id, isAutoRefreshing])

  const fetchConversations = async () => {
    if (!business?.id) {
      console.log('No business ID available yet')
      return
    }
    
    try {
      const backendUrl = await getBackendUrl()
      const authToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      
      if (!authToken) {
        console.error('No auth token available')
        return
      }
      
      const response = await fetch(`${backendUrl}/api/inbox/conversations/${business.id}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        
        // Transform conversations to match UI format
        const formattedConversations = data.conversations.map(conv => {
          // Check if this conversation already exists in our state to preserve local changes
          const existingConv = conversations.find(existing => existing.id === conv.id)
          
          return {
            id: conv.id,
            customer: conv.customerName || 'Anonymous User',
            channel: conv.channel === 'WEB_CHAT' ? 'website' : conv.channel.toLowerCase(),
            lastMessage: conv.lastMessage || 'No messages yet',
            timestamp: conv.lastMessageAt ? formatTimestamp(conv.lastMessageAt) : 'Never',
            // Preserve local isAiHandling state if conversation exists, otherwise use backend value
            isAiHandling: existingConv ? existingConv.isAiHandling : (conv.isAiHandling !== false),
            status: conv.status?.toLowerCase() || 'active',
            unreadCount: conv.unreadCount || 0,
            avatar: getInitials(conv.customerName || 'Anonymous User'),
            channelIcon: getChannelIcon(conv.channel),
            priority: 'normal',
            handledBy: conv.handledBy || null, // Add agent name who last handled this conversation
            metadata: conv.metadata ? JSON.parse(conv.metadata) : {}
          }
        })
        
        setConversations(formattedConversations)
        
        // If no conversation is selected, auto-select the most recent one
        if (!selectedConversation && formattedConversations.length > 0) {
          const mostRecentConversation = formattedConversations[0] // Already sorted by lastMessageAt desc
          setSelectedConversation(mostRecentConversation)
          loadMessagesForConversation(mostRecentConversation.id)
          fetchTicketsForConversation(mostRecentConversation.id)
        }
        
        // If a conversation is selected, update its details and refresh messages
        if (selectedConversation) {
          // Update selected conversation with latest data
          const updatedSelectedConv = formattedConversations.find(conv => conv.id === selectedConversation.id)
          if (updatedSelectedConv) {
            // Preserve the current isAiHandling state to prevent auto-revert during refresh
            setSelectedConversation({
              ...updatedSelectedConv,
              isAiHandling: selectedConversation.isAiHandling // Preserve current AI handling state
            })
            
            // Check if there are new messages by comparing lastMessageAt
            const hasNewMessages = updatedSelectedConv.lastMessageAt !== selectedConversation.lastMessageAt
            
            if (hasNewMessages) {
              console.log('New messages detected for selected conversation, refreshing...', {
                conversationId: selectedConversation.id,
                oldTimestamp: selectedConversation.lastMessageAt,
                newTimestamp: updatedSelectedConv.lastMessageAt
              })
              
              // Clear cached messages to force fresh fetch
              setMessages(prev => ({
                ...prev,
                [selectedConversation.id]: []
              }))
            }
          }
          
          // Always refresh messages during auto-refresh to show new messages
          // Force cache clear and reload
          setMessages(prev => ({
            ...prev,
            [selectedConversation.id]: []
          }))
          setTimeout(() => {
            loadMessagesForConversation(selectedConversation.id)
          }, 100)
        }
      }
    } catch (error) {
      console.error("Error fetching conversations:", error)
    }
  }

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minutes ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`
    return `${Math.floor(diffMins / 1440)} days ago`
  }

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const getChannelIcon = (channel) => {
    switch (channel?.toLowerCase()) {
      case 'web_chat':
        return MessageSquare
      case 'whatsapp':
        return Phone
      case 'email':
        return Mail
      case 'facebook':
        return Facebook
      case 'instagram':
        return Instagram
      case 'twitter':
        return Twitter
      default:
        return MessageSquare
    }
  }

  const fetchProducts = async () => {
    if (!business?.id) {
      console.log('No business ID available yet for products')
      return
    }
    
    try {
      const backendUrl = await getBackendUrl()
      const authToken = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
      
      if (!authToken) {
        console.error('No auth token available for products')
        return
      }
      
      const response = await fetch(`${backendUrl}/api/product-sync/${business.id}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        // Filter for active products with images and in stock
        const availableProducts = data.data.products.filter(product => 
          product.productStatus === 'active' && 
          product.productImage && 
          (!product.inventoryTracked || product.inventoryQuantity > 0)
        )
        setProducts(availableProducts)
      }
    } catch (error) {
      console.error("Error fetching products:", error)
    } finally {
      setLoading(false)
    }
  }

  // Load messages for selected conversation
  const loadMessagesForConversation = async (conversationId) => {
    try {
      console.log('Loading messages for conversation:', conversationId)
      
      // Set loading state for this conversation
      setLoadingMessages(prev => ({
        ...prev,
        [conversationId]: true
      }))
      
      const backendUrl = await getBackendUrl()
      const response = await fetch(`${backendUrl}/api/inbox/conversation/${conversationId}/messages?t=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('Loaded messages:', data.messages?.length || 0, 'messages for conversation', conversationId)
        setMessages(prev => ({
          ...prev,
          [conversationId]: data.messages
        }))
      } else {
        console.error('Failed to load messages:', response.status, response.statusText)
      }
    } catch (error) {
      console.error("Error fetching conversation messages:", error)
    } finally {
      // Clear loading state
      setLoadingMessages(prev => ({
        ...prev,
        [conversationId]: false
      }))
    }
  }

  // Handle conversation selection
  const handleConversationSelect = async (conversation) => {
    // Immediately update selected conversation for instant UI response
    setSelectedConversation(conversation)
    
    // Immediately update unread count for instant feedback
    setConversations(prev => prev.map(conv => 
      conv.id === conversation.id 
        ? { ...conv, unreadCount: 0 }
        : conv
    ))
    
    // Load messages if not already loaded and not currently loading (this happens in background)
    if (!messages[conversation.id] && !loadingMessages[conversation.id]) {
      loadMessagesForConversation(conversation.id)
    }
    
    // Fetch tickets for this conversation
    fetchTicketsForConversation(conversation.id)
    
    // Mark messages as read (background operation)
    markConversationAsRead(conversation.id)
  }

  // Mark conversation messages as read
  const markConversationAsRead = async (conversationId) => {
    try {
      const backendUrl = await getBackendUrl()
      await fetch(`${backendUrl}/api/inbox/conversation/${conversationId}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ senderType: 'CUSTOMER' })
      })
    } catch (error) {
      console.error("Error marking conversation as read:", error)
    }
  }

  // Send product to customer inbox
  const sendProductToCustomer = async (product, conversation) => {
    try {
      console.log(`📦 Sending product "${product.productTitle}" to ${conversation.customer}`)
      
      // Format product message content for Instagram - clean and simple
      const shopifyUrl = `https://${business?.shopifyDomain || 'mister-sfc.myshopify.com'}/products/${product.productHandle}`
      
      const productMessage = `$${product.productPrice}

${shopifyUrl}

${product.productTitle}`

      const backendUrl = await getBackendUrl()
      const response = await fetch(`${backendUrl}/api/inbox/conversation/${conversation.id}/send-message`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: productMessage,
          sender: 'HUMAN_AGENT',
          senderName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'Agent' : 'Agent',
          messageType: 'PRODUCT',
          productData: {
            id: product.id,
            title: product.productTitle,
            price: product.productPrice,
            image: product.productImage,
            category: product.productCategory,
            shopifyId: product.shopifyProductId,
            description: product.productDescription
          }
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Product message sent successfully:', data)
        
        // Refresh messages to show the new product message
        loadMessagesForConversation(conversation.id)
        
        // Refresh conversations to update last message
        fetchConversations()
      } else {
        console.error('❌ Failed to send product message:', response.status, response.statusText)
        alert('Failed to send product. Please try again.')
      }
    } catch (error) {
      console.error('❌ Error sending product message:', error)
      alert('Error sending product. Please try again.')
    }
  }

  // Toggle AI/Human handling for a conversation
  const toggleAiHandling = async (conversationId) => {
    try {
      // Find current conversation to get current state
      const conversation = conversations.find(conv => conv.id === conversationId)
      if (!conversation) return
      
      const newAiHandlingState = !conversation.isAiHandling
      
      // Optimistically update UI
      setConversations(prev => prev.map(conv => 
        conv.id === conversationId 
          ? { ...conv, isAiHandling: newAiHandlingState }
          : conv
      ))
      
      // Update selected conversation if it's the current one
      if (selectedConversation?.id === conversationId) {
        setSelectedConversation(prev => ({
          ...prev,
          isAiHandling: newAiHandlingState
        }))
      }
      
      // Make API call to update backend
      const backendUrl = await getBackendUrl()
      const response = await fetch(`${backendUrl}/api/inbox/conversation/${conversationId}/ai-handling`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          isAiHandling: newAiHandlingState,
          updatedBy: 'human_agent' // Could be dynamic based on logged in user
        })
      })
      
      if (!response.ok) {
        console.error('Failed to update AI handling status:', response.status, response.statusText)
        
        // Revert optimistic update on error
        setConversations(prev => prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, isAiHandling: !newAiHandlingState }
            : conv
        ))
        
        if (selectedConversation?.id === conversationId) {
          setSelectedConversation(prev => ({
            ...prev,
            isAiHandling: !newAiHandlingState
          }))
        }
      } else {
        const data = await response.json()
        console.log('AI handling status updated successfully:', data.message)
      }
    } catch (error) {
      console.error('Error updating AI handling status:', error)
      
      // Revert optimistic update on error
      const conversation = conversations.find(conv => conv.id === conversationId)
      if (conversation) {
        setConversations(prev => prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, isAiHandling: conversation.isAiHandling }
            : conv
        ))
        
        if (selectedConversation?.id === conversationId) {
          setSelectedConversation(prev => ({
            ...prev,
            isAiHandling: conversation.isAiHandling
          }))
        }
      }
    }
  }

  // Send message from human agent
  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation || sendingMessage) return
    
    try {
      setSendingMessage(true)
      
      // Debug: Check user data
      console.log('Current user data:', user)
      console.log('User firstName:', user?.firstName)
      console.log('User lastName:', user?.lastName)
      console.log('User email:', user?.email)
      
      // Construct agent name
      const agentName = user 
        ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Agent'
        : 'Agent'
      
      console.log('Sending with agentName:', agentName)
      
      const backendUrl = await getBackendUrl()
      const response = await fetch(`${backendUrl}/api/inbox/conversation/${selectedConversation.id}/send-message`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: messageInput,
          sender: 'HUMAN_AGENT',
          senderName: agentName
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('Message sent successfully:', data)
        
        // Clear input
        setMessageInput('')
        
        // Refresh messages to show the new message
        loadMessagesForConversation(selectedConversation.id)
        
        // Refresh conversations to update last message
        fetchConversations()
      } else {
        console.error('Failed to send message:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setSendingMessage(false)
    }
  }

  // Fetch tickets for selected conversation
  const fetchTicketsForConversation = async (conversationId) => {
    try {
      setLoadingTickets(true)
      
      const backendUrl = await getBackendUrl()
      const response = await fetch(`${backendUrl}/api/inbox/conversation/${conversationId}/tickets`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        setTickets(data.data.tickets || [])
      } else {
        console.error('Failed to fetch tickets:', response.status, response.statusText)
        setTickets([])
      }
    } catch (error) {
      console.error("Error fetching tickets:", error)
      setTickets([])
    } finally {
      setLoadingTickets(false)
    }
  }

  // Handle Enter key press in message input
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }


  // Helper function to format timestamp for display
  const formatTimestampForTicket = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    if (diffMins < 10080) return `${Math.floor(diffMins / 1440)}d ago` 
    return date.toLocaleDateString()
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "unread": return "bg-blue-100 text-blue-700"
      case "pending": return "bg-yellow-100 text-yellow-700"
      case "in_progress": return "bg-purple-100 text-purple-700"
      case "resolved": return "bg-green-100 text-green-700"
      case "open": return "bg-red-100 text-red-700"
      case "closed": return "bg-gray-100 text-gray-700"
      default: return "bg-gray-100 text-gray-700"
    }
  }

  const getSlaStatusColor = (slaStatus: string) => {
    switch (slaStatus?.toLowerCase()) {
      case "overdue": return "bg-red-100 text-red-700"
      case "urgent": return "bg-orange-100 text-orange-700"
      case "soon": return "bg-yellow-100 text-yellow-700"
      case "on_time": return "bg-green-100 text-green-700"
      default: return "bg-gray-100 text-gray-700"
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "text-red-600"
      case "normal": return "text-gray-600"
      case "low": return "text-green-600"
      default: return "text-gray-600"
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 flex">
        <Navigation />

      {/* Main Content - Three Column Layout with Fixed Height */}
      <div className="flex-1 flex h-screen">
        
        {/* Left Column - Real-time Conversations - Fixed */}
        <div className="w-1/4 bg-white border-r border-gray-200 flex flex-col h-full">
          {/* Header */}
          <header className="p-4 border-b border-gray-200 flex-shrink-0">
            <div className="flex justify-between items-center mb-3">
              <h1 className="text-xl font-bold text-gray-900">Live Conversations</h1>
              <div className="flex items-center gap-2">
                {/* Auto-refresh indicator */}
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <div className={`w-2 h-2 rounded-full ${isAutoRefreshing ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                  <span>{isAutoRefreshing ? 'Live' : 'Paused'}</span>
                </div>
                
                {/* Refresh toggle button */}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setIsAutoRefreshing(!isAutoRefreshing)}
                  className={`flex items-center gap-1 text-xs px-2 py-1 h-7 ${
                    isAutoRefreshing 
                      ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' 
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <RefreshCw className={`h-3 w-3 ${isAutoRefreshing ? 'animate-spin' : ''}`} />
                  {isAutoRefreshing ? 'Auto' : 'Manual'}
                </Button>
                
                {/* Manual refresh button */}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    fetchConversations()
                    setLastRefresh(new Date())
                  }}
                  className="flex items-center gap-1 text-xs px-2 py-1 h-7"
                >
                  <RefreshCw className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input 
                placeholder="Search conversations..." 
                className="pl-10 w-full"
              />
            </div>
          </header>

          {/* Conversation List - Scrollable */}
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-1 p-2">
              {conversations.map((conversation) => {
                const ChannelIcon = conversation.channelIcon;
                return (
                  <div 
                    key={conversation.id}
                    onClick={() => handleConversationSelect(conversation)}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      selectedConversation?.id === conversation.id 
                        ? 'bg-purple-50 border-l-4 border-purple-500' 
                        : 'hover:bg-gray-50 border-l-4 border-transparent'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      {/* Avatar */}
                      <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white font-medium text-sm">{conversation.avatar}</span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-medium text-gray-900 text-sm truncate">{conversation.customer}</h3>
                          <span className="text-xs text-gray-500">{conversation.timestamp}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2 mb-2">
                          <ChannelIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-xs text-gray-600 capitalize">{conversation.channel}</span>
                          {!conversation.isAiHandling && conversation.handledBy && (
                            <span className="text-xs text-blue-600 font-medium">• {conversation.handledBy}</span>
                          )}
                          <div className="ml-auto">
                            {conversation.isAiHandling ? (
                              <Bot className="w-3 h-3 text-blue-500" title="AI Handling" />
                            ) : (
                              <Users className="w-3 h-3 text-green-500" title="Human Handling" />
                            )}
                          </div>
                        </div>
                        
                        <p className="text-xs text-gray-600 line-clamp-2 mb-2">{conversation.lastMessage}</p>
                        
                        <div className="flex items-center justify-between">
                          <Badge className={`text-xs ${
                            conversation.status === 'active' ? 'bg-green-100 text-green-700' :
                            conversation.status === 'waiting' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {conversation.status}
                          </Badge>
                          {conversation.unreadCount > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {conversation.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Center Column - Conversation View - Scrollable Messages */}
        <div className="flex-1 bg-white border-r border-gray-200 flex flex-col h-full">
          {selectedConversation ? (
            <>
              {/* Conversation Header - Fixed */}
              <div className="p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium text-sm">{selectedConversation.avatar}</span>
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-900">{selectedConversation.customer}</h2>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <selectedConversation.channelIcon className="w-4 h-4" />
                        <span className="capitalize">{selectedConversation.channel}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {/* Manual refresh button for current conversation */}
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        setMessages(prev => ({ ...prev, [selectedConversation.id]: [] }))
                        loadMessagesForConversation(selectedConversation.id)
                        console.log('Manually refreshing conversation:', selectedConversation.id)
                      }}
                      className="border-blue-300 text-blue-700 hover:bg-blue-50"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Refresh Chat
                    </Button>
                    
                    {/* AI/Human Control Buttons */}
                    {selectedConversation.isAiHandling ? (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => toggleAiHandling(selectedConversation.id)}
                        className="border-purple-300 text-purple-700 hover:bg-purple-50"
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Take Over
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => toggleAiHandling(selectedConversation.id)}
                        className="border-green-300 text-green-700 hover:bg-green-50"
                      >
                        <Bot className="w-4 h-4 mr-2" />
                        Hand to AI
                      </Button>
                    )}
                    <Button size="sm" variant="outline">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Messages Area - Scrollable */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{maxHeight: 'calc(100vh - 200px)'}}>
                {/* Real messages from API */}
                {loadingMessages[selectedConversation.id] && !messages[selectedConversation.id]?.length ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                      <p className="text-gray-500">Loading messages...</p>
                    </div>
                  </div>
                ) : messages[selectedConversation.id]?.length > 0 ? (
                  messages[selectedConversation.id].map((message) => (
                    <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-start' : 'justify-end'} mb-4`}>
                      <div className="max-w-xs lg:max-w-md">
                        {(message.type === 'product' || message.messageType === 'PRODUCT') ? (
                          (() => {
                            // Parse product data from channelData if it's a new format message
                            let productData = message.product;
                            if (message.messageType === 'PRODUCT' && message.channelData) {
                              try {
                                const channelData = JSON.parse(message.channelData);
                                productData = channelData.product_data;
                              } catch (e) {
                                console.warn('Failed to parse product data:', e);
                              }
                            }
                            
                            return productData ? (
                              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                                {/* Product Image */}
                                <img 
                                  src={productData.image} 
                                  alt={productData.title}
                                  className="w-full h-32 object-cover"
                                />
                                {/* Product Info */}
                                <div className="p-3">
                                  <p className="text-lg font-semibold text-gray-900 mb-1">${productData.price}</p>
                                  <p className="text-sm text-gray-700 font-medium">{productData.title}</p>
                                  <a 
                                    href={`https://mister-sfc.myshopify.com/products/${productData.handle || productData.shopifyId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
                                  >
                                    View Product →
                                  </a>
                                </div>
                              </div>
                            ) : (
                              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                <p className="text-sm text-gray-600">{message.message || message.content}</p>
                              </div>
                            );
                          })()
                        ) : (
                          <div className={`rounded-lg p-3 ${
                            message.role === 'user' 
                              ? 'bg-gray-200 text-gray-900' 
                              : 'bg-blue-500 text-white'
                          }`}>
                            <p className="text-sm">{message.message}</p>
                          </div>
                        )}
                        <p className={`text-xs text-gray-500 mt-1 ${message.role === 'user' ? 'text-left' : 'text-right'}`}>
                          {message.timestamp} • {message.senderName || (message.role === 'user' ? 'Customer' : 'Agent')}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No messages yet</p>
                      <p className="text-xs text-gray-400 mt-1">Start a conversation!</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Message Input - Fixed */}
              <div className="p-4 border-t border-gray-200 flex-shrink-0">
                {!selectedConversation.isAiHandling ? (
                  <div className="flex space-x-2">
                    <Input 
                      placeholder="Type your message..." 
                      className="flex-1"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={sendingMessage}
                    />
                    <Button 
                      onClick={sendMessage}
                      disabled={!messageInput.trim() || sendingMessage}
                    >
                      {sendingMessage ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center space-x-2 text-gray-600">
                      <span className="text-sm">Conversation is under automated handling</span>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => toggleAiHandling(selectedConversation.id)}
                        className="ml-4 border-purple-300 text-purple-700 hover:bg-purple-100"
                      >
                        Take Over
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
                <p className="text-gray-500">Choose a conversation from the left to view messages</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Product Feed & Tickets Tabs - Fixed */}
        <div className="w-1/4 bg-white flex flex-col h-full">
          {/* Tab Headers - Fixed */}
          <div className="p-2 border-b border-gray-200 flex-shrink-0">
            <div className="flex space-x-1">
              <Button
                onClick={() => setRightTab('products')}
                variant={rightTab === 'products' ? 'default' : 'outline'}
                size="sm"
                className={`flex items-center space-x-1 text-xs ${
                  rightTab === 'products' 
                    ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Package className="w-3 h-3" />
                <span>Products</span>
              </Button>
              <Button
                onClick={() => setRightTab('tickets')}
                variant={rightTab === 'tickets' ? 'default' : 'outline'}
                size="sm"
                className={`flex items-center space-x-1 text-xs ${
                  rightTab === 'tickets' 
                    ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Ticket className="w-3 h-3" />
                <span>Tickets</span>
              </Button>
            </div>
          </div>

          {/* Tab Content - Scrollable */}
          <div className="flex-1 overflow-y-auto">
            {rightTab === 'products' ? (
              <div className="p-2 space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-900">Send Products</h3>
                  <Button size="sm" onClick={fetchProducts} className="text-xs">
                    <Plus className="w-3 h-3 mr-1" />
                    Refresh
                  </Button>
                </div>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                  </div>
                ) : products.length > 0 ? (
                  products.slice(0, 8).map((product) => (
                    <div key={product.id} className="border border-gray-200 rounded p-2 hover:shadow-sm transition-shadow">
                      <div className="flex space-x-2">
                        <img 
                          src={product.productImage} 
                          alt={product.productTitle} 
                          className="w-8 h-8 rounded object-cover flex-shrink-0"
                          onError={(e) => {
                            e.target.src = '/api/placeholder/32/32'
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-xs text-gray-900 truncate leading-tight">{product.productTitle}</h4>
                          <p className="text-xs text-gray-600">${product.productPrice}</p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="px-2 py-1 text-xs h-6"
                          onClick={() => {
                            if (selectedConversation) {
                              sendProductToCustomer(product, selectedConversation)
                            } else {
                              alert('Please select a conversation first')
                            }
                          }}
                          disabled={!selectedConversation}
                        >
                          <Send className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-sm">No products available</p>
                    <p className="text-gray-400 text-xs">Sync your Shopify products first</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-2 space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-900">Customer Tickets</h3>
                  <Button 
                    size="sm" 
                    className="text-xs"
                    onClick={() => selectedConversation && fetchTicketsForConversation(selectedConversation.id)}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Refresh
                  </Button>
                </div>
                
                {loadingTickets ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                  </div>
                ) : tickets.length > 0 ? (
                  tickets.map((ticket) => (
                    <div key={ticket.id} className="border border-gray-200 rounded p-2 hover:shadow-sm transition-shadow">
                      <div className="flex items-start justify-between mb-1">
                        <h4 className="font-medium text-xs text-gray-900">{ticket.ticketNumber}</h4>
                        <div className="flex flex-col items-end gap-1">
                          <Badge className={`text-xs ${getStatusColor(ticket.status)}`}>
                            {ticket.status?.toLowerCase()}
                          </Badge>
                          {ticket.timeRemaining && (
                            <Badge className={`text-xs ${getSlaStatusColor(ticket.slaStatus)}`}>
                              {ticket.timeRemaining}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-800 mb-1 truncate">{ticket.title}</p>
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>{formatTimestampForTicket(ticket.createdAt)}</span>
                        <span className={getPriorityColor(ticket.priority?.toLowerCase())}>{ticket.priority?.toLowerCase()}</span>
                      </div>
                      {ticket.category && (
                        <div className="flex items-center justify-between text-xs">
                          <Badge variant="outline" className="text-xs">
                            {ticket.category}
                          </Badge>
                          {ticket.linkedToConversation && (
                            <span className="text-xs text-blue-600">📎 Linked</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Ticket className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 text-sm">No tickets found</p>
                    {selectedConversation ? (
                      <p className="text-gray-400 text-xs">No support tickets for this customer</p>
                    ) : (
                      <p className="text-gray-400 text-xs">Select a conversation to view tickets</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </ProtectedRoute>
  )
}