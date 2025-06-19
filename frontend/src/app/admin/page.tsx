"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { 
  Users, UserPlus, Shield, Activity, Clock, CheckCircle, XCircle, 
  AlertTriangle, TrendingUp, Monitor, Eye, EyeOff, Settings, 
  BarChart3, PieChart, Calendar, MessageSquare, Ticket, 
  UserCheck, UserX, Edit, Trash2, Search, Filter, Download,
  Zap, Target, Award, AlertCircle, RefreshCw, Wifi, WifiOff,
  MousePointer, Keyboard, Video, Mic, Plus, Save, X, ArrowLeft, Send
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Navigation from "@/components/Navigation"
import ProtectedRoute from "@/components/ProtectedRoute"
import { useAuth } from "@/contexts/AuthContext"
import { getBackendUrl } from "@/utils/config"
import { useChat } from "@/hooks/useChat"

export default function AdminPage() {
  const { business, user } = useAuth()
  const router = useRouter()
  
  // Chat functionality
  const {
    chatRooms,
    selectedRoom,
    messages,
    typingIndicators,
    isConnected,
    startDirectChat,
    sendMessage,
    handleTyping,
    selectRoom
  } = useChat(user?.id || '', business?.id || '')
  
  // State management
  const [agents, setAgents] = useState([])
  const [analytics, setAnalytics] = useState({
    totalTickets: 0,
    avgResponseTime: 0,
    slaCompliance: 0,
    customerSatisfaction: 0,
    ticketsByStatus: {},
    ticketsByPriority: {},
    agentPerformance: [],
    escalatedTickets: []
  })
  const [realTimeData, setRealTimeData] = useState([])
  const [agentCredentials, setAgentCredentials] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [showAddAgent, setShowAddAgent] = useState(false)
  const [showCredentials, setShowCredentials] = useState(false)
  const [showEscalationManager, setShowEscalationManager] = useState(false)
  const [selectedEscalatedTicket, setSelectedEscalatedTicket] = useState(null)
  const [escalationStep, setEscalationStep] = useState(1) // 1: Review, 2: Response, 3: Reassign
  const [adminResponse, setAdminResponse] = useState('')
  const [reassignTo, setReassignTo] = useState('')
  const [escalationLoading, setEscalationLoading] = useState(false)
  const [notification, setNotification] = useState(null)
  const [messageInput, setMessageInput] = useState('')
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [agentFilters, setAgentFilters] = useState({
    status: 'all',
    role: 'all',
    search: ''
  })
  
  // Form state for adding/editing agents
  const [agentForm, setAgentForm] = useState({
    name: '',
    email: '',
    role: 'agent',
    permissions: {
      inbox: true,
      tickets: true,
      analytics: false,
      settings: false,
      admin: false
    },
    shiftSchedule: {
      start: '09:00',
      end: '17:00',
      timezone: 'UTC',
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    }
  })

  // Real-time monitoring refs
  const activityInterval = useRef(null)
  const presenceInterval = useRef(null)
  const analyticsInterval = useRef(null)

  // Check if user is admin
  const isAdmin = user?.role === 'admin' || user?.role === 'owner'

  // Debug logging
  console.log('Admin page - User:', user)
  console.log('Admin page - Is admin:', isAdmin)

  useEffect(() => {
    if (user && !isAdmin) {
      console.log('Access denied - User role:', user.role, 'Is admin:', isAdmin)
      router.push('/tickets')
      return
    }
    
    if (business?.id) {
      fetchAgents()
      fetchAnalytics()
      fetchAgentCredentials()
      fetchPresenceData()
      startRealTimeMonitoring()
    }

    return () => {
      if (activityInterval.current) clearInterval(activityInterval.current)
      if (presenceInterval.current) clearInterval(presenceInterval.current)
      if (analyticsInterval.current) clearInterval(analyticsInterval.current)
    }
  }, [business?.id, isAdmin])

  // Auto-dismiss success notifications after 5 seconds
  useEffect(() => {
    if (notification && notification.type === 'success') {
      const timer = setTimeout(() => {
        setNotification(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  // Handle sending messages
  const handleSendMessage = async () => {
    if (!selectedRoom || !messageInput.trim() || isSendingMessage) return
    
    setIsSendingMessage(true)
    try {
      const messageType = messageInput.includes('#TK-') ? 'ticket_tag' : 'text'
      await sendMessage(selectedRoom.id, messageInput, messageType)
      setMessageInput('')
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setIsSendingMessage(false)
    }
  }

  // Handle starting direct chat
  const handleStartDirectChat = async (agentId: string) => {
    if (agentId === user?.id) return // Can't chat with yourself
    
    try {
      const room = await startDirectChat(agentId)
      if (room) {
        selectRoom(room)
      }
    } catch (error) {
      console.error('Error starting chat:', error)
    }
  }

  const fetchAgents = async () => {
    try {
      setLoading(true)
      const backendUrl = await getBackendUrl()
      const response = await fetch(`${backendUrl}/api/admin/agents/${business?.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        setAgents(data.data || [])
      }
    } catch (error) {
      console.error("Error fetching agents:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAnalytics = async () => {
    try {
      const backendUrl = await getBackendUrl()
      const response = await fetch(`${backendUrl}/api/admin/analytics/${business?.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data.data || analytics)
      }
    } catch (error) {
      console.error("Error fetching analytics:", error)
    }
  }

  // Fetch presence data for all agents
  const fetchPresenceData = async () => {
    try {
      const backendUrl = await getBackendUrl()
      console.log('Fetching presence data for business:', business?.id)
      
      const response = await fetch(`${backendUrl}/api/admin/presence/${business?.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('Fetched presence data:', {
          success: data.success,
          agentCount: data.data?.length || 0,
          agents: data.data?.map(agent => ({
            name: agent.name,
            isOnline: agent.isOnline,
            isActive: agent.isActive,
            lastSeen: agent.lastSeen,
            screen: agent.screen
          })) || []
        })
        setRealTimeData(data.data || [])
      } else {
        console.error('Failed to fetch presence data:', response.status, response.statusText)
      }
    } catch (error) {
      console.error('Error fetching presence data:', error)
    }
  }

  const fetchAgentCredentials = async () => {
    try {
      const backendUrl = await getBackendUrl()
      const response = await fetch(`${backendUrl}/api/agent-credentials/notifications/${user?.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        setAgentCredentials(data.data || [])
      }
    } catch (error) {
      console.error("Error fetching agent credentials:", error)
    }
  }

  // Complete escalation workflow
  const completeEscalation = async () => {
    if (!selectedEscalatedTicket || !adminResponse.trim() || !reassignTo) {
      setNotification({
        type: 'error',
        message: 'Please fill in all required fields before completing the escalation.'
      })
      return
    }

    setEscalationLoading(true)
    setNotification(null)

    try {
      const backendUrl = await getBackendUrl()
      const response = await fetch(`${backendUrl}/api/tickets/${selectedEscalatedTicket.id}/complete-escalation`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          adminResponse: adminResponse.trim(),
          reassignTo: reassignTo,
          adminId: user?.id,
          adminName: `${user?.firstName} ${user?.lastName}`
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        
        // Find assigned agent's name for the success message
        const assignedAgent = agents.find(agent => agent.id === reassignTo)
        const agentName = assignedAgent ? `${assignedAgent.firstName} ${assignedAgent.lastName}` : 'selected agent'
        
        setNotification({
          type: 'success',
          message: `Escalation completed successfully! Ticket ${selectedEscalatedTicket.ticketNumber} has been reassigned to ${agentName}.`
        })
        
        // Reset form state
        setShowEscalationManager(false)
        setEscalationStep(1)
        setAdminResponse('')
        setReassignTo('')
        setSelectedEscalatedTicket(null)
        
        // Refresh analytics to update escalated tickets list
        fetchAnalytics()
        
        console.log('Escalation completed successfully:', data.message)
      } else {
        const errorData = await response.json()
        setNotification({
          type: 'error',
          message: `Failed to complete escalation: ${errorData.error || errorData.message || 'Unknown error occurred'}`
        })
        console.error('Failed to complete escalation:', errorData)
      }
    } catch (error) {
      setNotification({
        type: 'error',
        message: `Network error: Unable to complete escalation. Please check your connection and try again.`
      })
      console.error('Error completing escalation:', error)
    } finally {
      setEscalationLoading(false)
    }
  }

  const markCredentialAsViewed = async (notificationId: string) => {
    try {
      const backendUrl = await getBackendUrl()
      await fetch(`${backendUrl}/api/agent-credentials/notifications/${notificationId}/viewed`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })
      // Refresh credentials list
      fetchAgentCredentials()
    } catch (error) {
      console.error("Error marking credential as viewed:", error)
    }
  }

  // Real-time monitoring with modern web APIs
  const startRealTimeMonitoring = () => {
    // Activity monitoring using Page Visibility API, Intersection Observer, and Mouse/Keyboard events
    const updateAgentActivity = async () => {
      const isVisible = !document.hidden
      const lastActivity = localStorage.getItem('lastActivity')
      const currentTime = Date.now()
      
      // Check for user activity in last 30 seconds
      const isActive = currentTime - parseInt(lastActivity || 0) < 30000
      
      // Get more detailed presence info
      const presenceData = {
        isOnline: navigator.onLine,
        isVisible,
        isActive,
        screen: {
          width: screen.width,
          height: screen.height,
          available: {
            width: screen.availWidth,
            height: screen.availHeight
          }
        },
        connection: (navigator as any).connection ? {
          effectiveType: (navigator as any).connection.effectiveType,
          downlink: (navigator as any).connection.downlink,
          rtt: (navigator as any).connection.rtt
        } : null,
        battery: (navigator as any).getBattery ? await (navigator as any).getBattery() : null,
        permissions: {
          camera: await checkPermission('camera'),
          microphone: await checkPermission('microphone'),
          notifications: await checkPermission('notifications')
        },
        timestamp: currentTime
      }

      // Update local agent presence data
      setRealTimeData(prevData => {
        const newData = [...prevData]
        const agentIndex = newData.findIndex(a => a.userId === user?.id)
        if (agentIndex >= 0) {
          newData[agentIndex] = { ...newData[agentIndex], ...presenceData }
        } else {
          newData.push({
            userId: user?.id,
            name: user?.name || 'Current User',
            ...presenceData
          })
        }
        return newData
      })

      // Send to backend
      try {
        const backendUrl = await getBackendUrl()
        await fetch(`${backendUrl}/api/admin/presence`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          },
          body: JSON.stringify(presenceData)
        })
      } catch (error) {
        console.error("Error updating presence:", error)
      }
    }

    // Monitor activity every 10 seconds
    activityInterval.current = setInterval(updateAgentActivity, 10000)

    // Fetch presence data every 15 seconds
    presenceInterval.current = setInterval(fetchPresenceData, 15000)

    // Refresh analytics every 30 seconds to reflect ticket status changes
    analyticsInterval.current = setInterval(fetchAnalytics, 30000)

    // Track user interactions
    const trackActivity = () => {
      localStorage.setItem('lastActivity', Date.now().toString())
    }

    // Add event listeners for activity detection
    document.addEventListener('mousemove', trackActivity)
    document.addEventListener('keypress', trackActivity)
    document.addEventListener('click', trackActivity)
    document.addEventListener('scroll', trackActivity)
    
    // Visibility change detection
    document.addEventListener('visibilitychange', updateAgentActivity)
    window.addEventListener('online', updateAgentActivity)
    window.addEventListener('offline', updateAgentActivity)

    // Initial call
    updateAgentActivity()
  }

  const checkPermission = async (name: string) => {
    try {
      const result = await navigator.permissions.query({ name: name as PermissionName })
      return result.state
    } catch {
      return 'unknown'
    }
  }

  const addAgent = async () => {
    try {
      console.log('Creating agent with data:', {
        ...agentForm,
        businessId: business?.id
      })
      
      const backendUrl = await getBackendUrl()
      const response = await fetch(`${backendUrl}/api/admin/agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          ...agentForm,
          businessId: business?.id
        })
      })

      console.log('Create agent response status:', response.status)
      
      if (response.ok) {
        const result = await response.json()
        console.log('Agent created successfully:', result)
        
        setShowAddAgent(false)
        setAgentForm({
          name: '',
          email: '',
          role: 'agent',
          permissions: {
            inbox: true,
            tickets: true,
            analytics: false,
            settings: false,
            admin: false
          },
          shiftSchedule: {
            start: '09:00',
            end: '17:00',
            timezone: 'UTC',
            days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
          }
        })
        fetchAgents()
        fetchAgentCredentials() // Refresh credentials list
        
        // Auto-open credentials panel and show success message
        setShowCredentials(true)
        alert(`Agent created successfully! Login credentials saved to "Agent Logins" panel.`)
      } else {
        const error = await response.json()
        console.error('Failed to create agent:', error)
        alert(`Failed to create agent: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error("Error adding agent:", error)
      alert(`Error creating agent: ${error.message}`)
    }
  }

  const toggleAgentStatus = async (agentId: string, isActive: boolean) => {
    try {
      const backendUrl = await getBackendUrl()
      await fetch(`${backendUrl}/api/admin/agents/${agentId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ isActive: !isActive })
      })
      fetchAgents()
    } catch (error) {
      console.error("Error updating agent status:", error)
    }
  }

  const deleteAgent = async (agentId: string) => {
    if (!confirm('Are you sure you want to delete this agent?')) return
    
    try {
      const backendUrl = await getBackendUrl()
      await fetch(`${backendUrl}/api/admin/agents/${agentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })
      fetchAgents()
    } catch (error) {
      console.error("Error deleting agent:", error)
    }
  }

  const getActivityStatus = (agent: any) => {
    const presence = realTimeData.find(p => p.userId === agent.id)
    if (!presence) return { status: 'offline', color: 'text-gray-500', icon: WifiOff }
    
    if (!presence.isOnline) return { status: 'offline', color: 'text-gray-500', icon: WifiOff }
    if (!presence.isVisible) return { status: 'away', color: 'text-yellow-500', icon: EyeOff }
    if (!presence.isActive) return { status: 'idle', color: 'text-orange-500', icon: Clock }
    return { status: 'active', color: 'text-green-500', icon: Wifi }
  }

  const formatTimestamp = (timestamp: number | null | undefined) => {
    if (!timestamp || timestamp === 0) return 'Never'
    
    const date = new Date(timestamp)
    
    // Check if date is invalid
    if (isNaN(date.getTime())) return 'Never'
    
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return date.toLocaleDateString()
  }

  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name?.toLowerCase().includes(agentFilters.search.toLowerCase()) ||
                         agent.email?.toLowerCase().includes(agentFilters.search.toLowerCase())
    const matchesStatus = agentFilters.status === 'all' || 
                         (agentFilters.status === 'active' && agent.isActive) ||
                         (agentFilters.status === 'inactive' && !agent.isActive)
    const matchesRole = agentFilters.role === 'all' || agent.role === agentFilters.role
    
    return matchesSearch && matchesStatus && matchesRole
  })

  // Show loading while checking auth
  if (!user) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      </ProtectedRoute>
    )
  }

  if (!isAdmin) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600 mb-4">You need admin privileges to access this page.</p>
            <p className="text-sm text-gray-500">Your role: {user?.role}</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 flex">
        <Navigation />
        
        <div className="flex-1 p-6">
          {/* Notification Banner */}
          {notification && (
            <div className={`mb-6 p-4 rounded-lg border ${
              notification.type === 'success' 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {notification.type === 'success' ? (
                    <CheckCircle className="w-5 h-5 mr-2" />
                  ) : (
                    <XCircle className="w-5 h-5 mr-2" />
                  )}
                  <span className="font-medium">{notification.message}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setNotification(null)}
                  className="text-current hover:bg-current/10"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
          
          {/* Header */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-gray-600">Manage agents, monitor performance, and oversee ticket operations</p>
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={fetchAnalytics} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Data
                </Button>
                
                <Button onClick={fetchPresenceData} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Presence
                </Button>
                
                {/* Agent Credentials Notifications */}
                <Dialog open={showCredentials} onOpenChange={setShowCredentials}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="relative">
                      <Settings className="w-4 h-4 mr-2" />
                      Agent Logins
                      {agentCredentials.length > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                          {agentCredentials.length}
                        </span>
                      )}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Agent Login Credentials</DialogTitle>
                      <DialogDescription>
                        Newly created agent accounts with temporary passwords. Share these credentials securely with the respective agents.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-4 py-4 max-h-96 overflow-y-auto">
                      {agentCredentials.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <Settings className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                          <p>No pending agent credentials</p>
                          <p className="text-sm">New agent logins will appear here</p>
                        </div>
                      ) : (
                        agentCredentials.map((credential: any) => (
                          <div key={credential.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="font-semibold text-gray-900">{credential.agentName}</h3>
                                <p className="text-sm text-gray-600">{credential.agentEmail}</p>
                                <div className="mt-2 p-3 bg-white rounded border border-yellow-200 bg-yellow-50">
                                  <p className="text-sm font-medium text-yellow-800">Temporary Password:</p>
                                  <code className="text-lg font-mono bg-yellow-100 px-2 py-1 rounded text-yellow-900">
                                    {credential.tempPassword}
                                  </code>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                  Created: {new Date(credential.createdAt).toLocaleString()}
                                </p>
                              </div>
                              <Button 
                                onClick={() => markCredentialAsViewed(credential.id)}
                                size="sm" 
                                variant="outline"
                                className="ml-4"
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Mark as Sent
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    
                    <div className="flex justify-end pt-4 border-t">
                      <Button onClick={() => setShowCredentials(false)}>
                        Close
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                
                <Dialog open={showAddAgent} onOpenChange={setShowAddAgent}>
                  <DialogTrigger asChild>
                    <Button>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add Agent
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Add New Agent</DialogTitle>
                      <DialogDescription>
                        Create a new customer support agent account with specific permissions and schedule.
                      </DialogDescription>
                    </DialogHeader>
                    
                    <div className="space-y-6 py-4">
                      {/* Basic Information */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Basic Information</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-700">Full Name</label>
                            <Input
                              value={agentForm.name}
                              onChange={(e) => setAgentForm({...agentForm, name: e.target.value})}
                              placeholder="John Doe"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Email</label>
                            <Input
                              type="email"
                              value={agentForm.email}
                              onChange={(e) => setAgentForm({...agentForm, email: e.target.value})}
                              placeholder="john@company.com"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">Role</label>
                          <Select 
                            value={agentForm.role} 
                            onValueChange={(value) => setAgentForm({...agentForm, role: value})}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="agent">Support Agent</SelectItem>
                              <SelectItem value="senior_agent">Senior Agent</SelectItem>
                              <SelectItem value="team_lead">Team Lead</SelectItem>
                              <SelectItem value="supervisor">Supervisor</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Permissions */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Permissions</h3>
                        <div className="grid grid-cols-2 gap-4">
                          {Object.entries(agentForm.permissions).map(([key, value]) => (
                            <div key={key} className="flex items-center justify-between">
                              <label className="text-sm font-medium text-gray-700 capitalize">
                                {key.replace('_', ' ')}
                              </label>
                              <Switch
                                checked={value}
                                onCheckedChange={(checked) => 
                                  setAgentForm({
                                    ...agentForm, 
                                    permissions: {...agentForm.permissions, [key]: checked}
                                  })
                                }
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Shift Schedule */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Shift Schedule</h3>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-700">Start Time</label>
                            <Input
                              type="time"
                              value={agentForm.shiftSchedule.start}
                              onChange={(e) => setAgentForm({
                                ...agentForm,
                                shiftSchedule: {...agentForm.shiftSchedule, start: e.target.value}
                              })}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">End Time</label>
                            <Input
                              type="time"
                              value={agentForm.shiftSchedule.end}
                              onChange={(e) => setAgentForm({
                                ...agentForm,
                                shiftSchedule: {...agentForm.shiftSchedule, end: e.target.value}
                              })}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium text-gray-700">Timezone</label>
                            <Select 
                              value={agentForm.shiftSchedule.timezone}
                              onValueChange={(value) => setAgentForm({
                                ...agentForm,
                                shiftSchedule: {...agentForm.shiftSchedule, timezone: value}
                              })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="UTC">UTC</SelectItem>
                                <SelectItem value="EST">EST</SelectItem>
                                <SelectItem value="PST">PST</SelectItem>
                                <SelectItem value="GMT">GMT</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setShowAddAgent(false)}>
                          Cancel
                        </Button>
                        <Button onClick={addAgent}>
                          <Save className="w-4 h-4 mr-2" />
                          Create Agent
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="agents">Agents</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="monitoring">Live Monitoring</TabsTrigger>
              <TabsTrigger value="chat">Team Chat</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">Total Tickets</p>
                        <p className="text-3xl font-bold text-gray-900">{analytics.totalTickets}</p>
                        <p className="text-xs text-green-600 mt-1">+12% from last week</p>
                      </div>
                      <Ticket className="w-8 h-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                        <p className="text-3xl font-bold text-gray-900">{analytics.avgResponseTime}h</p>
                        <p className="text-xs text-red-600 mt-1">+5% from last week</p>
                      </div>
                      <Clock className="w-8 h-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">SLA Compliance</p>
                        <p className="text-3xl font-bold text-gray-900">{analytics.slaCompliance}%</p>
                        <p className="text-xs text-green-600 mt-1">+3% from last week</p>
                      </div>
                      <Target className="w-8 h-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">Active Agents</p>
                        <p className="text-3xl font-bold text-gray-900">{agents.filter(a => a.isActive).length}</p>
                        <p className="text-xs text-gray-600 mt-1">of {agents.length} total</p>
                      </div>
                      <Users className="w-8 h-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Performing Agents</CardTitle>
                    <CardDescription>Based on SLA compliance and customer satisfaction</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analytics.agentPerformance.slice(0, 5).map((agent, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-medium ${
                              index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-500' : 'bg-blue-500'
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium">{agent.name}</p>
                              <p className="text-sm text-gray-500">{agent.ticketsResolved} tickets resolved</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-green-600">{agent.slaCompliance}%</p>
                            <p className="text-sm text-gray-500">SLA compliance</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Ticket Status Breakdown</CardTitle>
                    <CardDescription>Real-time distribution of tickets by status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(analytics.ticketsByStatus).map(([status, count]) => {
                        const total = Object.values(analytics.ticketsByStatus).reduce((sum, val) => sum + val, 0)
                        const percentage = total > 0 ? Math.round((count / total) * 100) : 0
                        const statusConfig = {
                          'OPEN': { 
                            color: 'bg-red-500', 
                            textColor: 'text-red-600', 
                            label: 'Open',
                            icon: AlertTriangle
                          },
                          'IN_PROGRESS': { 
                            color: 'bg-blue-500', 
                            textColor: 'text-blue-600', 
                            label: 'In Progress',
                            icon: Activity
                          },
                          'RESOLVED': { 
                            color: 'bg-green-500', 
                            textColor: 'text-green-600', 
                            label: 'Resolved',
                            icon: CheckCircle
                          },
                          'CLOSED': { 
                            color: 'bg-gray-500', 
                            textColor: 'text-gray-600', 
                            label: 'Closed',
                            icon: XCircle
                          }
                        }
                        const config = statusConfig[status] || { 
                          color: 'bg-gray-400', 
                          textColor: 'text-gray-600', 
                          label: status,
                          icon: Ticket
                        }
                        const IconComponent = config.icon
                        
                        return (
                          <div key={status} className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={`w-3 h-3 ${config.color} rounded-full`}></div>
                              <div className="flex items-center space-x-2">
                                <IconComponent className="w-4 h-4 text-gray-500" />
                                <span className="font-medium">{config.label}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className={`font-medium ${config.textColor}`}>{count}</span>
                              <span className="text-sm text-gray-500 ml-2">({percentage}%)</span>
                            </div>
                          </div>
                        )
                      })}
                      {Object.keys(analytics.ticketsByStatus).length === 0 && (
                        <div className="text-center py-4 text-gray-500">
                          <Ticket className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p>No ticket data available</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Escalated Tickets Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Escalated Tickets</CardTitle>
                  <CardDescription>Tickets requiring management attention</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics.escalatedTickets && analytics.escalatedTickets.length > 0 ? (
                      analytics.escalatedTickets.map((ticket, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border border-orange-200 rounded-lg bg-orange-50">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-medium">
                              <AlertTriangle className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{ticket.ticketNumber}</p>
                              <p className="text-sm text-gray-600">{ticket.title}</p>
                              <p className="text-xs text-gray-500">
                                Previously assigned to: {ticket.assignedTo || 'Unassigned'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                                Escalated
                              </Badge>
                              <Button 
                                size="sm" 
                                className="text-xs bg-orange-600 hover:bg-orange-700"
                                onClick={() => {
                                  setSelectedEscalatedTicket(ticket)
                                  setEscalationStep(1)
                                  setAdminResponse('')
                                  setReassignTo('')
                                  setShowEscalationManager(true)
                                }}
                              >
                                <Settings className="w-3 h-3 mr-1" />
                                Handle
                              </Button>
                            </div>
                            <p className="text-xs text-gray-500">
                              {new Date(ticket.updatedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-gray-500">
                        <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No escalated tickets</p>
                        <p className="text-xs mt-1">All tickets are being handled at normal level</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Agents Tab */}
            <TabsContent value="agents" className="space-y-6">
              {/* Agents Filter */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-wrap gap-4">
                    <div className="flex-1 min-w-64">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <Input 
                          placeholder="Search agents by name or email..." 
                          className="pl-10"
                          value={agentFilters.search}
                          onChange={(e) => setAgentFilters({...agentFilters, search: e.target.value})}
                        />
                      </div>
                    </div>
                    
                    <Select value={agentFilters.status} onValueChange={(value) => setAgentFilters({...agentFilters, status: value})}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={agentFilters.role} onValueChange={(value) => setAgentFilters({...agentFilters, role: value})}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="agent">Agent</SelectItem>
                        <SelectItem value="senior_agent">Senior Agent</SelectItem>
                        <SelectItem value="team_lead">Team Lead</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Agents List */}
              <Card>
                <CardHeader>
                  <CardTitle>Customer Support Agents ({filteredAgents.length})</CardTitle>
                  <CardDescription>Manage agent accounts, permissions, and performance</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                    </div>
                  ) : filteredAgents.length > 0 ? (
                    <div className="space-y-4">
                      {filteredAgents.map((agent) => {
                        const activityStatus = getActivityStatus(agent)
                        const presence = realTimeData.find(p => p.userId === agent.id)
                        
                        return (
                          <div key={agent.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-sm transition-shadow">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-4">
                                <div className="relative">
                                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center text-white font-semibold text-lg">
                                    {agent.name?.[0]?.toUpperCase() || 'A'}
                                  </div>
                                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 border-2 border-white rounded-full ${
                                    activityStatus.status === 'active' ? 'bg-green-500' :
                                    activityStatus.status === 'idle' ? 'bg-yellow-500' :
                                    activityStatus.status === 'away' ? 'bg-orange-500' : 'bg-gray-400'
                                  }`}></div>
                                </div>
                                
                                <div className="flex-1">
                                  <div className="flex items-center space-x-3 mb-2">
                                    <h3 className="text-lg font-semibold text-gray-900">{agent.name}</h3>
                                    <Badge variant="outline" className="capitalize">
                                      {agent.role?.replace('_', ' ')}
                                    </Badge>
                                    <Badge className={agent.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                                      {agent.isActive ? 'Active' : 'Inactive'}
                                    </Badge>
                                  </div>
                                  
                                  <p className="text-gray-600 mb-3">{agent.email}</p>
                                  
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <p className="text-gray-500">Activity Status</p>
                                      <div className="flex items-center space-x-1">
                                        <activityStatus.icon className={`w-4 h-4 ${activityStatus.color}`} />
                                        <span className={`font-medium capitalize ${activityStatus.color}`}>
                                          {activityStatus.status}
                                        </span>
                                      </div>
                                    </div>
                                    
                                    <div>
                                      <p className="text-gray-500">Last Seen</p>
                                      <p className="font-medium">
                                        {presence?.timestamp ? formatTimestamp(presence.timestamp) : 'Never'}
                                      </p>
                                    </div>
                                    
                                    <div>
                                      <p className="text-gray-500">Tickets Handled</p>
                                      <p className="font-medium">{agent.ticketsHandled || 0} this month</p>
                                    </div>
                                    
                                    <div>
                                      <p className="text-gray-500">SLA Compliance</p>
                                      <p className={`font-medium ${
                                        (agent.slaCompliance || 0) >= 90 ? 'text-green-600' :
                                        (agent.slaCompliance || 0) >= 70 ? 'text-yellow-600' : 'text-red-600'
                                      }`}>
                                        {agent.slaCompliance || 0}%
                                      </p>
                                    </div>
                                  </div>

                                  {/* Permissions */}
                                  <div className="mt-4">
                                    <p className="text-gray-500 text-sm mb-2">Permissions</p>
                                    <div className="flex flex-wrap gap-2">
                                      {Object.entries(agent.permissions || {}).filter(([_, value]) => value).map(([key]) => (
                                        <Badge key={key} variant="outline" className="text-xs capitalize">
                                          {key.replace('_', ' ')}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setSelectedAgent(agent)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => toggleAgentStatus(agent.id, agent.isActive)}
                                  className={agent.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
                                >
                                  {agent.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                                </Button>
                                
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => deleteAgent(agent.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No agents found</p>
                      <p className="text-gray-400 text-sm">Add your first customer support agent to get started</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Analytics Tab */}
            <TabsContent value="analytics" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Ticket Volume Trends</CardTitle>
                    <CardDescription>Daily ticket creation over the last 30 days</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center text-gray-500">
                      <BarChart3 className="w-16 h-16 mb-4" />
                      <p>Chart visualization would go here</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Response Time Distribution</CardTitle>
                    <CardDescription>Agent response times across different priority levels</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64 flex items-center justify-center text-gray-500">
                      <PieChart className="w-16 h-16 mb-4" />
                      <p>Chart visualization would go here</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>SLA Performance</CardTitle>
                    <CardDescription>SLA compliance rates by agent and time period</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analytics.agentPerformance.map((agent, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{agent.name}</p>
                            <p className="text-sm text-gray-500">{agent.ticketsResolved} tickets</p>
                          </div>
                          <div className="text-right">
                            <p className={`font-medium ${
                              agent.slaCompliance >= 90 ? 'text-green-600' :
                              agent.slaCompliance >= 70 ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {agent.slaCompliance}%
                            </p>
                            <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                              <div 
                                className={`h-2 rounded-full ${
                                  agent.slaCompliance >= 90 ? 'bg-green-500' :
                                  agent.slaCompliance >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${agent.slaCompliance}%` }}
                              ></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Customer Satisfaction</CardTitle>
                    <CardDescription>Average CSAT scores and trends</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <div className="text-4xl font-bold text-green-600 mb-2">
                        {analytics.customerSatisfaction}%
                      </div>
                      <p className="text-gray-600">Average CSAT Score</p>
                      <div className="flex justify-center items-center mt-4 space-x-4">
                        <div className="flex items-center">
                          <Award className="w-5 h-5 text-green-500 mr-1" />
                          <span className="text-sm text-gray-600">Excellent Service</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Live Monitoring Tab */}
            <TabsContent value="monitoring" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Real-Time Agent Monitoring</CardTitle>
                  <CardDescription>Live activity status, presence detection, and system monitoring</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {realTimeData.map((presence, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="relative">
                              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-semibold">
                                {presence.name?.[0]?.toUpperCase() || 'A'}
                              </div>
                              <div className={`absolute -bottom-1 -right-1 w-4 h-4 border-2 border-white rounded-full ${
                                presence.isActive ? 'bg-green-500' : 
                                presence.isVisible ? 'bg-yellow-500' : 
                                presence.isOnline ? 'bg-orange-500' : 'bg-gray-400'
                              }`}></div>
                            </div>
                            <div>
                              <h3 className="font-semibold">{presence.name}</h3>
                              <p className="text-sm text-gray-500">Last activity: {formatTimestamp(presence.timestamp)}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4">
                            {presence.isOnline ? (
                              <Badge className="bg-green-100 text-green-700">
                                <Wifi className="w-3 h-3 mr-1" />
                                Online
                              </Badge>
                            ) : (
                              <Badge className="bg-gray-100 text-gray-700">
                                <WifiOff className="w-3 h-3 mr-1" />
                                Offline
                              </Badge>
                            )}
                            
                            {presence.isVisible ? (
                              <Badge variant="outline">
                                <Eye className="w-3 h-3 mr-1" />
                                Visible
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-orange-600">
                                <EyeOff className="w-3 h-3 mr-1" />
                                Away
                              </Badge>
                            )}
                            
                            {presence.isActive && (
                              <Badge variant="outline" className="text-green-600">
                                <MousePointer className="w-3 h-3 mr-1" />
                                Active
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Technical Details */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-gray-500">Screen Resolution</p>
                            <p className="font-medium">
                              {presence.screen?.width}x{presence.screen?.height}
                            </p>
                          </div>
                          
                          {presence.connection && (
                            <div>
                              <p className="text-gray-500">Connection</p>
                              <p className="font-medium">
                                {presence.connection.effectiveType} ({presence.connection.downlink}Mbps)
                              </p>
                            </div>
                          )}
                          
                          {presence.permissions && (
                            <div>
                              <p className="text-gray-500">Camera Access</p>
                              <div className="flex items-center space-x-1">
                                <Video className={`w-4 h-4 ${
                                  presence.permissions.camera === 'granted' ? 'text-green-500' : 'text-gray-400'
                                }`} />
                                <span className="capitalize">{presence.permissions.camera}</span>
                              </div>
                            </div>
                          )}
                          
                          {presence.permissions && (
                            <div>
                              <p className="text-gray-500">Microphone Access</p>
                              <div className="flex items-center space-x-1">
                                <Mic className={`w-4 h-4 ${
                                  presence.permissions.microphone === 'granted' ? 'text-green-500' : 'text-gray-400'
                                }`} />
                                <span className="capitalize">{presence.permissions.microphone}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {presence.battery && (
                          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                            <p className="text-sm text-gray-600 mb-2">Device Battery</p>
                            <div className="flex items-center space-x-3">
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${
                                    presence.battery.level > 0.5 ? 'bg-green-500' :
                                    presence.battery.level > 0.2 ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${presence.battery.level * 100}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium">
                                {Math.round(presence.battery.level * 100)}%
                                {presence.battery.charging && ' (Charging)'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Team Chat Tab */}
            <TabsContent value="chat" className="space-y-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm text-gray-600">
                    {isConnected ? 'Connected to chat' : 'Connecting...'}
                  </span>
                </div>
                {chatRooms.length > 0 && (
                  <Badge variant="outline">
                    {chatRooms.length} chat{chatRooms.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
                {/* Compact Sidebar - Team & Chats */}
                <Card className="lg:col-span-1">
                  <CardContent className="p-0 h-full">
                    <div className="h-full flex flex-col">
                      {/* Team Members - Compact List */}
                      <div className="border-b border-gray-200">
                        <div className="p-3 bg-gray-50">
                          <h3 className="text-xs font-semibold text-gray-700 flex items-center gap-2">
                            <Users className="w-3 h-3" />
                            Team ({agents.filter(agent => agent.isActive && agent.id !== user?.id).length})
                          </h3>
                        </div>
                        <div className="p-2 max-h-32 overflow-y-auto">
                          <div className="flex flex-wrap gap-1">
                            {agents.filter(agent => agent.isActive && agent.id !== user?.id).slice(0, 6).map((agent) => {
                              const activityStatus = getActivityStatus(agent)
                              
                              return (
                                <div 
                                  key={agent.id} 
                                  className="flex items-center p-1 hover:bg-gray-50 cursor-pointer transition-colors group rounded"
                                  onClick={() => handleStartDirectChat(agent.id)}
                                  title={`${agent.firstName} ${agent.lastName} - ${agent.role}`}
                                >
                                  <div className="relative">
                                    <div className="w-6 h-6 bg-gradient-to-br from-gray-500 to-gray-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                                      {agent.firstName?.[0]}{agent.lastName?.[0]}
                                    </div>
                                    <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${
                                      activityStatus.status === 'active' ? 'bg-green-500' : 
                                      activityStatus.status === 'idle' ? 'bg-yellow-500' :
                                      activityStatus.status === 'away' ? 'bg-orange-500' : 'bg-gray-400'
                                    }`}></div>
                                  </div>
                                </div>
                              )
                            })}
                            {agents.filter(agent => agent.isActive && agent.id !== user?.id).length > 6 && (
                              <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 text-xs font-medium">
                                +{agents.filter(agent => agent.isActive && agent.id !== user?.id).length - 6}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Active Chats - Full List */}
                      <div className="flex-1 flex flex-col">
                        <div className="p-3 bg-gray-50 border-b border-gray-200">
                          <h3 className="text-xs font-semibold text-gray-700 flex items-center gap-2">
                            <MessageSquare className="w-3 h-3" />
                            Active Chats ({chatRooms.length})
                          </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                          {chatRooms.length > 0 ? (
                            <div className="space-y-1 p-2">
                              {chatRooms.map((room) => {
                                const otherParticipant = room.participants.find(p => p.userId !== user?.id)
                                const isSelected = selectedRoom?.id === room.id
                                
                                return (
                                  <div 
                                    key={room.id}
                                    className={`flex items-center p-2 hover:bg-gray-50 cursor-pointer transition-colors rounded ${
                                      isSelected ? 'bg-blue-50 border border-blue-200' : ''
                                    }`}
                                    onClick={() => selectRoom(room)}
                                  >
                                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                                      <div className="relative">
                                        <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-semibold text-xs">
                                          {otherParticipant ? 
                                            `${otherParticipant.user.firstName?.[0]}${otherParticipant.user.lastName?.[0]}` : 
                                            'GC'
                                          }
                                        </div>
                                        {room.type === 'direct' && otherParticipant && (
                                          <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-500 rounded-full border border-white"></div>
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 text-xs truncate">
                                          {room.type === 'direct' && otherParticipant ? 
                                            `${otherParticipant.user.firstName} ${otherParticipant.user.lastName}` :
                                            room.name || `Group Chat`
                                          }
                                        </p>
                                        <p className="text-xs text-gray-500 truncate">
                                          {room.messages?.[0]?.content || 'Start chatting...'}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <div className="text-center text-gray-500 py-8">
                              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              <p className="text-xs">No active chats</p>
                              <p className="text-xs text-gray-400">Start by messaging a team member</p>
                            </div>
                          )}
                        </div>
                        
                        {/* Quick Action */}
                        <div className="p-2 border-t border-gray-200">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full text-xs h-7"
                            onClick={() => {
                              console.log('Create group chat')
                            }}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            New Chat
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Main Chat Area with Integrated Context */}
                <Card className="lg:col-span-2">
                  <CardHeader className="border-b border-gray-200 pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {selectedRoom ? (
                            <>
                              <MessageSquare className="w-5 h-5" />
                              {(() => {
                                const otherParticipant = selectedRoom.participants.find(p => p.userId !== user?.id);
                                return selectedRoom.type === 'direct' && otherParticipant ? 
                                  `${otherParticipant.user.firstName} ${otherParticipant.user.lastName}` :
                                  selectedRoom.name || 'Group Chat'
                              })()}
                            </>
                          ) : (
                            'Team Chat & Tickets'
                          )}
                        </CardTitle>
                        <CardDescription>
                          {selectedRoom ? 
                            'Real-time messaging with ticket integration' :
                            'Select a chat to start messaging or view recent tickets'
                          }
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedRoom && (
                          <Button variant="outline" size="sm">
                            <Ticket className="w-4 h-4 mr-2" />
                            Tickets
                          </Button>
                        )}
                        <Button variant="outline" size="sm">
                          <Settings className="w-4 h-4 mr-2" />
                          Settings
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="h-[500px] p-0">
                    {selectedRoom ? (
                      <div className="flex h-full">
                        {/* Chat Messages Area - Expanded */}
                        <div className="flex-1 flex flex-col">
                          {/* Messages */}
                          <div className="flex-1 p-4 bg-gray-50 overflow-y-auto">
                            {messages.length > 0 ? (
                              <div className="space-y-4">
                                {messages.map((message) => {
                                  const isOwnMessage = message.senderId === user?.id
                                  const messageTime = new Date(message.createdAt).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                  
                                  return (
                                    <div key={message.id} className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                                      <div className={`max-w-lg px-4 py-3 rounded-lg ${
                                        isOwnMessage 
                                          ? 'bg-blue-500 text-white' 
                                          : 'bg-white text-gray-900 border border-gray-200 shadow-sm'
                                      }`}>
                                        {!isOwnMessage && (
                                          <p className="text-xs font-medium mb-1 opacity-75">
                                            {message.sender.firstName} {message.sender.lastName}
                                          </p>
                                        )}
                                        <p className="text-sm leading-relaxed">{message.content}</p>
                                        {message.messageType === 'ticket_tag' && message.metadata && (
                                          <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                                            <div className="flex items-center gap-1 text-blue-700">
                                              <Ticket className="w-3 h-3" />
                                              <span className="font-medium">Ticket Referenced</span>
                                            </div>
                                            <p className="text-blue-600 mt-1">Click to view details</p>
                                          </div>
                                        )}
                                        <p className={`text-xs mt-2 ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'}`}>
                                          {messageTime}
                                        </p>
                                      </div>
                                    </div>
                                  )
                                })}
                                
                                {/* Typing Indicators */}
                                {typingIndicators
                                  .filter(t => t.roomId === selectedRoom.id)
                                  .map((indicator) => (
                                    <div key={`${indicator.userId}-${indicator.roomId}`} className="flex justify-start">
                                      <div className="bg-gray-200 text-gray-600 px-4 py-2 rounded-lg text-sm">
                                        {indicator.userName} is typing...
                                      </div>
                                    </div>
                                  ))
                                }
                              </div>
                            ) : (
                              <div className="text-center text-gray-500 mt-20">
                                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                <h3 className="font-medium text-gray-900 mb-2">Start the conversation</h3>
                                <p className="text-sm">Send the first message to begin chatting</p>
                              </div>
                            )}
                          </div>

                          {/* Message Input */}
                          <div className="border-t border-gray-200 p-4">
                            <div className="flex items-center space-x-2">
                              <Input 
                                placeholder="Type your message... (Use #TK-XXXXXX-XXX to tag tickets)"
                                className="flex-1"
                                value={messageInput}
                                onChange={(e) => {
                                  setMessageInput(e.target.value)
                                  if (selectedRoom && e.target.value.trim()) {
                                    handleTyping(selectedRoom.id)
                                  }
                                }}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    handleSendMessage()
                                  }
                                }}
                                disabled={isSendingMessage}
                              />
                              <Button 
                                onClick={handleSendMessage}
                                disabled={!messageInput.trim() || isSendingMessage}
                              >
                                {isSendingMessage ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Send className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                            
                            <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                              <span>Quick:</span>
                              <button 
                                className="text-blue-600 hover:text-blue-700 font-medium"
                                onClick={() => setMessageInput(prev => prev + '#TK-')}
                              >
                                + Ticket
                              </button>
                              <button 
                                className="text-green-600 hover:text-green-700 font-medium"
                                onClick={() => setMessageInput(prev => prev + '@')}
                              >
                                + Mention
                              </button>
                            </div>
                          </div>
                        </div>
                        
                        {/* Compact Context Panel */}
                        <div className="w-80 border-l border-gray-200 bg-white">
                          <div className="p-3 border-b border-gray-200">
                            <h3 className="font-medium text-gray-900 text-sm flex items-center gap-2">
                              <Ticket className="w-4 h-4" />
                              Recent Tickets & Context
                            </h3>
                          </div>
                          <div className="p-3 space-y-3 overflow-y-auto" style={{height: 'calc(100% - 60px)'}}>
                            {/* Recent Tickets */}
                            <div>
                              <h4 className="text-xs font-medium text-gray-700 mb-2">Recent Tickets</h4>
                              <div className="space-y-2">
                                {analytics.escalatedTickets.slice(0, 4).map((ticket, index) => (
                                  <div key={index} className="p-2 bg-gray-50 rounded text-xs cursor-pointer hover:bg-gray-100 transition-colors">
                                    <div className="flex items-center gap-2 mb-1">
                                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                      <span className="font-medium text-gray-900">#{ticket.ticketNumber}</span>
                                      <span className={`px-1 py-0.5 rounded text-xs ${
                                        ticket.status === 'OPEN' ? 'bg-red-100 text-red-700' :
                                        ticket.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                                        'bg-orange-100 text-orange-700'
                                      }`}>
                                        {ticket.status}
                                      </span>
                                    </div>
                                    <p className="text-gray-600 truncate">{ticket.subject}</p>
                                    <p className="text-gray-500 text-xs mt-1">Escalated by: {ticket.escalatedBy}</p>
                                  </div>
                                ))}
                                {analytics.escalatedTickets.length === 0 && (
                                  <p className="text-xs text-gray-500 italic">No recent tickets</p>
                                )}
                              </div>
                            </div>
                            
                            {/* Agent Info */}
                            {(() => {
                              const otherParticipant = selectedRoom.participants.find(p => p.userId !== user?.id);
                              return otherParticipant && (
                                <div>
                                  <h4 className="text-xs font-medium text-gray-700 mb-2">Chat With</h4>
                                  <div className="p-2 bg-gray-50 rounded text-xs">
                                    <div className="flex items-center gap-2 mb-1">
                                      <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                                        {otherParticipant.user.firstName?.[0]}{otherParticipant.user.lastName?.[0]}
                                      </div>
                                      <div>
                                        <p className="font-medium text-gray-900">{otherParticipant.user.firstName} {otherParticipant.user.lastName}</p>
                                        <p className="text-gray-600">{otherParticipant.user.role}</p>
                                      </div>
                                    </div>
                                    <p className="text-gray-500">{otherParticipant.user.email}</p>
                                  </div>
                                </div>
                              );
                            })()}
                            
                            {/* Quick Actions */}
                            <div>
                              <h4 className="text-xs font-medium text-gray-700 mb-2">Quick Actions</h4>
                              <div className="space-y-1">
                                <Button variant="outline" size="sm" className="w-full text-xs h-7">
                                  <Plus className="w-3 h-3 mr-1" />
                                  Create Ticket
                                </Button>
                                <Button variant="outline" size="sm" className="w-full text-xs h-7">
                                  <Search className="w-3 h-3 mr-1" />
                                  Search Tickets
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-full p-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                          {/* Recent Tickets List */}
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                              <Ticket className="w-5 h-5" />
                              Recent Tickets
                            </h3>
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                              {analytics.escalatedTickets.slice(0, 8).map((ticket, index) => (
                                <div key={index} className="p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow cursor-pointer">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                                      <span className="font-medium text-gray-900 text-sm">#{ticket.ticketNumber}</span>
                                    </div>
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                      ticket.status === 'OPEN' ? 'bg-red-100 text-red-700' :
                                      ticket.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                                      'bg-orange-100 text-orange-700'
                                    }`}>
                                      {ticket.status}
                                    </span>
                                  </div>
                                  <p className="text-gray-700 text-sm mb-2">{ticket.subject}</p>
                                  <div className="flex items-center justify-between text-xs text-gray-500">
                                    <span>Escalated by: {ticket.escalatedBy}</span>
                                    <span>{new Date(ticket.escalatedAt).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              ))}
                              {analytics.escalatedTickets.length === 0 && (
                                <div className="text-center text-gray-500 py-8">
                                  <Ticket className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                  <p className="text-sm">No recent tickets</p>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* Chat Welcome */}
                          <div className="flex items-center justify-center">
                            <div className="text-center text-gray-500">
                              <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                              <h3 className="text-lg font-medium text-gray-900 mb-2">Team Chat</h3>
                              <p className="text-sm mb-4">Select a team member to start messaging</p>
                              <div className="grid grid-cols-1 gap-2 max-w-sm mx-auto text-xs">
                                <div className="bg-white p-2 rounded border border-gray-200">
                                  <strong>#TK-XXXXXX-XXX</strong> to reference tickets
                                </div>
                                <div className="bg-white p-2 rounded border border-gray-200">
                                  <strong>@agent</strong> to mention team members
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Escalation Management Dialog */}
        <Dialog open={showEscalationManager} onOpenChange={setShowEscalationManager}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Escalation Management - {selectedEscalatedTicket?.ticketNumber}
              </DialogTitle>
              <DialogDescription>
                Step {escalationStep} of 3: Handle escalated ticket with structured workflow
              </DialogDescription>
            </DialogHeader>

            {selectedEscalatedTicket && (
              <div className="space-y-6">
                {/* Stepper Header */}
                <div className="flex items-center justify-between">
                  {[1, 2, 3].map((step) => (
                    <div key={step} className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${
                        step === escalationStep 
                          ? 'bg-orange-500 text-white' 
                          : step < escalationStep 
                            ? 'bg-green-500 text-white' 
                            : 'bg-gray-200 text-gray-600'
                      }`}>
                        {step < escalationStep ? <CheckCircle className="w-4 h-4" /> : step}
                      </div>
                      {step < 3 && (
                        <div className={`w-16 h-1 mx-2 ${
                          step < escalationStep ? 'bg-green-500' : 'bg-gray-200'
                        }`} />
                      )}
                    </div>
                  ))}
                </div>

                {/* Step Content */}
                {escalationStep === 1 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Step 1: Review Escalation</CardTitle>
                      <CardDescription>Understand why this ticket was escalated</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Ticket Details */}
                      <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900">Ticket</p>
                          <p className="text-sm text-gray-600">{selectedEscalatedTicket.ticketNumber}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Status</p>
                          <Badge className="bg-orange-100 text-orange-800">Escalated</Badge>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Title</p>
                          <p className="text-sm text-gray-600">{selectedEscalatedTicket.title}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Previously Assigned</p>
                          <p className="text-sm text-gray-600">{selectedEscalatedTicket.assignedTo || 'Unassigned'}</p>
                        </div>
                      </div>

                      {/* Escalation Information */}
                      <div className="p-4 border border-orange-200 rounded-lg bg-orange-50">
                        <h4 className="font-medium text-gray-900 mb-2">Escalation Details</h4>
                        <div className="space-y-2 text-sm">
                          <p><span className="font-medium">Escalated by:</span> {selectedEscalatedTicket.escalatedByName || 'Unknown Agent'}</p>
                          <p><span className="font-medium">Escalation reason:</span></p>
                          <div className="bg-white p-3 rounded border">
                            {selectedEscalatedTicket.escalationNote || 'No escalation note provided'}
                          </div>
                          <p><span className="font-medium">Escalated on:</span> {new Date(selectedEscalatedTicket.escalatedAt || selectedEscalatedTicket.updatedAt).toLocaleString()}</p>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button onClick={() => setEscalationStep(2)}>
                          Review Complete - Next Step
                          <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {escalationStep === 2 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Step 2: Admin Response</CardTitle>
                      <CardDescription>Add your feedback and response to the escalation</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-900 mb-2 block">
                          Admin Response/Feedback <span className="text-red-500">*</span>
                        </label>
                        <Textarea
                          placeholder="Provide your analysis, solution, or instructions for handling this escalated ticket..."
                          value={adminResponse}
                          onChange={(e) => setAdminResponse(e.target.value)}
                          rows={6}
                          className="w-full"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          This response will be visible to the assigned agent and logged in the ticket history
                        </p>
                      </div>

                      <div className="flex justify-between">
                        <Button variant="outline" onClick={() => setEscalationStep(1)}>
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Back to Review
                        </Button>
                        <Button 
                          onClick={() => setEscalationStep(3)}
                          disabled={!adminResponse.trim()}
                        >
                          Response Added - Next Step
                          <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {escalationStep === 3 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Step 3: Reassign Ticket</CardTitle>
                      <CardDescription>Route the ticket to an appropriate agent</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-900 mb-2 block">
                          Assign to Agent <span className="text-red-500">*</span>
                        </label>
                        <Select value={reassignTo} onValueChange={setReassignTo}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select an agent to handle this ticket" />
                          </SelectTrigger>
                          <SelectContent>
                            {agents.filter(agent => agent.isActive).map((agent) => (
                              <SelectItem key={agent.id} value={agent.id}>
                                {agent.firstName} {agent.lastName} ({agent.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Summary */}
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-2">Action Summary</h4>
                        <div className="space-y-1 text-sm">
                          <p>• Ticket will be marked as IN_PROGRESS</p>
                          <p>• Admin response will be added to ticket history</p>
                          <p>• Ticket will be assigned to selected agent</p>
                          <p>• Agent will be notified of the assignment and admin feedback</p>
                        </div>
                      </div>

                      <div className="flex justify-between">
                        <Button variant="outline" onClick={() => setEscalationStep(2)}>
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Back to Response
                        </Button>
                        <Button 
                          className="bg-green-600 hover:bg-green-700"
                          disabled={!reassignTo || escalationLoading}
                          onClick={completeEscalation}
                        >
                          {escalationLoading ? (
                            <>
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Complete Escalation
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  )
}
