import { useState, useEffect, useRef, useCallback } from 'react';
import { getBackendUrl } from '@/utils/config';

interface ChatMessage {
  id: string;
  chatRoomId: string;
  senderId: string;
  content: string;
  messageType: 'text' | 'file' | 'ticket_tag' | 'system';
  metadata?: string;
  createdAt: string;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
  replyTo?: {
    id: string;
    content: string;
    sender: {
      firstName: string;
      lastName: string;
    };
  };
}

interface ChatRoom {
  id: string;
  businessId: string;
  name?: string;
  type: 'direct' | 'group' | 'support';
  participants: Array<{
    userId: string;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
      role: string;
    };
  }>;
  messages: ChatMessage[];
  lastActivity: string;
}

interface TypingIndicator {
  roomId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
}

export function useChat(userId: string, businessId: string) {
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingIndicators, setTypingIndicators] = useState<TypingIndicator[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize SSE connection
  useEffect(() => {
    if (!userId) return;

    const initializeSSE = async () => {
      const backendUrl = await getBackendUrl();
      const eventSource = new EventSource(`${backendUrl}/api/agent-chat/events/${userId}`);
      
      eventSource.onopen = () => {
        setIsConnected(true);
        console.log('Chat SSE connected');
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleSSEMessage(data);
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        console.error('Chat SSE connection error');
      };

      eventSourceRef.current = eventSource;
    };

    initializeSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [userId]);

  const handleSSEMessage = (data: any) => {
    switch (data.type) {
      case 'connected':
        console.log('Chat connection established');
        break;
        
      case 'new_message':
        const newMessage = data.data as ChatMessage;
        setMessages(prev => [...prev, newMessage]);
        
        // Update last activity in chat rooms
        setChatRooms(prev => prev.map(room => 
          room.id === newMessage.chatRoomId 
            ? { ...room, lastActivity: newMessage.createdAt }
            : room
        ));
        break;
        
      case 'new_chat_room':
        const newRoom = data.data as ChatRoom;
        setChatRooms(prev => [newRoom, ...prev]);
        break;
        
      case 'typing_indicator':
        const typingData = data.data as TypingIndicator;
        setTypingIndicators(prev => {
          const filtered = prev.filter(t => t.userId !== typingData.userId || t.roomId !== typingData.roomId);
          return typingData.isTyping ? [...filtered, typingData] : filtered;
        });
        
        // Auto-remove typing indicator after 3 seconds
        setTimeout(() => {
          setTypingIndicators(prev => 
            prev.filter(t => !(t.userId === typingData.userId && t.roomId === typingData.roomId))
          );
        }, 3000);
        break;
    }
  };

  // Fetch chat rooms
  const fetchChatRooms = useCallback(async () => {
    if (!businessId) return;
    
    try {
      setLoading(true);
      const backendUrl = await getBackendUrl();
      const response = await fetch(`${backendUrl}/api/agent-chat/rooms/${businessId}`);
      
      if (response.ok) {
        const data = await response.json();
        setChatRooms(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching chat rooms:', error);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  // Fetch messages for a room
  const fetchMessages = useCallback(async (roomId: string) => {
    try {
      const backendUrl = await getBackendUrl();
      const response = await fetch(`${backendUrl}/api/agent-chat/rooms/${roomId}/messages`);
      
      if (response.ok) {
        const data = await response.json();
        setMessages(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }, []);

  // Start direct chat with another user
  const startDirectChat = useCallback(async (otherUserId: string) => {
    try {
      const backendUrl = await getBackendUrl();
      const response = await fetch(`${backendUrl}/api/agent-chat/start-direct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId,
          userId1: userId,
          userId2: otherUserId
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        const room = data.data;
        
        // Add room if it's new
        setChatRooms(prev => {
          const existing = prev.find(r => r.id === room.id);
          return existing ? prev : [room, ...prev];
        });
        
        // Select the room
        setSelectedRoom(room);
        fetchMessages(room.id);
        
        return room;
      }
    } catch (error) {
      console.error('Error starting direct chat:', error);
    }
  }, [userId, businessId, fetchMessages]);

  // Send message
  const sendMessage = useCallback(async (roomId: string, content: string, messageType: 'text' | 'ticket_tag' = 'text') => {
    if (!content.trim()) return;
    
    try {
      const backendUrl = await getBackendUrl();
      const response = await fetch(`${backendUrl}/api/agent-chat/rooms/${roomId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          senderId: userId,
          content: content.trim(),
          messageType
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        const message = data.data;
        
        // Add message to current messages
        setMessages(prev => [...prev, message]);
        
        return message;
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }, [userId]);

  // Send typing indicator
  const sendTypingIndicator = useCallback(async (roomId: string, isTyping: boolean) => {
    try {
      const backendUrl = await getBackendUrl();
      await fetch(`${backendUrl}/api/agent-chat/typing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId,
          userId,
          isTyping
        })
      });
    } catch (error) {
      console.error('Error sending typing indicator:', error);
    }
  }, [userId]);

  // Handle typing with debounce
  const handleTyping = useCallback((roomId: string) => {
    sendTypingIndicator(roomId, true);
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      sendTypingIndicator(roomId, false);
    }, 1000);
  }, [sendTypingIndicator]);

  // Select room and fetch its messages
  const selectRoom = useCallback((room: ChatRoom) => {
    setSelectedRoom(room);
    fetchMessages(room.id);
  }, [fetchMessages]);

  // Initialize chat rooms on mount
  useEffect(() => {
    fetchChatRooms();
  }, [fetchChatRooms]);

  return {
    chatRooms,
    selectedRoom,
    messages,
    typingIndicators,
    isConnected,
    loading,
    startDirectChat,
    sendMessage,
    handleTyping,
    selectRoom,
    fetchChatRooms
  };
}