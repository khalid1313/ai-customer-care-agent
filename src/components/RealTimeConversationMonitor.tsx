import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  processingTime?: number;
  topicInfo?: {
    primaryTopic: string;
    isTopicSwitch: boolean;
    previousTopic?: string;
    confidence: number;
  };
  ambiguityInfo?: {
    isAmbiguous: boolean;
    ambiguityType?: string;
  };
  flowInfo?: {
    currentFlowState: string;
    interruption?: any;
  };
  toolsUsed?: string[];
  qualityScore?: number;
  error?: string;
}

interface SessionContext {
  sessionId: string;
  customerId: string;
  currentTopic?: string;
  mentionedProducts: string[];
  mentionedOrders: string[];
  contextSwitches: number;
  ambiguousQueries: number;
  conversationComplexity: string;
  needsEscalation: boolean;
}

const RealTimeConversationMonitor: React.FC = () => {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [sessionContext, setSessionContext] = useState<SessionContext | null>(null);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [agentStats, setAgentStats] = useState<any>(null);
  const [monitoringEnabled, setMonitoringEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeSession = async () => {
    try {
      const response = await fetch('/api/enhanced-playground/start-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: 'monitor-test-' + Date.now(),
          monitoringEnabled: true
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setSessionContext(data.data.session);
        setAgentStats(data.data.agentStats);
      }
    } catch (error) {
      console.error('Failed to initialize session:', error);
    }
  };

  useEffect(() => {
    initializeSession();
  }, []);

  const sendMessage = async () => {
    if (!currentMessage.trim() || !sessionContext) return;

    const userMessage: ConversationMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: currentMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsProcessing(true);

    try {
      const response = await fetch('/api/enhanced-playground/process-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionContext.sessionId,
          message: currentMessage,
          monitoringLevel: 'comprehensive'
        })
      });

      const data = await response.json();
      
      if (data.success) {
        const assistantMessage: ConversationMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.data.response,
          timestamp: new Date().toISOString(),
          processingTime: data.data.processingTime,
          topicInfo: data.data.topicInfo,
          ambiguityInfo: data.data.ambiguityInfo,
          flowInfo: data.data.flowInfo,
          toolsUsed: data.data.toolsUsed,
          qualityScore: data.data.qualityScore
        };

        setMessages(prev => [...prev, assistantMessage]);
        setSessionContext(data.data.sessionContext);
      } else {
        const errorMessage: ConversationMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Error processing message: ' + data.error,
          timestamp: new Date().toISOString(),
          error: data.error
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const clearConversation = () => {
    setMessages([]);
    initializeSession();
  };

  const getTopicBadgeColor = (topicInfo: any) => {
    if (!topicInfo) return 'secondary';
    if (topicInfo.isTopicSwitch) return 'default';
    return 'outline';
  };

  const getFlowStateBadge = (flowState: string) => {
    const colors = {
      exploration: 'bg-blue-100 text-blue-800',
      comparison: 'bg-yellow-100 text-yellow-800',
      decision: 'bg-green-100 text-green-800',
      transaction: 'bg-purple-100 text-purple-800',
      support: 'bg-red-100 text-red-800',
      tracking: 'bg-indigo-100 text-indigo-800'
    };
    return colors[flowState as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const formatProcessingTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="h-screen flex flex-col p-4 bg-gray-50">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">Real-Time Conversation Monitor</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={clearConversation}>
              Clear Chat
            </Button>
            <Button
              variant={monitoringEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => setMonitoringEnabled(!monitoringEnabled)}
            >
              {monitoringEnabled ? "Monitoring ON" : "Monitoring OFF"}
            </Button>
          </div>
        </div>

        {/* Session Context */}
        {sessionContext && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
            <div>
              <span className="font-medium">Session:</span>
              <div className="text-xs text-gray-500 truncate">
                {sessionContext.sessionId.substring(0, 8)}...
              </div>
            </div>
            <div>
              <span className="font-medium">Current Topic:</span>
              <div className="text-xs">
                {sessionContext.currentTopic?.replace(/_/g, ' ') || 'None'}
              </div>
            </div>
            <div>
              <span className="font-medium">Context Switches:</span>
              <Badge variant="outline" className="ml-1">
                {sessionContext.contextSwitches}
              </Badge>
            </div>
            <div>
              <span className="font-medium">Ambiguous Queries:</span>
              <Badge variant="secondary" className="ml-1">
                {sessionContext.ambiguousQueries}
              </Badge>
            </div>
            <div>
              <span className="font-medium">Complexity:</span>
              <Badge 
                variant={sessionContext.conversationComplexity === 'high' ? 'destructive' : 'default'}
                className="ml-1"
              >
                {sessionContext.conversationComplexity}
              </Badge>
            </div>
            <div>
              <span className="font-medium">Escalation:</span>
              <Badge 
                variant={sessionContext.needsEscalation ? 'destructive' : 'default'}
                className="ml-1"
              >
                {sessionContext.needsEscalation ? 'NEEDED' : 'No'}
              </Badge>
            </div>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 bg-white rounded-lg shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3xl rounded-lg p-4 ${
                  message.role === 'user'
                    ? 'bg-blue-500 text-white'
                    : message.error
                    ? 'bg-red-50 border border-red-200'
                    : 'bg-gray-100'
                }`}
              >
                {/* Message Content */}
                <div className="mb-2">{message.content}</div>

                {/* Message Metadata */}
                {message.role === 'assistant' && !message.error && (
                  <div className="space-y-2 pt-2 border-t border-gray-200">
                    {/* Processing Info */}
                    <div className="flex flex-wrap gap-2 text-xs">
                      {message.processingTime && (
                        <Badge variant="outline">
                          {formatProcessingTime(message.processingTime)}
                        </Badge>
                      )}
                      {message.qualityScore && (
                        <Badge 
                          variant={message.qualityScore >= 85 ? 'default' : message.qualityScore >= 70 ? 'secondary' : 'destructive'}
                        >
                          Score: {message.qualityScore}%
                        </Badge>
                      )}
                    </div>

                    {/* Topic Information */}
                    {message.topicInfo && (
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Badge variant={getTopicBadgeColor(message.topicInfo)}>
                          {message.topicInfo.isTopicSwitch ? '🔄 ' : ''}
                          {message.topicInfo.primaryTopic.replace(/_/g, ' ')}
                        </Badge>
                        <Badge variant="outline">
                          {Math.round(message.topicInfo.confidence * 100)}% confidence
                        </Badge>
                        {message.topicInfo.isTopicSwitch && message.topicInfo.previousTopic && (
                          <Badge variant="secondary">
                            from {message.topicInfo.previousTopic.replace(/_/g, ' ')}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Flow Information */}
                    {message.flowInfo && (
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Badge 
                          className={getFlowStateBadge(message.flowInfo.currentFlowState)}
                        >
                          Flow: {message.flowInfo.currentFlowState}
                        </Badge>
                        {message.flowInfo.interruption && (
                          <Badge variant="destructive">
                            Interruption: {message.flowInfo.interruption.type}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Ambiguity Information */}
                    {message.ambiguityInfo?.isAmbiguous && (
                      <div className="flex flex-wrap gap-2 text-xs">
                        <Badge variant="secondary">
                          🤔 Ambiguous
                        </Badge>
                        {message.ambiguityInfo.ambiguityType && (
                          <Badge variant="outline">
                            {message.ambiguityInfo.ambiguityType.replace(/_/g, ' ')}
                          </Badge>
                        )}
                      </div>
                    )}

                    {/* Tools Used */}
                    {message.toolsUsed && message.toolsUsed.length > 0 && (
                      <div className="text-xs">
                        <span className="font-medium">Tools: </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {message.toolsUsed.map((tool, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {tool.replace(/_tool$/, '').replace(/_/g, ' ')}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Timestamp */}
                <div className="text-xs opacity-70 mt-2">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}

          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg p-4 max-w-xs">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                  <span className="text-sm">Processing with enhanced monitoring...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t p-4">
          <div className="flex space-x-2">
            <Input
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              placeholder="Type your message..."
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              disabled={isProcessing}
              className="flex-1"
            />
            <Button 
              onClick={sendMessage} 
              disabled={isProcessing || !currentMessage.trim()}
            >
              Send
            </Button>
          </div>
        </div>
      </div>

      {/* Side Panel with Real-time Stats */}
      {agentStats && (
        <div className="w-80 ml-4 bg-white rounded-lg shadow-sm p-4">
          <h3 className="font-semibold mb-4">Agent Statistics</h3>
          
          <div className="space-y-3 text-sm">
            <div>
              <span className="font-medium">Tools Available:</span>
              <Badge variant="outline" className="ml-2">
                {agentStats.toolCount}
              </Badge>
            </div>
            
            <div>
              <span className="font-medium">Features:</span>
              <div className="mt-1 space-y-1">
                <Badge variant={agentStats.features?.ragEnabled ? 'default' : 'secondary'}>
                  RAG {agentStats.features?.ragEnabled ? '✓' : '✗'}
                </Badge>
                <Badge variant={agentStats.features?.enforcementEnabled ? 'default' : 'secondary'}>
                  Enforcement {agentStats.features?.enforcementEnabled ? '✓' : '✗'}
                </Badge>
                <Badge variant={agentStats.features?.enhancedContextEnabled ? 'default' : 'secondary'}>
                  Context {agentStats.features?.enhancedContextEnabled ? '✓' : '✗'}
                </Badge>
              </div>
            </div>

            {sessionContext?.mentionedProducts.length > 0 && (
              <div>
                <span className="font-medium">Mentioned Products:</span>
                <div className="mt-1 space-y-1">
                  {sessionContext.mentionedProducts.slice(0, 3).map((product, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs block w-fit">
                      {product}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {sessionContext?.mentionedOrders.length > 0 && (
              <div>
                <span className="font-medium">Mentioned Orders:</span>
                <div className="mt-1 space-y-1">
                  {sessionContext.mentionedOrders.map((order, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs block w-fit">
                      {order}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RealTimeConversationMonitor;