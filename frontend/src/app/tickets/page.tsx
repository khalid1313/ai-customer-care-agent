"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, Filter, Clock, AlertCircle, AlertTriangle, User, Calendar, RefreshCw, Eye, MessageSquare, MoreVertical, CheckCircle, XCircle, UserCheck, Zap, TrendingUp, Users, ArrowLeft, Send, Link, Copy, X, Settings, Save } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import Navigation from "@/components/Navigation"
import ProtectedRoute from "@/components/ProtectedRoute"
import { useAuth } from "@/contexts/AuthContext"
import { getBackendUrl } from "@/utils/config"
import { usePresence } from "@/hooks/usePresence"

export default function TicketsPage() {
  const { business, user } = useAuth()
  usePresence() // Track presence for live monitoring
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [messageContent, setMessageContent] = useState('')
  const [internalNoteContent, setInternalNoteContent] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [addingNote, setAddingNote] = useState(false)
  const [notification, setNotification] = useState(null)
  const [messagingWindow, setMessagingWindow] = useState(null)
  const [conversationHistory, setConversationHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
    overdue: 0,
    avgResponseTime: 0
  })
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    category: 'all',
    slaStatus: 'all',
    escalation: 'all', // all, escalated, not_escalated
    search: ''
  })
  const [agents, setAgents] = useState([])
  const [loadingAgents, setLoadingAgents] = useState(false)
  const [assignmentSettings, setAssignmentSettings] = useState({
    method: 'manual', // 'manual', 'round_robin', 'category_wise'
    categoryAssignments: {},
    roundRobinIndex: 0
  })
  const [showAssignmentSettings, setShowAssignmentSettings] = useState(false)
  const [showEscalationDialog, setShowEscalationDialog] = useState(false)
  const [escalationNote, setEscalationNote] = useState('')
  const [escalatingTicket, setEscalatingTicket] = useState(false)

  // Handle URL-based ticket selection
  useEffect(() => {
    const ticketId = searchParams.get('ticket')
    if (ticketId && tickets.length > 0) {
      const ticket = tickets.find(t => t.ticketNumber === ticketId)
      if (ticket) {
        setSelectedTicket(ticket)
      }
    }
  }, [searchParams, tickets])

  // Fetch tickets, stats, and agents on component mount
  useEffect(() => {
    if (business?.id) {
      fetchTickets()
      fetchTicketStats()
      fetchAgents()
      fetchAssignmentSettings()
    }
  }, [business?.id, filters])

  // Auto-dismiss success notifications after 5 seconds
  useEffect(() => {
    if (notification && notification.type === 'success') {
      const timer = setTimeout(() => {
        setNotification(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [notification])

  // Quick Actions handlers
  const updateTicketStatus = async (ticketId, newStatus) => {
    try {
      const backendUrl = await getBackendUrl()
      const response = await fetch(`${backendUrl}/api/tickets/${ticketId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ status: newStatus })
      })
      
      if (response.ok) {
        setNotification({
          type: 'success',
          message: `Ticket status updated to ${newStatus.toLowerCase()}`
        })
        // Update local state
        setSelectedTicket(prev => ({ ...prev, status: newStatus }))
        // Refresh tickets list
        fetchTickets()
        fetchTicketStats()
      } else {
        setNotification({
          type: 'error',
          message: 'Failed to update ticket status'
        })
      }
    } catch (error) {
      console.error('Error updating ticket status:', error)
      setNotification({
        type: 'error',
        message: 'Error updating ticket status'
      })
    }
  }

  const assignTicketToMe = async () => {
    if (!selectedTicket || !user?.id) return
    
    try {
      const backendUrl = await getBackendUrl()
      const response = await fetch(`${backendUrl}/api/tickets/${selectedTicket.id}/assign`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ assignedTo: user.id })
      })
      
      if (response.ok) {
        setNotification({
          type: 'success',
          message: 'Ticket assigned to you successfully'
        })
        // Update local state
        setSelectedTicket(prev => ({ 
          ...prev, 
          assignedTo: `${user.firstName} ${user.lastName}`,
          assignedToId: user.id
        }))
        // Refresh tickets list
        fetchTickets()
        fetchTicketStats()
      } else {
        setNotification({
          type: 'error',
          message: 'Failed to assign ticket'
        })
      }
    } catch (error) {
      console.error('Error assigning ticket:', error)
      setNotification({
        type: 'error',
        message: 'Error assigning ticket'
      })
    }
  }

  const escalateTicket = async () => {
    if (!selectedTicket || !escalationNote.trim()) {
      setNotification({
        type: 'error',
        message: 'Please provide an escalation note'
      })
      return
    }
    
    setEscalatingTicket(true)
    try {
      const backendUrl = await getBackendUrl()
      const response = await fetch(`${backendUrl}/api/tickets/${selectedTicket.id}/escalate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ 
          escalationNote: escalationNote.trim(),
          escalatedBy: user?.id,
          escalatedByName: `${user?.firstName} ${user?.lastName}`
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setNotification({
          type: 'success',
          message: 'Ticket escalated successfully'
        })
        // Update local state
        setSelectedTicket(prev => ({ 
          ...prev, 
          escalationLevel: 1, // Single escalation level
          status: 'ESCALATED' // Set status to escalated
        }))
        // Clear form and close dialog
        setEscalationNote('')
        setShowEscalationDialog(false)
        // Refresh tickets list
        fetchTickets()
        fetchTicketStats()
      } else {
        const errorData = await response.json()
        setNotification({
          type: 'error',
          message: errorData.message || 'Failed to escalate ticket'
        })
      }
    } catch (error) {
      console.error('Error escalating ticket:', error)
      setNotification({
        type: 'error',
        message: 'Error escalating ticket'
      })
    } finally {
      setEscalatingTicket(false)
    }
  }

  const fetchTickets = async () => {
    try {
      setLoading(true)
      const backendUrl = await getBackendUrl()
      
      // Build query parameters
      const params = new URLSearchParams()
      if (filters.status !== 'all') params.append('status', filters.status)
      if (filters.priority !== 'all') params.append('priority', filters.priority)
      if (filters.category !== 'all') params.append('category', filters.category)
      if (filters.slaStatus !== 'all') params.append('slaStatus', filters.slaStatus)
      if (filters.escalation !== 'all') params.append('escalation', filters.escalation)
      if (filters.search) params.append('search', filters.search)
      
      // For non-admin users, filter to show only tickets assigned to them
      if (user?.role !== 'admin' && user?.role !== 'owner' && user?.id) {
        params.append('assignedToId', user.id.toString())
      }
      
      const response = await fetch(`${backendUrl}/api/tickets/${business?.id}?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        setTickets(data.data.tickets || [])
      } else {
        console.error('Failed to fetch tickets:', response.status, response.statusText)
      }
    } catch (error) {
      console.error("Error fetching tickets:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchTicketStats = async () => {
    try {
      const backendUrl = await getBackendUrl()
      
      // Build query parameters for stats filtering
      const params = new URLSearchParams()
      // For non-admin users, filter stats to show only tickets assigned to them
      if (user?.role !== 'admin' && user?.role !== 'owner' && user?.id) {
        params.append('assignedToId', user.id.toString())
      }
      
      const response = await fetch(`${backendUrl}/api/tickets/${business?.id}/stats?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        setStats(data.data || stats)
      }
    } catch (error) {
      console.error("Error fetching ticket stats:", error)
    }
  }

  const formatTimestamp = (timestamp) => {
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

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "open": return "bg-red-100 text-red-700"
      case "in_progress": return "bg-blue-100 text-blue-700"
      case "escalated": return "bg-orange-100 text-orange-700"
      case "resolved": return "bg-green-100 text-green-700"
      case "closed": return "bg-gray-100 text-gray-700"
      default: return "bg-gray-100 text-gray-700"
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case "urgent": return "text-red-600"
      case "high": return "text-orange-600"
      case "normal": return "text-gray-600"
      case "low": return "text-green-600"
      default: return "text-gray-600"
    }
  }

  const getSlaStatusColor = (slaStatus) => {
    switch (slaStatus?.toLowerCase()) {
      case "overdue": return "bg-red-100 text-red-700"
      case "urgent": return "bg-orange-100 text-orange-700"
      case "soon": return "bg-yellow-100 text-yellow-700"
      case "on_time": return "bg-green-100 text-green-700"
      default: return "bg-gray-100 text-gray-700"
    }
  }

  const getSlaIcon = (slaStatus) => {
    switch (slaStatus?.toLowerCase()) {
      case "overdue": return <AlertCircle className="w-4 h-4" />
      case "urgent": return <Clock className="w-4 h-4" />
      case "soon": return <Clock className="w-4 h-4" />
      case "on_time": return <CheckCircle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const selectTicket = (ticket) => {
    setSelectedTicket(ticket)
    router.push(`/tickets?ticket=${ticket.ticketNumber}`, { scroll: false })
  }

  const goBackToTickets = () => {
    setSelectedTicket(null)
    router.push('/tickets', { scroll: false })
  }

  const fetchAgents = async () => {
    try {
      setLoadingAgents(true)
      const backendUrl = await getBackendUrl()
      const response = await fetch(`${backendUrl}/api/admin/agents/${business?.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        setAgents(data.data || [])
      } else {
        console.error('Failed to fetch agents:', response.status)
      }
    } catch (error) {
      console.error('Error fetching agents:', error)
    } finally {
      setLoadingAgents(false)
    }
  }

  const fetchAssignmentSettings = async () => {
    try {
      const backendUrl = await getBackendUrl()
      const response = await fetch(`${backendUrl}/api/settings/assignment/${business?.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        setAssignmentSettings(data.data || {
          method: 'manual',
          categoryAssignments: {},
          roundRobinIndex: 0
        })
      }
    } catch (error) {
      console.error('Error fetching assignment settings:', error)
    }
  }

  const updateAssignmentSettings = async (newSettings) => {
    try {
      const backendUrl = await getBackendUrl()
      const response = await fetch(`${backendUrl}/api/settings/assignment/${business?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify(newSettings)
      })
      
      if (response.ok) {
        setAssignmentSettings(newSettings)
        setNotification({
          type: 'success',
          title: 'Settings Updated',
          message: 'Assignment settings have been saved successfully.'
        })
      } else {
        throw new Error('Failed to update settings')
      }
    } catch (error) {
      console.error('Error updating assignment settings:', error)
      setNotification({
        type: 'error',
        title: 'Update Failed',
        message: 'Failed to save assignment settings. Please try again.'
      })
    }
  }

  const assignTicketToAgent = async (ticketId, agentId) => {
    try {
      const backendUrl = await getBackendUrl()
      const response = await fetch(`${backendUrl}/api/tickets/${ticketId}/assign`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({ assignedTo: agentId })
      })
      
      if (response.ok) {
        // Update the selected ticket
        if (selectedTicket && selectedTicket.id === ticketId) {
          const assignedAgent = agents.find(agent => agent.id === agentId)
          setSelectedTicket({
            ...selectedTicket,
            assignedTo: agentId,
            assignedAgentName: assignedAgent ? `${assignedAgent.firstName} ${assignedAgent.lastName}` : 'Unknown Agent'
          })
        }
        
        // Refresh tickets list
        fetchTickets()
        
        setNotification({
          type: 'success',
          title: 'Ticket Assigned',
          message: `Ticket has been assigned successfully.`
        })
      } else {
        throw new Error('Failed to assign ticket')
      }
    } catch (error) {
      console.error('Error assigning ticket:', error)
      setNotification({
        type: 'error',
        title: 'Assignment Failed',
        message: 'Failed to assign ticket. Please try again.'
      })
    }
  }

  const copyTicketLink = async () => {
    const url = `${window.location.origin}/tickets?ticket=${selectedTicket.ticketNumber}`
    try {
      await navigator.clipboard.writeText(url)
      // You could add a toast notification here
      alert('Ticket link copied to clipboard!')
    } catch (err) {
      console.error('Failed to copy link:', err)
    }
  }

  const sendMessage = async () => {
    if (!messageContent.trim() || !selectedTicket) return

    setSendingMessage(true)
    try {
      const backendUrl = await getBackendUrl()
      const response = await fetch(`${backendUrl}/api/messages/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          ticketId: selectedTicket.id,
          message: messageContent,
          agentName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Support Agent' : 'Support Agent'
        })
      })

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success) {
        setMessageContent('')
        setMessagingWindow(result.data.messagingWindow)
        
        if (result.data.sentToCustomer) {
          setNotification({
            type: 'success',
            title: 'Message Sent Successfully!',
            message: `Your message was delivered to the customer via ${result.data.channel.toUpperCase()}. ${
              result.data.messagingWindow.status === 'open' 
                ? `Messaging window closes in ${result.data.messagingWindow.hoursRemaining} hours.`
                : result.data.messagingWindow.status === 'expired'
                ? 'Note: Messaging window has expired - customer may not see this message immediately.'
                : ''
            }`
          })
        } else {
          setNotification({
            type: 'warning',
            title: 'Message Stored But Not Delivered',
            message: `Message was saved but could not be delivered: ${result.data.sendError}. ${
              result.data.messagingWindow.status === 'expired'
                ? 'The messaging window has expired - consider using other contact methods.'
                : ''
            }`
          })
        }
      } else {
        setNotification({
          type: 'error',
          title: 'Failed to Send Message',
          message: `Error: ${result.error}. Please try again or contact the customer through other means.`
        })
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setNotification({
        type: 'error',
        title: 'Network Error',
        message: 'Failed to send message due to connection issues. Please try again.'
      })
    } finally {
      setSendingMessage(false)
    }
  }

  const addInternalNote = async () => {
    if (!internalNoteContent.trim() || !selectedTicket) return

    setAddingNote(true)
    try {
      const backendUrl = await getBackendUrl()
      const response = await fetch(`${backendUrl}/api/messages/internal-note`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
        body: JSON.stringify({
          ticketId: selectedTicket.id,
          note: internalNoteContent,
          agentName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Support Agent' : 'Support Agent'
        })
      })

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.success) {
        setInternalNoteContent('')
        setNotification({
          type: 'success',
          title: 'Internal Note Added',
          message: 'Note has been saved and is visible to other agents.'
        })
      } else {
        setNotification({
          type: 'error',
          title: 'Failed to Add Note',
          message: `Error: ${result.error}`
        })
      }
    } catch (error) {
      console.error('Error adding note:', error)
      setNotification({
        type: 'error',
        title: 'Network Error',
        message: 'Failed to add note due to connection issues. Please try again.'
      })
    } finally {
      setAddingNote(false)
    }
  }

  const useQuickTemplate = (template) => {
    let templateText = ''
    switch (template) {
      case 'refund-approved':
        templateText = `Hi! I've reviewed your refund request and I'm happy to approve it. Your refund of $XX will be processed within 3-5 business days back to your original payment method. Thank you for your patience, and I apologize for any inconvenience caused.`
        break
      case 'request-details':
        templateText = `Hi! I'm looking into your request and need a bit more information to assist you better. Could you please provide: [specific details needed]? This will help me resolve your issue quickly. Thank you!`
        break
      case 'apology-compensation':
        templateText = `Hi! I sincerely apologize for the inconvenience you've experienced. To make this right, I'd like to offer you [compensation details]. Additionally, I'm personally ensuring this issue is resolved to prevent it from happening again. Is there anything else I can do to help?`
        break
    }
    setMessageContent(templateText)
  }

  const loadConversationHistory = async () => {
    if (!selectedTicket) return

    setLoadingHistory(true)
    try {
      const backendUrl = await getBackendUrl()
      const response = await fetch(`${backendUrl}/api/messages/history/${selectedTicket.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setConversationHistory(result.data.messages || [])
          setNotification({
            type: 'success',
            title: 'Conversation Loaded',
            message: `Found ${result.data.messages?.length || 0} messages in conversation history.`
          })
        }
      } else {
        setNotification({
          type: 'error',
          title: 'Failed to Load History',
          message: 'Could not load conversation history. Please try again.'
        })
      }
    } catch (error) {
      console.error('Error loading conversation history:', error)
      setNotification({
        type: 'error',
        title: 'Network Error',
        message: 'Failed to load conversation history due to connection issues.'
      })
    } finally {
      setLoadingHistory(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 flex">
        <Navigation />
        
        <div className="flex-1 p-6">
          {/* Notification Toast */}
          {notification && (
            <div className={`fixed top-4 right-4 z-50 max-w-md p-4 rounded-lg shadow-lg border ${
              notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
              notification.type === 'warning' ? 'bg-yellow-50 border-yellow-200 text-yellow-800' :
              'bg-red-50 border-red-200 text-red-800'
            }`}>
              <div className="flex items-start">
                <div className="flex-1">
                  <h4 className="font-medium">{notification.title}</h4>
                  <p className="text-sm mt-1">{notification.message}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setNotification(null)}
                  className="ml-2 h-6 w-6 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {!selectedTicket ? (
            <>
              {/* Header */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
                    <p className="text-gray-600">Manage and track customer support requests</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {(user?.role === 'admin' || user?.role === 'owner') && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowAssignmentSettings(true)}
                        className="flex items-center gap-2"
                      >
                        <Settings className="w-4 h-4" />
                        Assignment Settings
                      </Button>
                    )}
                    <Button onClick={fetchTickets} className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4" />
                      Refresh
                    </Button>
                  </div>
                </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600">Total</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600">Open</p>
                      <p className="text-2xl font-bold text-red-600">{stats.open}</p>
                    </div>
                    <AlertCircle className="w-8 h-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600">In Progress</p>
                      <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
                    </div>
                    <Clock className="w-8 h-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600">Resolved</p>
                      <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600">Overdue</p>
                      <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
                    </div>
                    <XCircle className="w-8 h-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-600">Avg Response</p>
                      <p className="text-2xl font-bold text-purple-600">{stats.avgResponseTime}h</p>
                    </div>
                    <Zap className="w-8 h-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-64">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input 
                      placeholder="Search tickets by ID, title, or customer..." 
                      className="pl-10"
                      value={filters.search}
                      onChange={(e) => setFilters({...filters, search: e.target.value})}
                    />
                  </div>
                </div>
                
                <Select value={filters.status} onValueChange={(value) => setFilters({...filters, status: value})}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="escalated">Escalated</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.priority} onValueChange={(value) => setFilters({...filters, priority: value})}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.category} onValueChange={(value) => setFilters({...filters, category: value})}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="refund">Refund</SelectItem>
                    <SelectItem value="return">Return</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="shipping">Shipping</SelectItem>
                    <SelectItem value="billing">Billing</SelectItem>
                    <SelectItem value="product_issue">Product Issue</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filters.slaStatus} onValueChange={(value) => setFilters({...filters, slaStatus: value})}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="SLA Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All SLA</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="soon">Due Soon</SelectItem>
                    <SelectItem value="on_time">On Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-600 mb-1 block">Escalation</label>
                <Select value={filters.escalation} onValueChange={(value) => setFilters({...filters, escalation: value})}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Escalation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="escalated">Escalated</SelectItem>
                    <SelectItem value="not_escalated">Not Escalated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Tickets Table */}
          <Card>
            <CardHeader>
              <CardTitle>All Tickets ({tickets.length})</CardTitle>
              <CardDescription>Complete list of support tickets across all customers</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              ) : tickets.length > 0 ? (
                <div className="space-y-3">
                  {tickets.map((ticket) => (
                    <div key={ticket.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {/* Header Row */}
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-3">
                              <h3 className="text-sm font-semibold text-gray-900">{ticket.ticketNumber}</h3>
                              <Badge className={`text-xs ${getStatusColor(ticket.status)}`}>
                                {ticket.status?.toLowerCase()}
                              </Badge>
                              {(ticket.escalationLevel > 0 || ticket.status === 'ESCALATED') && (
                                <Badge className="text-xs bg-orange-100 text-orange-800 border-orange-200 flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  Escalated
                                </Badge>
                              )}
                              {ticket.timeRemaining && (
                                <Badge className={`text-xs flex items-center gap-1 ${getSlaStatusColor(ticket.slaStatus)}`}>
                                  {getSlaIcon(ticket.slaStatus)}
                                  {ticket.timeRemaining}
                                </Badge>
                              )}
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => selectTicket(ticket)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View
                            </Button>
                          </div>

                          {/* Title and Description */}
                          <div className="mb-3">
                            <h4 className="text-sm font-medium text-gray-900 mb-1">{ticket.title}</h4>
                            <p className="text-xs text-gray-600 line-clamp-2">{ticket.description}</p>
                          </div>

                          {/* Details Row */}
                          <div className="flex items-center justify-between text-xs text-gray-500">
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-1">
                                <User className="w-3 h-3" />
                                <span>{ticket.customerName || 'Unknown Customer'}</span>
                              </div>
                              {ticket.assignedTo && (
                                <div className="flex items-center space-x-1">
                                  <UserCheck className="w-3 h-3" />
                                  <span>{ticket.assignedTo}</span>
                                </div>
                              )}
                              <div className="flex items-center space-x-1">
                                <Calendar className="w-3 h-3" />
                                <span>{formatTimestamp(ticket.createdAt)}</span>
                              </div>
                              {ticket.category && (
                                <Badge variant="outline" className="text-xs">
                                  {ticket.category}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center space-x-3">
                              <span className={`font-medium ${getPriorityColor(ticket.priority)}`}>
                                {ticket.priority?.toLowerCase()}
                              </span>
                              {ticket.linkedToConversation && (
                                <div className="flex items-center space-x-1 text-blue-600">
                                  <MessageSquare className="w-3 h-3" />
                                  <span>Linked</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No tickets found</p>
                  <p className="text-gray-400 text-sm">Tickets will appear here when customers create support requests</p>
                </div>
              )}
            </CardContent>
          </Card>
            </>
          ) : (
            /* Ticket Detail Page */
            <>
              {/* Header */}
              <div className="mb-6">
                <div className="flex items-center gap-4 mb-4">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={goBackToTickets}
                    className="flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Tickets
                  </Button>
                  <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900">{selectedTicket.ticketNumber}</h1>
                    <p className="text-gray-600">{selectedTicket.title}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={copyTicketLink}
                      className="flex items-center gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      Copy Link
                    </Button>
                    <Badge className={`${getStatusColor(selectedTicket.status)}`}>
                      {selectedTicket.status?.toLowerCase()}
                    </Badge>
                    {selectedTicket.timeRemaining && (
                      <Badge className={`flex items-center gap-1 ${getSlaStatusColor(selectedTicket.slaStatus)}`}>
                        {getSlaIcon(selectedTicket.slaStatus)}
                        {selectedTicket.timeRemaining}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Ticket Detail Content */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Ticket Details */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Ticket Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* AI-Generated Summary */}
                      <div>
                        <label className="text-sm font-medium text-gray-900 flex items-center gap-2">
                          <Zap className="w-4 h-4 text-blue-600" />
                          Summary
                        </label>
                        <div className="mt-2 p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                          <div className="space-y-4">
                            {/* Quick Summary */}
                            <div>
                              <p className="text-base font-semibold text-gray-900">
                                {selectedTicket.category === 'refund' && selectedTicket.priority === 'HIGH' 
                                  ? 'URGENT: High-priority refund request'
                                  : selectedTicket.category === 'refund' 
                                  ? 'Customer requesting refund'
                                  : selectedTicket.category === 'return'
                                  ? 'Product return request'
                                  : selectedTicket.category === 'product_issue'
                                  ? 'Product quality/defect reported'
                                  : selectedTicket.category === 'shipping'
                                  ? 'Shipping or delivery issue'
                                  : selectedTicket.category === 'billing'
                                  ? 'Billing or payment concern'
                                  : 'General customer support request'
                                }
                              </p>
                              <p className="text-sm text-gray-600 mt-1">
                                {formatTimestamp(selectedTicket.createdAt)} • 
                                {selectedTicket.priority} Priority • 
                                SLA: {selectedTicket.timeRemaining}
                              </p>
                            </div>

                            {/* Action Required */}
                            <div className={`rounded-md p-4 border-l-4 ${
                              selectedTicket.priority === 'HIGH' ? 'bg-red-50 border-red-400' : 
                              selectedTicket.priority === 'NORMAL' ? 'bg-yellow-50 border-yellow-400' : 'bg-blue-50 border-blue-400'
                            }`}>
                              <div className="text-sm font-bold text-gray-900 mb-2">NEXT ACTION</div>
                              <p className="text-sm text-gray-800 font-medium">
                                {selectedTicket.category === 'refund' && selectedTicket.priority === 'HIGH' 
                                  ? '⚡ Process refund immediately. Verify order details and initiate refund within 4h SLA.'
                                  : selectedTicket.category === 'refund' 
                                  ? '💳 Review refund request. Check eligibility and customer history before processing.'
                                  : selectedTicket.category === 'product_issue'
                                  ? '🔍 Investigate product defect. Document issue and arrange replacement or refund.'
                                  : selectedTicket.category === 'return'
                                  ? '📦 Facilitate product return. Provide return label and track return process.'
                                  : selectedTicket.category === 'shipping'
                                  ? '🚚 Track shipment status. Contact carrier if needed and update customer.'
                                  : selectedTicket.category === 'billing'
                                  ? '💰 Review billing inquiry. Check payment history and resolve discrepancies.'
                                  : '📞 Respond to customer inquiry with relevant information and next steps.'
                                }
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Original Message */}
                      <div>
                        <label className="text-sm font-medium text-gray-700">Original Customer Message</label>
                        <div className="mt-2 p-3 bg-gray-50 rounded-md border">
                          <p className="text-sm text-gray-900 italic">
                            {selectedTicket.description?.includes('Original message:') 
                              ? selectedTicket.description.split('Original message: "')[1]?.split('"')[0] 
                              : selectedTicket.description
                            }
                          </p>
                          <div className="mt-2 text-xs text-gray-500 flex items-center gap-2">
                            <MessageSquare className="w-3 h-3" />
                            {selectedTicket.description?.includes('Conversation ID:') 
                              ? selectedTicket.description.split('Conversation ID: ')[1]?.split('.')[0]
                              : 'Direct ticket creation'
                            }
                          </div>
                        </div>
                      </div>
                      
                    </CardContent>
                  </Card>

                  {/* Internal Notes */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Internal Notes</CardTitle>
                      <CardDescription>Add notes for other agents (not visible to customer)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <Textarea 
                          placeholder="Add internal note..."
                          className="min-h-[100px]"
                          value={internalNoteContent}
                          onChange={(e) => setInternalNoteContent(e.target.value)}
                        />
                        <Button 
                          onClick={addInternalNote}
                          disabled={addingNote || !internalNoteContent.trim()}
                        >
                          <Send className="w-4 h-4 mr-2" />
                          {addingNote ? 'Adding...' : 'Add Note'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>


                  {/* Customer Communication */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Customer Communication</CardTitle>
                      <CardDescription>Send message to customer (updates summary automatically)</CardDescription>
                      
                      {/* Messaging Window Status */}
                      {messagingWindow && (
                        <div className={`mt-2 p-3 rounded-lg border ${
                          messagingWindow.status === 'open' ? 'bg-green-50 border-green-200' :
                          messagingWindow.status === 'expired' ? 'bg-red-50 border-red-200' :
                          'bg-gray-50 border-gray-200'
                        }`}>
                          <div className="flex items-center gap-2">
                            {messagingWindow.status === 'open' ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-red-600" />
                            )}
                            <div>
                              <div className={`text-sm font-medium ${
                                messagingWindow.status === 'open' ? 'text-green-800' : 'text-red-800'
                              }`}>
                                {messagingWindow.status === 'open' 
                                  ? `Instagram Messaging Window: ${messagingWindow.hoursRemaining}h remaining`
                                  : 'Instagram Messaging Window: Expired'
                                }
                              </div>
                              <div className={`text-xs ${
                                messagingWindow.status === 'open' ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {messagingWindow.status === 'open' 
                                  ? 'Customer can receive messages freely'
                                  : 'Customer must message first to reopen window'
                                }
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Quick Templates */}
                        <div>
                          <label className="text-xs font-medium text-gray-700">Quick Templates</label>
                          <div className="mt-1 flex gap-2 flex-wrap">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-xs"
                              onClick={() => useQuickTemplate('refund-approved')}
                            >
                              Refund Approved
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-xs"
                              onClick={() => useQuickTemplate('request-details')}
                            >
                              Request Details
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-xs"
                              onClick={() => useQuickTemplate('apology-compensation')}
                            >
                              Apology + Compensation
                            </Button>
                          </div>
                        </div>
                        
                        <Textarea 
                          placeholder="Hi! I've reviewed your refund request for the defective product. I'd be happy to process your refund immediately. Could you please confirm your preferred refund method?"
                          className="min-h-[100px]"
                          value={messageContent}
                          onChange={(e) => setMessageContent(e.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button 
                            onClick={sendMessage}
                            disabled={sendingMessage || !messageContent.trim()}
                          >
                            <Send className="w-4 h-4 mr-2" />
                            {sendingMessage ? 'Sending...' : 'Send & Update Summary'}
                          </Button>
                          <Button variant="outline">
                            Save Template
                          </Button>
                        </div>
                        
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                  {/* Customer Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Customer Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="text-sm font-medium">{selectedTicket.customerName || 'Unknown Customer'}</span>
                      </div>
                      {selectedTicket.customerEmail && (
                        <div className="text-sm text-gray-600">
                          {selectedTicket.customerEmail}
                        </div>
                      )}
                      <div className="text-xs text-gray-500">
                        Customer ID: {selectedTicket.customerId}
                      </div>
                      <div className="text-xs text-gray-500">
                        Channel: Instagram DM
                      </div>
                    </CardContent>
                  </Card>

                  {/* Ticket Management */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Ticket Management</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Status</label>
                        <div className="mt-1">
                          <Select 
                            defaultValue={selectedTicket.status?.toLowerCase()}
                            onValueChange={(value) => updateTicketStatus(selectedTicket.id, value.toUpperCase())}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">Open</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="escalated">Escalated</SelectItem>
                              <SelectItem value="resolved">Resolved</SelectItem>
                              <SelectItem value="closed">Closed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-700">Assign to Agent</label>
                        <div className="mt-1">
                          <Select 
                            value={selectedTicket.assignedTo || "unassigned"}
                            onValueChange={(value) => {
                              if (value !== "unassigned" && value !== selectedTicket.assignedTo) {
                                assignTicketToAgent(selectedTicket.id, value)
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select agent..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              {agents.map((agent) => (
                                <SelectItem key={agent.id} value={agent.id}>
                                  {agent.firstName} {agent.lastName}
                                  {agent.role && ` (${agent.role})`}
                                </SelectItem>
                              ))}
                              {loadingAgents && (
                                <SelectItem value="loading" disabled>
                                  Loading agents...
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-700">Escalation Level</label>
                        <div className="mt-1">
                          {selectedTicket.escalationLevel > 0 || selectedTicket.status === 'ESCALATED' ? (
                            <Badge className="bg-orange-100 text-orange-800 border-orange-200 flex items-center gap-1 w-fit">
                              <AlertCircle className="w-4 h-4" />
                              Escalated to Admin
                            </Badge>
                          ) : (
                            <span className="text-sm text-gray-500">Not escalated</span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>


                  {/* Quick Actions */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full justify-start"
                        onClick={() => updateTicketStatus(selectedTicket.id, 'RESOLVED')}
                        disabled={selectedTicket.status === 'RESOLVED'}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {selectedTicket.status === 'RESOLVED' ? 'Already Resolved' : 'Mark as Resolved'}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full justify-start"
                        onClick={assignTicketToMe}
                        disabled={selectedTicket.assignedToId === user?.id}
                      >
                        <UserCheck className="w-4 h-4 mr-2" />
                        {selectedTicket.assignedToId === user?.id ? 'Already Assigned to Me' : 'Assign to Me'}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full justify-start"
                        onClick={() => setShowEscalationDialog(true)}
                        disabled={selectedTicket.escalationLevel > 0 || selectedTicket.status === 'ESCALATED'}
                      >
                        <AlertCircle className="w-4 h-4 mr-2" />
                        {selectedTicket.escalationLevel > 0 || selectedTicket.status === 'ESCALATED' ? 'Already Escalated' : 'Escalate to Manager'}
                      </Button>
                    </CardContent>
                  </Card>

                </div>
              </div>
            </>
          )}
        </div>
        
        {/* Assignment Settings Dialog */}
        <Dialog open={showAssignmentSettings} onOpenChange={setShowAssignmentSettings}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Ticket Assignment Settings</DialogTitle>
              <DialogDescription>
                Configure how new tickets are automatically assigned to agents
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Assignment Method */}
              <div>
                <label className="text-sm font-medium text-gray-900 mb-3 block">Assignment Method</label>
                <Select 
                  value={assignmentSettings.method} 
                  onValueChange={(value) => setAssignmentSettings({...assignmentSettings, method: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual Assignment</SelectItem>
                    <SelectItem value="round_robin">Round Robin</SelectItem>
                    <SelectItem value="category_wise">Category-based Assignment</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  {assignmentSettings.method === 'manual' && 'Tickets remain unassigned until manually assigned'}
                  {assignmentSettings.method === 'round_robin' && 'Tickets are automatically distributed evenly among active agents'}
                  {assignmentSettings.method === 'category_wise' && 'Tickets are assigned based on category-specific agent mappings'}
                </p>
              </div>

              {/* Category-wise assignments (only show if category_wise is selected) */}
              {assignmentSettings.method === 'category_wise' && (
                <div>
                  <label className="text-sm font-medium text-gray-900 mb-3 block">Category Assignments</label>
                  <div className="space-y-3">
                    {['refund', 'return', 'product_issue', 'shipping', 'billing', 'general'].map((category) => (
                      <div key={category} className="flex items-center gap-3">
                        <div className="w-24 text-sm text-gray-600 capitalize">{category.replace('_', ' ')}</div>
                        <div className="flex-1">
                          <Select 
                            value={assignmentSettings.categoryAssignments[category] || "unassigned"}
                            onValueChange={(value) => {
                              setAssignmentSettings({
                                ...assignmentSettings,
                                categoryAssignments: {
                                  ...assignmentSettings.categoryAssignments,
                                  [category]: value === "unassigned" ? undefined : value
                                }
                              })
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select agent..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">No default agent</SelectItem>
                              {agents.filter(agent => agent.isActive).map((agent) => (
                                <SelectItem key={agent.id} value={agent.id}>
                                  {agent.firstName} {agent.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Round Robin Info */}
              {assignmentSettings.method === 'round_robin' && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Round Robin Assignment</h4>
                  <p className="text-sm text-blue-700">
                    New tickets will be automatically assigned to active agents in rotation. 
                    Only agents with "active" status will be included in the rotation.
                  </p>
                  <div className="mt-3">
                    <p className="text-xs text-blue-600">
                      Active agents: {agents.filter(agent => agent.isActive).length} | 
                      Next assignment: {agents.filter(agent => agent.isActive)[assignmentSettings.roundRobinIndex]?.firstName || 'None'} {agents.filter(agent => agent.isActive)[assignmentSettings.roundRobinIndex]?.lastName || ''}
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={() => setShowAssignmentSettings(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    updateAssignmentSettings(assignmentSettings)
                    setShowAssignmentSettings(false)
                  }}
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Settings
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Escalation Dialog */}
        <Dialog open={showEscalationDialog} onOpenChange={setShowEscalationDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-500" />
                Escalate Ticket to Manager
              </DialogTitle>
              <DialogDescription>
                Provide details about why this ticket needs to be escalated.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Escalation Information */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Escalation Target:</span> Admin/Manager
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  This ticket will be transferred to admin for review and reassignment
                </p>
              </div>

              {/* Escalation Note */}
              <div>
                <label className="text-sm font-medium text-gray-900 mb-2 block">
                  Escalation Reason <span className="text-red-500">*</span>
                </label>
                <Textarea
                  placeholder="Explain why this ticket needs escalation (e.g., customer complaints, technical complexity, SLA risk...)"
                  value={escalationNote}
                  onChange={(e) => setEscalationNote(e.target.value)}
                  rows={4}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This note will be visible to managers and in the escalation history.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowEscalationDialog(false)
                    setEscalationNote('')
                  }}
                  disabled={escalatingTicket}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={escalateTicket}
                  disabled={escalatingTicket || !escalationNote.trim()}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {escalatingTicket ? 'Escalating...' : 'Escalate Ticket'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
      </div>
    </ProtectedRoute>
  )
}