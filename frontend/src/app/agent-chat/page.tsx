"use client"

import { useState } from "react"
import { 
  MessageSquare, Users, Send, Plus, Settings, RefreshCw, 
  ArrowLeft, Bell, Search, MoreVertical, Phone, Video
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import Navigation from "@/components/Navigation"
import ProtectedRoute from "@/components/ProtectedRoute"
import { useAuth } from "@/contexts/AuthContext"
import { useChat } from "@/hooks/useChat"

export default function AgentChatPage() {
  const { business, user } = useAuth()
  
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
  
  const [messageInput, setMessageInput] = useState('')
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [showNotifications, setShowNotifications] = useState(true)

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

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 flex">
        <Navigation />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Team Chat</h1>
                <p className="text-sm text-gray-600">
                  Collaborate with your team • {isConnected ? 'Connected' : 'Connecting...'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs ${
                  isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  {isConnected ? 'Online' : 'Offline'}
                </div>
                {chatRooms.length > 0 && (
                  <Badge variant="secondary">
                    {chatRooms.length} active chat{chatRooms.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Main Chat Interface */}
          <div className="flex-1 flex">
            {/* Sidebar */}
            <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
              {/* Search */}
              <div className="p-4 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input 
                    placeholder="Search chats..."
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Chat List */}
              <div className="flex-1 overflow-y-auto">
                {/* Active Chats */}
                {chatRooms.length > 0 && (
                  <div>
                    <div className="px-4 py-3 border-b border-gray-100">
                      <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Recent Chats
                      </h3>
                    </div>
                    {chatRooms.map((room) => {
                      const otherParticipant = room.participants.find(p => p.userId !== user?.id)
                      const isSelected = selectedRoom?.id === room.id
                      const lastMessage = room.messages?.[0]
                      
                      return (
                        <div 
                          key={room.id}
                          className={`flex items-center p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                            isSelected ? 'bg-blue-50 border-r-3 border-blue-500' : ''
                          }`}
                          onClick={() => selectRoom(room)}
                        >
                          <div className="flex items-center space-x-3 flex-1">
                            <div className="relative">
                              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                                {otherParticipant ? 
                                  `${otherParticipant.user.firstName?.[0]}${otherParticipant.user.lastName?.[0]}` : 
                                  'GC'
                                }
                              </div>
                              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="font-semibold text-gray-900 text-sm truncate">
                                  {room.type === 'direct' && otherParticipant ? 
                                    `${otherParticipant.user.firstName} ${otherParticipant.user.lastName}` :
                                    room.name || 'Group Chat'
                                  }
                                </p>
                                {lastMessage && (
                                  <span className="text-xs text-gray-400">
                                    {new Date(lastMessage.createdAt).toLocaleTimeString([], { 
                                      hour: '2-digit', 
                                      minute: '2-digit' 
                                    })}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-500 truncate">
                                {lastMessage?.content || 'Start chatting...'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Empty State */}
                {chatRooms.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                    <MessageSquare className="w-16 h-16 mb-4 opacity-50" />
                    <h3 className="font-medium text-gray-900 mb-2">No active chats</h3>
                    <p className="text-sm text-center">
                      Contact your admin to start team conversations
                    </p>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                  onClick={() => console.log('Request new chat')}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Request New Chat
                </Button>
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
              {selectedRoom ? (
                <>
                  {/* Chat Header */}
                  <div className="bg-white border-b border-gray-200 px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {(() => {
                          const otherParticipant = selectedRoom.participants.find(p => p.userId !== user?.id);
                          return (
                            <>
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                                {otherParticipant ? 
                                  `${otherParticipant.user.firstName?.[0]}${otherParticipant.user.lastName?.[0]}` : 
                                  'GC'
                                }
                              </div>
                              <div>
                                <h2 className="font-semibold text-gray-900">
                                  {selectedRoom.type === 'direct' && otherParticipant ? 
                                    `${otherParticipant.user.firstName} ${otherParticipant.user.lastName}` :
                                    selectedRoom.name || 'Group Chat'
                                  }
                                </h2>
                                <p className="text-sm text-green-600">Online</p>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm">
                          <Phone className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Video className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
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
                              <div className={`max-w-md px-4 py-3 rounded-2xl ${
                                isOwnMessage 
                                  ? 'bg-blue-500 text-white' 
                                  : 'bg-white text-gray-900 shadow-sm border border-gray-100'
                              }`}>
                                {!isOwnMessage && (
                                  <p className="text-xs font-medium mb-1 opacity-75">
                                    {message.sender.firstName} {message.sender.lastName}
                                  </p>
                                )}
                                <p className="text-sm leading-relaxed">{message.content}</p>
                                {message.messageType === 'ticket_tag' && message.metadata && (
                                  <div className="mt-2 text-xs opacity-75 flex items-center gap-1">
                                    🎫 Ticket referenced
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
                              <div className="bg-gray-200 text-gray-600 px-4 py-2 rounded-2xl text-sm">
                                {indicator.userName} is typing...
                              </div>
                            </div>
                          ))
                        }
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                        <MessageSquare className="w-16 h-16 mb-4 opacity-50" />
                        <h3 className="font-medium text-gray-900 mb-2">Start the conversation</h3>
                        <p className="text-sm text-center">
                          Send the first message to begin chatting
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Message Input */}
                  <div className="bg-white border-t border-gray-200 p-6">
                    <div className="flex items-end space-x-3">
                      <div className="flex-1">
                        <Textarea
                          placeholder="Type your message... Use #TK-XXXXXX-XXX to reference tickets"
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
                          className="min-h-[44px] max-h-32 resize-none"
                          disabled={isSendingMessage}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Press Enter to send • Shift + Enter for new line
                        </p>
                      </div>
                      <Button 
                        onClick={handleSendMessage}
                        disabled={!messageInput.trim() || isSendingMessage}
                        className="h-11"
                      >
                        {isSendingMessage ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center bg-gray-50">
                  <div className="text-center text-gray-500">
                    <MessageSquare className="w-20 h-20 mx-auto mb-6 opacity-30" />
                    <h2 className="text-xl font-medium text-gray-900 mb-2">Team Chat</h2>
                    <p className="text-gray-600 mb-6 max-w-md">
                      Stay connected with your team. Select a chat from the sidebar to start messaging.
                    </p>
                    <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto text-sm">
                      <div className="bg-white p-3 rounded-lg border border-gray-200">
                        <strong>💬 Real-time</strong><br />
                        <span className="text-gray-500">Instant messaging</span>
                      </div>
                      <div className="bg-white p-3 rounded-lg border border-gray-200">
                        <strong>🎫 Tickets</strong><br />
                        <span className="text-gray-500">#TK-XXXXXX-XXX</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}