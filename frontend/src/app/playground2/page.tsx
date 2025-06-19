'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Brain, Zap, Target, Clock, TrendingUp, TrendingDown, AlertTriangle, 
  CheckCircle, XCircle, Play, Pause, RotateCcw, Save, Settings,
  Bot, User, Wrench, MessageSquare, Activity, Eye, Lightbulb, Cpu, TestTube,
  BarChart3, Sparkles, TrendingUpDown, ImagePlus, X
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import Navigation from '@/components/Navigation';
// import ProtectedRoute from '@/components/ProtectedRoute';
import { getBackendUrl, resetBackendUrlCache } from '@/utils/config';

interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  image?: string;
  timestamp: Date;
  metrics: {
    processingTime: number;
    toolsCalled: string[];
    contextUsed: string[];
    qualityScore: number;
    confidence: number;
    complexity: number;
    hallucinationRisk: number;
    escalated?: boolean;
  };
  reasoning?: string[];
  toolsUsed?: Array<{
    tool: string;
    input: string;
    output: string;
  }>;
  debugFlags?: {
    used_langchain?: boolean;
    used_memory?: boolean;
    used_long_term_memory?: boolean;
    used_context_manager?: boolean;
    used_reference_resolution?: boolean;
    used_tool_enforcement?: boolean;
    used_product_tracking?: boolean;
    session_persistent?: boolean;
    tools_available?: number;
    mentioned_products_count?: number;
    resolved_references?: any;
    enforced_tools?: any;
    error_occurred?: boolean;
    confidence_score?: number;
    escalation_triggered?: boolean;
    session_id?: string;
  };
}

interface SessionMetrics {
  sessionId: string;
  duration: number;
  totalMessages: number;
  contextSwitches: number;
  toolUsageCount: number;
  avgResponseTime: number;
  avgQualityScore: number;
  coherenceScore: number;
  memoryLoad: number;
  escalationRisk: number;
}

export default function Playground2Page() {
  const [selectedAgent, setSelectedAgent] = useState('enhanced-sales-agent');
  const [sessionActive, setSessionActive] = useState(false);
  const [isAiEnabled, setIsAiEnabled] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [autoMode, setAutoMode] = useState(false);
  const [backendLogs, setBackendLogs] = useState<string[]>([]);
  const [showBackendLogs, setShowBackendLogs] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const autoModeRef = useRef(false);
  const currentMessageIndexRef = useRef(0);
  const messagesRef = useRef([]);
  
  
  useEffect(() => {
    autoModeRef.current = autoMode;
  }, [autoMode]);
  
  useEffect(() => {
    currentMessageIndexRef.current = currentMessageIndex;
  }, [currentMessageIndex]);
  
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  
  // Reset backend URL cache to force re-discovery
  useEffect(() => {
    resetBackendUrlCache();
  }, []);

  // Load AI toggle state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('playground2-ai-enabled')
    if (savedState !== null) {
      setIsAiEnabled(JSON.parse(savedState))
    }
  }, [])

  // Save AI toggle state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('playground2-ai-enabled', JSON.stringify(isAiEnabled))
  }, [isAiEnabled])

  const [sessionId] = useState(() => `session-${Date.now()}`);
  const [sessionMetrics, setSessionMetrics] = useState<SessionMetrics>({
    sessionId: sessionId,
    duration: 0,
    totalMessages: 0,
    contextSwitches: 2,
    toolUsageCount: 8,
    avgResponseTime: 1.8,
    avgQualityScore: 8.7,
    coherenceScore: 94,
    memoryLoad: 68,
    escalationRisk: 12
  });

  const [realtimeMetrics, setRealtimeMetrics] = useState({
    contextDrift: 0,
    toolAccuracy: 0,
    memoryEfficiency: 0,
    responseQuality: 0,
    hallucinationRisk: 0,
    conversationVelocity: 0
  });
  
  const [sessionStats, setSessionStats] = useState({
    coherenceScore: 0,
    memoryLoad: 0,
    contextSwitches: 0,
    toolUsageCount: 0,
    currentTopic: 'No active session',
    topicFlow: [],
    qualityScore: 0,
    driftRisk: 'N/A'
  });

  const [testSummary, setTestSummary] = useState(null);
  const [showTestSummary, setShowTestSummary] = useState(false);
  const [lastCompletedTest, setLastCompletedTest] = useState(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const agents = [
    { id: 'enhanced-sales-agent', name: 'Enhanced Sales Agent', complexity: 'High', status: 'active' },
    { id: 'super-support-agent', name: 'Super Support Agent', complexity: 'Very High', status: 'active' },
    { id: 'context-master-agent', name: 'Context Master Agent', complexity: 'Expert', status: 'training' }
  ];


  useEffect(() => {
    // Simulate real-time metric updates
    const interval = setInterval(() => {
      if (sessionActive) {
        setSessionMetrics(prev => ({
          ...prev,
          duration: prev.duration + 1
        }));
        
        // Simulate slight metric variations
        setRealtimeMetrics(prev => ({
          ...prev,
          contextDrift: prev.contextDrift + (Math.random() - 0.5) * 0.2,
          toolAccuracy: Math.max(70, Math.min(100, prev.toolAccuracy + (Math.random() - 0.5) * 5)),
          responseQuality: Math.max(6, Math.min(10, prev.responseQuality + (Math.random() - 0.5) * 0.5))
        }));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionActive]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  // Calculate real-time metrics from messages (debounced to prevent flickering)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (messages.length === 0) {
        setRealtimeMetrics({
          contextDrift: 0,
          toolAccuracy: 0,
          memoryEfficiency: 0,
          responseQuality: 0,
          hallucinationRisk: 0,
          conversationVelocity: 0
        });
        setSessionStats({
          coherenceScore: 0,
          memoryLoad: 0,
          contextSwitches: 0,
          toolUsageCount: 0,
          currentTopic: 'No active session',
          topicFlow: [],
          qualityScore: 0,
          driftRisk: 'N/A'
        });
        return;
      }

      const agentMessages = messages.filter(m => m.role === 'agent');
      if (agentMessages.length === 0) return;

      // Calculate metrics from actual message data
      const avgQuality = agentMessages.reduce((sum, m) => sum + (m.metrics.qualityScore || 0), 0) / agentMessages.length;
      const avgConfidence = agentMessages.reduce((sum, m) => sum + (m.metrics.confidence || 0), 0) / agentMessages.length;
      const avgHallucinationRisk = agentMessages.reduce((sum, m) => sum + (m.metrics.hallucinationRisk || 0), 0) / agentMessages.length;
      const totalToolsUsed = agentMessages.reduce((sum, m) => sum + (m.metrics.toolsCalled?.length || 0), 0);
      const avgProcessingTime = agentMessages.reduce((sum, m) => sum + (m.metrics.processingTime || 0), 0) / agentMessages.length;

      // Determine current topic from latest message
      let currentTopic = 'General conversation';
      if (messages.length > 0) {
        const lastUserMessage = messages.filter(m => m.role === 'user').slice(-1)[0];
        if (lastUserMessage?.content.toLowerCase().includes('product') || lastUserMessage?.content.toLowerCase().includes('search')) {
          currentTopic = 'Product inquiry';
        } else if (lastUserMessage?.content.toLowerCase().includes('order') || lastUserMessage?.content.toLowerCase().includes('track')) {
          currentTopic = 'Order management';
        } else if (lastUserMessage?.content.toLowerCase().includes('support') || lastUserMessage?.content.toLowerCase().includes('help')) {
          currentTopic = 'Customer support';
        }
      }

      setRealtimeMetrics({
        contextDrift: Math.max(0, (1 - avgConfidence) * 5),
        toolAccuracy: Math.round(avgConfidence * 100),
        memoryEfficiency: Math.round((1 - avgHallucinationRisk) * 100),
        responseQuality: avgQuality * 10,
        hallucinationRisk: Math.round(avgHallucinationRisk * 100),
        conversationVelocity: Math.round((agentMessages.length / Math.max(sessionMetrics.duration, 1)) * 60)
      });

      setSessionStats({
        coherenceScore: Math.round(avgQuality * 100),
        memoryLoad: Math.round((totalToolsUsed / Math.max(agentMessages.length, 1)) * 20),
        contextSwitches: Math.max(0, agentMessages.length - 1),
        toolUsageCount: totalToolsUsed,
        currentTopic: currentTopic,
        topicFlow: [`${currentTopic}`],
        qualityScore: Math.round(avgQuality * 100),
        driftRisk: avgHallucinationRisk < 0.2 ? 'Low' : avgHallucinationRisk < 0.5 ? 'Medium' : 'High'
      });

      // Update session metrics with real data
      setSessionMetrics(prev => ({
        ...prev,
        totalMessages: messages.length,
        avgResponseTime: avgProcessingTime,
        avgQualityScore: avgQuality * 10,
        toolUsageCount: totalToolsUsed,
        coherenceScore: Math.round(avgQuality * 100)
      }));
    }, 500); // 500ms debounce to prevent flickering

    return () => clearTimeout(timeoutId);
  }, [messages, sessionMetrics.duration]);

  const startSession = () => {
    setSessionActive(true);
    setSessionMetrics(prev => ({ ...prev, sessionId: `session_${Date.now()}` }));
  };

  const pauseSession = () => {
    setSessionActive(false);
  };

  const resetSession = () => {
    setSessionActive(false);
    setMessages([]);
    setActiveTestScenario(null);
    // Generate new session ID for reset
    const newSessionId = `session_${Date.now()}`;
    setSessionMetrics(prev => ({
      ...prev,
      sessionId: newSessionId,
      duration: 0,
      totalMessages: 0
    }));
    
  };

  const generateAgentResponse = useCallback((userMessage: string, category: string) => {
    // Simple response generation based on category
    if (category === 'Product Search') {
      return "I'd be happy to help you find the perfect gaming mouse! Let me search our inventory for options under $100. We have several excellent choices including the ErgoGrip Gaming Mouse ($79.99) and the ProGamer Elite ($89.99). Both offer high precision and comfortable design. Would you like me to compare their features for you?";
    } else if (category === 'Order Management') {
      return "I sincerely apologize for the delay with your order ORD-2024-001. Let me check the tracking details immediately. I can see there's been an unexpected delay at the distribution center. I'm escalating this to our shipping team right away and will arrange for expedited delivery at no extra cost.";
    } else if (category === 'Customer Service') {
      return "I completely understand your frustration, and I sincerely apologize for this unacceptable experience. This is not the level of service we strive for. Let me personally ensure this gets resolved immediately. I'm processing a full refund for the incorrect item and arranging overnight shipping for your ProGamer mouse at no charge.";
    } else {
      return "I understand your concern and I'm here to help resolve this issue quickly and efficiently. Let me gather the necessary information to provide you with the best possible solution.";
    }
  }, []);


  // AI-powered gap analysis
  const analyzeConversationGaps = useCallback(async (scenario: any, finalMessages: Message[]) => {
    try {
      // Validate inputs
      if (!scenario || !finalMessages || finalMessages.length === 0) {
        throw new Error('Invalid scenario or messages data');
      }

      // Prepare conversation for AI analysis
      const conversationText = finalMessages.map(msg => 
        `${msg.role.toUpperCase()}: ${msg.content}`
      ).join('\n\n');

      const analysisPrompt = `
Please analyze this customer service conversation and identify gaps, missed opportunities, and areas for improvement.

SCENARIO: ${scenario.name} - ${scenario.category}
DIFFICULTY: ${scenario.difficulty}
DESCRIPTION: ${scenario.description}

CONVERSATION:
${conversationText}

Please provide a JSON response with the following structure:
{
  "gaps": [
    {
      "type": "missed_opportunity",
      "description": "Brief description of what was missed",
      "location": "Message number or general area",
      "impact": "high|medium|low",
      "recommendation": "Specific action to address this gap"
    }
  ],
  "strengths": ["List of things the agent did well"],
  "overallAssessment": "Brief overall assessment of the conversation quality",
  "priority_actions": ["Top 3 most important improvements needed"]
}

Focus on:
- Missed upselling/cross-selling opportunities
- Incomplete problem resolution
- Lack of proactive suggestions
- Poor empathy or customer service
- Inefficient tool usage
- Information gaps
- Communication clarity issues
`;

      const response = await fetch(`${await getBackendUrl()}/api/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: analysisPrompt,
          sessionId: `gap-analysis-${Date.now()}`,
          agentType: 'enhanced-sales-agent'
        }),
      });

      if (response.ok) {
        const data = await response.json();
        try {
          // Try to parse JSON from the response
          const jsonMatch = data.response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
          }
        } catch (e) {
          console.warn('Could not parse AI gap analysis response as JSON');
        }
      }
    } catch (error) {
      console.error('Error in AI gap analysis:', error);
    }

    // Fallback gap analysis
    return {
      gaps: [{
        type: "analysis_unavailable",
        description: "AI gap analysis temporarily unavailable",
        location: "System",
        impact: "low",
        recommendation: "Manual review recommended for detailed gap analysis"
      }],
      strengths: ["Conversation completed successfully"],
      overallAssessment: "Manual review needed for detailed assessment",
      priority_actions: ["Enable AI analysis for future tests"]
    };
  }, []);

  // Generate test summary with AI-powered improvement recommendations
  const generateTestSummary = useCallback(async (scenario: any, finalMessages: Message[]) => {
    try {
      // Validate inputs
      if (!scenario || !finalMessages || finalMessages.length === 0) {
        console.warn('Invalid scenario or messages data for test summary');
        return null;
      }

      const agentMessages = finalMessages.filter(m => m.role === 'agent');
      if (agentMessages.length === 0) {
        console.warn('No agent messages found for test summary');
        return null;
      }

    const avgQuality = agentMessages.reduce((sum, m) => sum + (m.metrics.qualityScore || 0), 0) / agentMessages.length;
    const avgConfidence = agentMessages.reduce((sum, m) => sum + (m.metrics.confidence || 0), 0) / agentMessages.length;
    const avgHallucinationRisk = agentMessages.reduce((sum, m) => sum + (m.metrics.hallucinationRisk || 0), 0) / agentMessages.length;
    const avgProcessingTime = agentMessages.reduce((sum, m) => sum + (m.metrics.processingTime || 0), 0) / agentMessages.length;
    const totalToolsUsed = agentMessages.reduce((sum, m) => sum + (m.metrics.toolsCalled?.length || 0), 0);

    // Calculate scores based on current context monitor data
    const qualityScore = Math.round(avgQuality * 100);
    const confidenceScore = Math.round(avgConfidence * 100);
    const hallucinationScore = Math.round((1 - avgHallucinationRisk) * 100);
    const speedScore = avgProcessingTime < 2 ? 100 : avgProcessingTime < 4 ? 80 : avgProcessingTime < 6 ? 60 : 40;
    const toolEfficiencyScore = totalToolsUsed > 0 ? Math.min(100, (totalToolsUsed / agentMessages.length) * 50) : 0;

    // Context-aware scoring
    const contextSwitches = (() => {
      const topics = [];
      finalMessages.filter(m => m.role === 'user').forEach(msg => {
        const content = msg.content.toLowerCase();
        let topic = 'general';
        if (content.includes('order') || content.includes('track')) topic = 'order';
        else if (content.includes('product') || content.includes('search')) topic = 'product';
        else if (content.includes('return')) topic = 'return';
        
        if (topics.length === 0 || topics[topics.length - 1] !== topic) {
          topics.push(topic);
        }
      });
      return topics.length - 1;
    })();

    const overallScore = Math.round((qualityScore + confidenceScore + hallucinationScore + speedScore + toolEfficiencyScore) / 5);

    // Get AI gap analysis
    const gapAnalysis = await analyzeConversationGaps(scenario, finalMessages);

    // Generate context-aware improvements
    const improvements = [];
    
    // Add AI-identified gaps as improvements
    gapAnalysis.gaps.forEach(gap => {
      if (gap.impact === 'high' || gap.impact === 'medium') {
        improvements.push({
          area: gap.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
          issue: gap.description,
          recommendation: gap.recommendation,
          priority: gap.impact === 'high' ? 'High' : 'Medium',
          location: gap.location,
          aiIdentified: true
        });
      }
    });

    // Traditional metric-based improvements
    if (qualityScore < 70) {
      improvements.push({
        area: "Response Quality",
        issue: "Agent responses lack depth and completeness",
        recommendation: "Improve prompting to encourage more detailed, helpful responses",
        priority: "High"
      });
    }
    
    if (toolEfficiencyScore < 30 && scenario.category !== 'General') {
      improvements.push({
        area: "Tool Usage",
        issue: "Underutilizing available tools for task completion",
        recommendation: "Train agent to identify when tools are needed and use them effectively",
        priority: "Medium"
      });
    }

    if (contextSwitches > 3) {
      improvements.push({
        area: "Context Management",
        issue: `High number of topic switches (${contextSwitches}) may indicate confusion`,
        recommendation: "Improve context tracking and topic transition handling",
        priority: "Medium"
      });
    }

      return {
        scenario: scenario,
        performance: {
          overallScore,
          qualityScore,
          confidenceScore,
          hallucinationScore,
          speedScore,
          toolEfficiencyScore,
          avgProcessingTime: avgProcessingTime.toFixed(1),
          totalMessages: finalMessages.length,
          toolsUsed: totalToolsUsed,
          contextSwitches: contextSwitches
        },
        improvements: improvements.length > 0 ? improvements : [{
          area: "Overall Performance",
          issue: "No significant issues detected",
          recommendation: "Consider testing with more complex scenarios to identify edge cases",
          priority: "Low"
        }],
        gapAnalysis: gapAnalysis,
        completedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error generating test summary:', error);
      return {
        scenario: scenario || { name: 'Unknown', category: 'Unknown', difficulty: 'Unknown' },
        performance: {
          overallScore: 0,
          qualityScore: 0,
          confidenceScore: 0,
          hallucinationScore: 0,
          speedScore: 0,
          toolEfficiencyScore: 0,
          avgProcessingTime: '0.0',
          totalMessages: finalMessages?.length || 0,
          toolsUsed: 0,
          contextSwitches: 0
        },
        improvements: [{
          area: "Error",
          issue: "Failed to generate test summary",
          recommendation: "Check console for error details and try again",
          priority: "High"
        }],
        gapAnalysis: {
          gaps: [],
          strengths: [],
          overallAssessment: "Summary generation failed",
          priority_actions: ["Fix summary generation error"]
        },
        completedAt: new Date().toISOString()
      };
    }
  }, [analyzeConversationGaps]);

  // Handle image upload
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Remove selected image
  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
  };

  // Convert image to base64
  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const sendMessage = async () => {
    if ((!currentMessage.trim() && !selectedImage) || !sessionActive) return;

    let imageBase64 = null;
    if (selectedImage) {
      imageBase64 = await convertToBase64(selectedImage);
    }

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: currentMessage || (selectedImage ? "🖼️ Image uploaded" : ""),
      image: imagePreview,
      timestamp: new Date(),
      metrics: {
        processingTime: 0,
        toolsCalled: [],
        contextUsed: [],
        qualityScore: 0,
        confidence: 0,
        complexity: Math.floor(Math.random() * 5) + 3,
        hallucinationRisk: 0
      }
    };

    setMessages(prev => [...prev, userMessage]);
    const messageToSend = currentMessage;
    const currentImage = imageBase64;
    setCurrentMessage('');
    removeImage();
    
    if (isAiEnabled) {
      // Use real AI backend
      try {
        const backendUrl = await getBackendUrl();
        console.log('🚀 SENDING MESSAGE:', {
          message: messageToSend,
          sessionId: sessionMetrics.sessionId,
          url: `${backendUrl}/api/ai-chat`
        });
        
        // Call real AI backend
        const response = await fetch(`${backendUrl}/api/ai-chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: messageToSend,
            image: currentImage,
            sessionId: sessionMetrics.sessionId,
            agentType: selectedAgent,
          }),
        });

        console.log('📡 RESPONSE STATUS:', response.status, response.statusText);
        
        if (response.ok) {
          const data = await response.json();
          console.log('📦 RESPONSE DATA:', data);
          
          // Update session ID if backend returned a different one
          if (data.sessionId && data.sessionId !== sessionMetrics.sessionId) {
            console.log('🔄 UPDATING SESSION ID from', sessionMetrics.sessionId, 'to', data.sessionId);
            setSessionMetrics(prev => ({
              ...prev,
              sessionId: data.sessionId
            }));
          }
          
          const agentMessage: Message = {
            id: `msg_${Date.now() + 1}`,
            role: 'agent',
            content: data.response || 'I apologize, but I encountered an issue processing your request.',
            timestamp: new Date(),
            metrics: {
              processingTime: data.metrics?.processingTime || Math.random() * 2 + 0.5,
              toolsCalled: data.metrics?.toolsCalled || [],
              contextUsed: data.metrics?.contextUsed || [],
              qualityScore: data.metrics?.qualityScore || Math.random() * 2 + 8,
              confidence: data.metrics?.confidence || Math.random() * 20 + 80,
              complexity: data.metrics?.complexity || Math.floor(Math.random() * 4) + 6,
              hallucinationRisk: data.metrics?.hallucinationRisk || Math.random() * 15,
              escalated: data.metrics?.escalated || false
            },
            reasoning: data.reasoning || [],
            toolsUsed: data.toolsUsed || [],
            debugFlags: data.debugFlags || {}
          };

          // Create detailed LangChain execution logs matching server output
          const processingLogs = [
            `🔗 LangChain Agent Execution Started`,
            `📝 User Input: "${messageToSend}"`,
            `⚡ Agent Type: ${selectedAgent}`,
            `🗄️  Session: ${data.sessionId || sessionMetrics.sessionId}`,
            ``,
            `🤖 Enhanced AI Agent initialized successfully:`,
            `   ├── Tool Count: ${data.debugFlags?.tools_available || '10'}`,
            `   ├── Model: ${data.debugFlags?.model || 'gpt-3.5-turbo'}`,
            `   └── Session: ${data.sessionId || sessionMetrics.sessionId}`,
            ``,
            `🧠 LangChain Processing Status:`,
            `   ├── Memory: ${data.debugFlags?.used_memory ? '✅ Active' : '❌ Inactive'}`,
            `   ├── Context Manager: ${data.debugFlags?.used_context_manager ? '✅ Active' : '❌ Inactive'}`,
            `   ├── Tool Enforcement: ${data.debugFlags?.used_tool_enforcement ? '✅ Active' : '❌ Inactive'}`,
            `   └── Session Persistent: ${data.debugFlags?.session_persistent ? '✅ Yes' : '❌ No'}`,
            ``,
            `🔧 Tool Execution:`,
            `   ├── Tools Called: ${data.metrics?.toolsCalled?.length || 0}`,
            ...(data.metrics?.toolsCalled?.map((tool, index) => {
              const isLast = index === (data.metrics?.toolsCalled?.length || 1) - 1;
              return `   ${isLast ? '└──' : '├──'} ${tool} called with input: "${messageToSend}"`;
            }) || ['   └── No tools called']),
            ``,
            `📊 Execution Results:`,
            `   ├── Processing Time: ${data.metrics?.processingTime?.toFixed(3) || 'N/A'}s`,
            `   ├── Tools Called Count: ${data.metrics?.toolsCalled?.length || 0}`,
            `   ├── Context Used: ${data.metrics?.contextUsed?.join(', ') || 'conversation_history'}`,
            `   ├── Products Mentioned: ${data.debugFlags?.mentioned_products_count || 0}`,
            `   ├── Quality Score: ${data.metrics?.qualityScore?.toFixed(2) || 'N/A'}`,
            `   └── Confidence: ${data.metrics?.confidence?.toFixed(1) || 'N/A'}%`,
            ``,
            `✅ AI Chat processed successfully`
          ];

          // Add logs message right after agent response
          const logsMessage: Message = {
            id: `logs_${Date.now() + 2}`,
            role: 'agent',
            content: '',
            timestamp: new Date(),
            metrics: {
              processingTime: 0,
              toolsCalled: [],
              contextUsed: [],
              qualityScore: 0,
              confidence: 0,
              complexity: 0,
              hallucinationRisk: 0
            },
            debugFlags: { 
              isLogMessage: true,
              specificLogs: processingLogs,
              isAutomatic: true
            }
          };

          setMessages(prev => [...prev, agentMessage, logsMessage]);
          
          // Fetch backend logs for this session (use the actual session ID from response)
          try {
            const backendUrl = await getBackendUrl();
            const actualSessionId = data.sessionId || sessionMetrics.sessionId;
            console.log('🔍 FETCHING LOGS for session:', actualSessionId, 'from:', `${backendUrl}/api/logs/${actualSessionId}`);
            const logsResponse = await fetch(`${backendUrl}/api/logs/${actualSessionId}`);
            if (logsResponse.ok) {
              const logsData = await logsResponse.json();
              console.log('📋 LOGS RECEIVED:', logsData.logs?.length || 0, 'entries');
              console.log('📋 LOG CONTENT:', logsData.logs);
              setBackendLogs(logsData.logs || []);
            } else {
              console.log('❌ Logs response not ok:', logsResponse.status);
            }
          } catch (error) {
            console.error('❌ Error fetching backend logs:', error);
          }
          
          // Update session metrics with real data
          setSessionMetrics(prev => ({
            ...prev,
            totalMessages: prev.totalMessages + 2,
            toolUsageCount: prev.toolUsageCount + (data.metrics?.toolsCalled?.length || 0),
            avgResponseTime: ((prev.avgResponseTime * (prev.totalMessages - 2)) + (data.metrics?.processingTime || 1)) / prev.totalMessages,
            avgQualityScore: ((prev.avgQualityScore * (prev.totalMessages - 2)) + (data.metrics?.qualityScore || 8)) / prev.totalMessages
          }));
        } else {
          throw new Error('Failed to get AI response');
        }
      } catch (error) {
        console.error('❌ ERROR calling AI agent:', error);
        console.error('❌ ERROR details:', {
          message: error.message,
          stack: error.stack,
          sessionId: sessionMetrics.sessionId
        });
        
        // Fallback to simulated response if AI fails
        const agentMessage: Message = {
          id: `msg_${Date.now() + 1}`,
          role: 'agent',
          content: generateAIResponse(messageToSend) + ' (AI failed, using mock response)',
          timestamp: new Date(),
          metrics: {
            processingTime: Math.random() * 2 + 0.5,
            toolsCalled: ['ProductSearch', 'FAQ'].slice(0, Math.floor(Math.random() * 2) + 1),
            contextUsed: ['Previous Products', 'User Preferences'],
            qualityScore: Math.random() * 2 + 8,
            confidence: Math.random() * 20 + 80,
            complexity: Math.floor(Math.random() * 4) + 6,
            hallucinationRisk: Math.random() * 15
          }
        };

        setMessages(prev => [...prev, agentMessage]);
        setSessionMetrics(prev => ({
          ...prev,
          totalMessages: prev.totalMessages + 2,
          toolUsageCount: prev.toolUsageCount + agentMessage.metrics.toolsCalled.length
        }));
      }
    } else {
      // Use mock response when AI is disabled
      console.log('🔄 AI DISABLED - Using mock response');
      const agentMessage: Message = {
        id: `msg_${Date.now() + 1}`,
        role: 'agent',
        content: generateAIResponse(messageToSend) + ' (Mock response - AI is disabled)',
        timestamp: new Date(),
        metrics: {
          processingTime: Math.random() * 2 + 0.5,
          toolsCalled: ['ProductSearch', 'FAQ'].slice(0, Math.floor(Math.random() * 2) + 1),
          contextUsed: ['Previous Products', 'User Preferences'],
          qualityScore: Math.random() * 2 + 8,
          confidence: Math.random() * 20 + 80,
          complexity: Math.floor(Math.random() * 4) + 6,
          hallucinationRisk: Math.random() * 15
        }
      };

      // Simulate delay for mock response
      setTimeout(() => {
        setMessages(prev => [...prev, agentMessage]);
        setSessionMetrics(prev => ({
          ...prev,
          totalMessages: prev.totalMessages + 2,
          toolUsageCount: prev.toolUsageCount + agentMessage.metrics.toolsCalled.length
        }));
      }, 800);
    }
  };

  const generateAIResponse = (userInput: string): string => {
    const responses = [
      "I'd be happy to help you find the perfect headphones! Based on your requirements for gaming, music, and work calls under $300, I recommend comparing our top 3 models: the SoundMax Pro ($279), AudioTech Elite ($249), and VoiceControl Master ($199). Each offers excellent features for different use cases.",
      "I understand you need these urgently for a gift. Let me check your order #12345 status immediately. I can see there was a shipping delay due to weather conditions. I'm escalating this to our priority shipping team and will arrange express delivery to ensure you receive it by tomorrow morning.",
      "For your home office connectivity needs, I can suggest several solutions. Could you help me understand what type of connectivity you're looking for? Are you interested in communication devices, networking equipment, or productivity tools?"
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };


  return (
    <div>
      <div className="min-h-screen bg-gray-50 flex">
        <Navigation />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Playground 2.0</h1>
                <p className="text-gray-600">Advanced AI Conversation Intelligence Platform</p>
              </div>
              <div className="flex items-center space-x-3">
                {/* AI Toggle Switch */}
                <div className="flex items-center space-x-2 px-3 py-1 bg-gray-100 rounded-lg">
                  <Label htmlFor="ai-toggle-2" className="text-sm font-medium text-gray-700">
                    AI
                  </Label>
                  <Switch
                    id="ai-toggle-2"
                    checked={isAiEnabled}
                    onCheckedChange={setIsAiEnabled}
                    className="data-[state=checked]:bg-green-600"
                  />
                  <Badge variant={isAiEnabled ? "default" : "secondary"} className="text-xs">
                    {isAiEnabled ? "ON" : "OFF"}
                  </Badge>
                </div>
                <Badge variant={sessionActive ? "default" : "secondary"} className="px-3 py-1">
                  {sessionActive ? <><Zap className="w-3 h-3 mr-1" />Live</> : <><Pause className="w-3 h-3 mr-1" />Paused</>}
                </Badge>
                {!sessionActive && (
                  <Button variant="default" size="sm" onClick={startSession}>
                    <Play className="w-4 h-4 mr-2" />Start
                  </Button>
                )}
                {sessionActive && (
                  <Button variant="outline" size="sm" onClick={pauseSession}>
                    <Pause className="w-4 h-4 mr-2" />Pause
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={resetSession}>
                  <RotateCcw className="w-4 h-4 mr-2" />Reset
                </Button>
                <Button variant="outline" size="sm">
                  <Save className="w-4 h-4 mr-2" />Save Session
                </Button>
              </div>
            </div>
          </header>

          {/* Main Content Grid */}
          <div className="flex-1 grid grid-cols-12 gap-4 p-4 overflow-hidden">
            
            {/* Left Panel - Context Intelligence Dashboard */}
            <div className="col-span-3 space-y-2 overflow-y-auto">
              
              {/* Context Monitor - Terminal Design */}
              <Card className="bg-gray-900 border-gray-700 shadow-xl">
                {/* Terminal Header */}
                <CardHeader className="pb-2 bg-gray-800 rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      </div>
                      <span className="text-gray-300 text-xs font-mono">context-monitor</span>
                    </div>
                    <div className="text-xs text-gray-400 font-mono">
                      active monitoring session
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 font-mono mt-1">
                    $ monitoring conversation context • turns: {messages.length}
                  </div>
                </CardHeader>
                
                <CardContent className="bg-gray-900 text-gray-100 p-4 font-mono text-xs">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-500 py-6">
                      <div className="text-gray-400 mb-2">┌─ Context Monitor ─┐</div>
                      <div className="text-gray-500">│ No active session │</div>
                      <div className="text-gray-500">│ Waiting for data... │</div>
                      <div className="text-gray-400">└─────────────────────┘</div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Terminal-style status line */}
                      <div className="text-green-400 border-b border-gray-700 pb-2">
                        <span className="text-gray-400">$</span> <span className="text-white">context</span> --status --live
                      </div>

                      {/* Topics & Context Switches */}
                      <div className="bg-gray-800 rounded-lg p-3 border-l-4 border-green-500">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="text-green-400 w-5 flex-shrink-0">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 1.414L10.586 9.5H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="text-green-400 font-bold text-sm">TOPICS & CONTEXT</div>
                        </div>
                        <div className="ml-8 space-y-1">
                          <div className="text-xs">
                            <span className="text-gray-400">Current:</span>
                            <span className="text-white font-medium ml-2">
                              {(() => {
                                const lastUserMessage = messages.filter(m => m.role === 'user').slice(-1)[0];
                                if (!lastUserMessage) return 'general';
                                
                                const content = lastUserMessage.content.toLowerCase();
                                if (content.includes('order') || content.includes('track')) return 'order_tracking';
                                if (content.includes('product') || content.includes('search') || content.includes('find')) return 'product';
                                if (content.includes('return') || content.includes('refund')) return 'returns';
                                if (content.includes('payment') || content.includes('pay')) return 'payment';
                                if (content.includes('shipping') || content.includes('delivery')) return 'shipping';
                                if (content.includes('cart') || content.includes('add') || content.includes('remove')) return 'cart';
                                return 'general';
                              })()}
                            </span>
                          </div>
                          <div className="text-xs">
                            <span className="text-gray-400">Previous:</span>
                            <span className="text-gray-300 ml-2">
                              {(() => {
                                const userMessages = messages.filter(m => m.role === 'user');
                                if (userMessages.length < 2) return 'null';
                                
                                const prevMessage = userMessages[userMessages.length - 2];
                                const content = prevMessage.content.toLowerCase();
                                if (content.includes('order') || content.includes('track')) return 'order_tracking';
                                if (content.includes('product') || content.includes('search')) return 'product';
                                if (content.includes('return') || content.includes('refund')) return 'returns';
                                if (content.includes('payment')) return 'payment';
                                if (content.includes('shipping')) return 'shipping';
                                if (content.includes('cart')) return 'cart';
                                return 'general';
                              })()}
                            </span>
                          </div>
                          <div className="text-xs">
                            <span className="text-gray-400">Switches:</span>
                            <span className="text-cyan-400 font-bold ml-2">
                              {(() => {
                                let switches = 0;
                                let lastTopic = null;
                                messages.filter(m => m.role === 'user').forEach(msg => {
                                  const content = msg.content.toLowerCase();
                                  let topic = 'general';
                                  if (content.includes('order') || content.includes('track')) topic = 'order';
                                  else if (content.includes('product') || content.includes('search')) topic = 'product';
                                  else if (content.includes('return')) topic = 'return';
                                  else if (content.includes('payment')) topic = 'payment';
                                  else if (content.includes('shipping')) topic = 'shipping';
                                  else if (content.includes('cart')) topic = 'cart';
                                  
                                  if (lastTopic && lastTopic !== topic) switches++;
                                  lastTopic = topic;
                                });
                                return switches;
                              })()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Product Tracking */}
                      <div className="bg-gray-800 rounded-lg p-3 border-l-4 border-blue-500">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="text-blue-400 w-5 flex-shrink-0">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 2L3 7v11a1 1 0 001 1h12a1 1 0 001-1V7l-7-5zM9 10a1 1 0 012 0v4a1 1 0 11-2 0v-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="text-blue-400 font-bold text-sm">PRODUCT TRACKING</div>
                        </div>
                        <div className="ml-8 space-y-1">
                          <div className="text-xs">
                            <span className="text-gray-400">Mentioned:</span>
                            <span className="text-blue-300 font-bold ml-2">
                              {(() => {
                                const productSet = new Set();
                                messages.forEach(msg => {
                                  // Also check debug flags for accurate count
                                  if (msg.debugFlags?.mentioned_products_count) {
                                    return msg.debugFlags.mentioned_products_count;
                                  }
                                  const content = msg.content.toLowerCase();
                                  if (content.includes('sony') || content.includes('wh-1000xm4')) productSet.add('Sony WH-1000XM4');
                                  if (content.includes('airpods') || content.includes('apple')) productSet.add('Apple AirPods Pro');
                                  if (content.includes('jabra') || content.includes('elite')) productSet.add('Jabra Elite 4');
                                  if (content.includes('samsung') || content.includes('galaxy')) productSet.add('Samsung Galaxy Buds');
                                  if (content.includes('anker') || content.includes('powercore')) productSet.add('Anker PowerCore');
                                });
                                // Get the latest agent message debug count
                                const lastAgentMsg = messages.filter(m => m.role === 'agent' && m.debugFlags).slice(-1)[0];
                                return lastAgentMsg?.debugFlags?.mentioned_products_count || productSet.size;
                              })()}
                            </span>
                          </div>
                          <div className="text-xs text-gray-300">
                            {(() => {
                              const productMentions = [];
                              messages.forEach(msg => {
                                const content = msg.content.toLowerCase();
                                if (content.includes('sony') || content.includes('wh-1000xm4')) {
                                  if (!productMentions.includes('Sony WH-1000XM4')) productMentions.push('Sony WH-1000XM4');
                                }
                                if (content.includes('airpods') || content.includes('apple')) {
                                  if (!productMentions.includes('Apple AirPods')) productMentions.push('Apple AirPods');
                                }
                                if (content.includes('jabra') || content.includes('elite')) {
                                  if (!productMentions.includes('Jabra Elite')) productMentions.push('Jabra Elite');
                                }
                              });
                              return productMentions.length > 0 ? productMentions.slice(0, 3).join(', ') : 'None tracked';
                            })()}
                          </div>
                        </div>
                      </div>
                      
                      {/* Cart State */}
                      <div className="bg-gray-800 rounded-lg p-3 border-l-4 border-purple-500">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="text-purple-400 w-5 flex-shrink-0">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                            </svg>
                          </div>
                          <div className="text-purple-400 font-bold text-sm">CART STATE</div>
                        </div>
                        <div className="ml-8 space-y-1">
                          <div className="text-xs">
                            <span className="text-gray-400">Items:</span>
                            <span className="text-purple-300 font-bold ml-2">
                              {(() => {
                                let cartItems = 0;
                                messages.forEach(msg => {
                                  const content = msg.content.toLowerCase();
                                  if (content.includes('added to') && content.includes('cart')) cartItems++;
                                  if (content.includes('removed from') && content.includes('cart')) cartItems--;
                                });
                                return Math.max(0, cartItems);
                              })()}
                            </span>
                          </div>
                          <div className="text-xs">
                            <span className="text-gray-400">Total:</span>
                            <span className="text-purple-300 ml-2">
                              {(() => {
                                let total = 0;
                                messages.forEach(msg => {
                                  const content = msg.content.toLowerCase();
                                  if (content.includes('$349') && content.includes('cart')) total += 349;
                                  if (content.includes('$249') && content.includes('cart')) total += 249;
                                  if (content.includes('$129') && content.includes('cart')) total += 129;
                                });
                                return total > 0 ? `$${total}` : '$0';
                              })()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Order Tracking */}
                      <div className="bg-gray-800 rounded-lg p-3 border-l-4 border-orange-500">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="text-orange-400 w-5 flex-shrink-0">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                              <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6.5a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="text-orange-400 font-bold text-sm">ORDER TRACKING</div>
                        </div>
                        <div className="ml-8 space-y-1">
                          <div className="text-xs">
                            <span className="text-gray-400">Current:</span>
                            <span className="text-orange-300 font-medium ml-2">
                              {(() => {
                                const orderMentions = [];
                                messages.forEach(msg => {
                                  const content = msg.content.toUpperCase();
                                  const orderMatch = content.match(/ORD[^\s]*/g);
                                  if (orderMatch) {
                                    orderMatch.forEach(order => {
                                      if (!orderMentions.includes(order)) orderMentions.push(order);
                                    });
                                  }
                                });
                                return orderMentions.length > 0 ? orderMentions.slice(-1)[0] : 'None';
                              })()}
                            </span>
                          </div>
                          <div className="text-xs">
                            <span className="text-gray-400">All Orders:</span>
                            <span className="text-gray-300 ml-2">
                              {(() => {
                                const orderSet = new Set();
                                messages.forEach(msg => {
                                  const content = msg.content.toUpperCase();
                                  const orderMatch = content.match(/ORD[^\s]*/g);
                                  if (orderMatch) {
                                    orderMatch.forEach(order => orderSet.add(order));
                                  }
                                });
                                return orderSet.size > 0 ? Array.from(orderSet).join(', ') : 'None';
                              })()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Conversation History */}
                      <div className="bg-gray-800 rounded-lg p-3 border-l-4 border-cyan-500">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="text-cyan-400 w-5 flex-shrink-0">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="text-cyan-400 font-bold text-sm">CONVERSATION HISTORY</div>
                        </div>
                        <div className="ml-8 space-y-1">
                          <div className="text-xs">
                            <span className="text-gray-400">Messages:</span>
                            <span className="text-cyan-300 font-bold ml-2">{messages.length}</span>
                          </div>
                          <div className="text-xs">
                            <span className="text-gray-400">Tools Used:</span>
                            <span className="text-cyan-300 ml-2">
                              {(() => {
                                const toolsUsed = new Set();
                                messages.forEach(msg => {
                                  if (msg.metrics?.toolsCalled) {
                                    msg.metrics.toolsCalled.forEach(tool => toolsUsed.add(tool));
                                  }
                                });
                                return toolsUsed.size;
                              })()}
                            </span>
                          </div>
                          <div className="text-xs">
                            <span className="text-gray-400">Last Action:</span>
                            <span className="text-gray-300 ml-2">
                              {(() => {
                                const lastAgentMsg = messages.filter(m => m.role === 'agent').slice(-1)[0];
                                if (!lastAgentMsg || !lastAgentMsg.metrics?.toolsCalled?.length) return 'None';
                                return lastAgentMsg.metrics.toolsCalled[0].replace('Tool', '');
                              })()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Conversation Flow */}
                      <div className="bg-gray-800 rounded-lg p-3 border-l-4 border-green-500">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="text-green-400 w-5 flex-shrink-0">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="text-green-400 font-bold text-sm">TOPIC FLOW</div>
                        </div>
                        <div className="text-gray-300 text-xs font-mono ml-8">
                          {(() => {
                            const topics = [];
                            messages.filter(m => m.role === 'user').forEach(msg => {
                              const content = msg.content.toLowerCase();
                              let topic = 'general';
                              if (content.includes('order') || content.includes('track')) topic = 'order';
                              else if (content.includes('product') || content.includes('search') || content.includes('find')) topic = 'product';
                              else if (content.includes('return') || content.includes('refund')) topic = 'return';
                              else if (content.includes('payment')) topic = 'payment';
                              else if (content.includes('shipping')) topic = 'shipping';
                              else if (content.includes('cart') || content.includes('add') || content.includes('remove')) topic = 'cart';
                              
                              if (topics.length === 0 || topics[topics.length - 1] !== topic) {
                                topics.push(topic);
                              }
                            });
                            return topics.length > 0 ? topics.join(' → ') : 'start';
                          })()}
                        </div>
                      </div>

                      {/* Test Scenario Status */}
                      {activeTestScenario && (
                        <div className="bg-gray-800 rounded-lg p-3 border-l-4 border-orange-500">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="text-orange-400 w-5 flex-shrink-0">
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="text-orange-400 font-bold text-sm">TEST SCENARIO ACTIVE</div>
                          </div>
                          <div className="ml-8">
                            <div className="text-white font-medium mb-1">
                              {activeTestScenario.name.toUpperCase()}
                            </div>
                            <div className="text-gray-300 text-xs mb-2">
                              {activeTestScenario.category} • {activeTestScenario.difficulty} • {currentMessageIndex + 1}/{activeTestScenario.conversation.length}
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-1.5">
                              <div 
                                className="bg-orange-500 h-1.5 rounded-full transition-all duration-300" 
                                style={{width: `${((currentMessageIndex + 1) / activeTestScenario.conversation.length) * 100}%`}}
                              ></div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Agent Reasoning Trail */}
                      {(() => {
                        const lastAgentMsg = messages.filter(m => m.role === 'agent').slice(-1)[0];
                        return lastAgentMsg?.reasoning && lastAgentMsg.reasoning.length > 0 ? (
                          <div className="bg-gray-800 rounded-lg p-3 border-l-4 border-purple-500">
                            <div className="flex items-center space-x-3 mb-2">
                              <div className="text-purple-400 w-5 flex-shrink-0">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <div className="text-purple-400 font-bold text-sm">REASONING TRAIL</div>
                            </div>
                            <div className="ml-8 space-y-1">
                              {lastAgentMsg.reasoning.map((step, index) => (
                                <div key={index} className="text-xs">
                                  <span className="text-gray-400">{index + 1}.</span>
                                  <span className="text-gray-300 ml-2">{step}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null;
                      })()}

                      {/* Tool Usage Details */}
                      {(() => {
                        const lastAgentMsg = messages.filter(m => m.role === 'agent').slice(-1)[0];
                        return lastAgentMsg?.toolsUsed && lastAgentMsg.toolsUsed.length > 0 ? (
                          <div className="bg-gray-800 rounded-lg p-3 border-l-4 border-cyan-500">
                            <div className="flex items-center space-x-3 mb-2">
                              <div className="text-cyan-400 w-5 flex-shrink-0">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm0 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <div className="text-cyan-400 font-bold text-sm">TOOLS EXECUTED</div>
                            </div>
                            <div className="ml-8 space-y-2">
                              {lastAgentMsg.toolsUsed.map((tool, index) => (
                                <div key={index} className="bg-gray-700 rounded p-2">
                                  <div className="text-xs">
                                    <span className="text-cyan-300 font-bold">{tool.tool}</span>
                                    {tool.input && (
                                      <div className="text-gray-400 mt-1">
                                        Input: {tool.input.substring(0, 50)}{tool.input.length > 50 ? '...' : ''}
                                      </div>
                                    )}
                                    {tool.output && (
                                      <div className="text-gray-300 mt-1">
                                        Result: {tool.output.substring(0, 100)}{tool.output.length > 100 ? '...' : ''}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null;
                      })()}

                      {/* Escalation Alert */}
                      {(() => {
                        const lastAgentMsg = messages.filter(m => m.role === 'agent').slice(-1)[0];
                        return lastAgentMsg?.metrics?.escalated ? (
                          <div className="bg-gray-800 rounded-lg p-3 border-l-4 border-red-500">
                            <div className="flex items-center space-x-3 mb-2">
                              <div className="text-red-400 w-5 flex-shrink-0">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                              </div>
                              <div className="text-red-400 font-bold text-sm">ESCALATION TRIGGERED</div>
                            </div>
                            <div className="ml-8">
                              <div className="text-red-300 text-xs">
                                Low confidence score detected. Agent flagged for human review.
                              </div>
                              <div className="text-gray-400 text-xs mt-1">
                                Confidence: {((lastAgentMsg.metrics.confidence || 0) * 100).toFixed(1)}%
                              </div>
                            </div>
                          </div>
                        ) : null;
                      })()}

                      {/* Terminal footer */}
                      <div className="border-t border-gray-700 pt-3 mt-4">
                        <div className="text-gray-500 text-xs">
                          <span className="text-gray-400">$</span> context monitor running • updated {new Date().toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Test Results Section */}
              <Card>
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs flex items-center">
                    <BarChart3 className="w-3 h-3 mr-1 text-green-600" />
                    Test Results & Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  {/* Show Last Test Summary */}
                  {lastCompletedTest ? (
                    <div className="space-y-2">
                      <div className="bg-green-50 border border-green-200 rounded p-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-green-800">
                            ✅ {lastCompletedTest.scenario.name}
                          </span>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setTestSummary(lastCompletedTest);
                              setShowTestSummary(true);
                            }}
                            className="text-xs h-4 px-1"
                          >
                            View Full
                          </Button>
                        </div>
                        
                        {/* Performance Metrics Grid */}
                        <div className="grid grid-cols-2 gap-1 mb-2">
                          <div className="bg-white rounded p-1 text-center">
                            <div className={`text-sm font-bold ${lastCompletedTest.performance.overallScore > 80 ? 'text-green-600' : lastCompletedTest.performance.overallScore > 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                              {lastCompletedTest.performance.overallScore}%
                            </div>
                            <div className="text-xs text-gray-600">Overall</div>
                          </div>
                          <div className="bg-white rounded p-1 text-center">
                            <div className={`text-sm font-bold ${lastCompletedTest.performance.qualityScore > 70 ? 'text-green-600' : lastCompletedTest.performance.qualityScore > 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                              {lastCompletedTest.performance.qualityScore}%
                            </div>
                            <div className="text-xs text-gray-600">Quality</div>
                          </div>
                          <div className="bg-white rounded p-1 text-center">
                            <div className="text-sm font-bold text-blue-600">
                              {lastCompletedTest.performance.avgProcessingTime}s
                            </div>
                            <div className="text-xs text-gray-600">Speed</div>
                          </div>
                          <div className="bg-white rounded p-1 text-center">
                            <div className="text-sm font-bold text-purple-600">
                              {lastCompletedTest.performance.toolsUsed}
                            </div>
                            <div className="text-xs text-gray-600">Tools</div>
                          </div>
                        </div>

                        {/* Test Details */}
                        <div className="text-xs text-green-700 space-y-0.5">
                          <div className="flex justify-between">
                            <span>Category:</span>
                            <span className="font-medium">{lastCompletedTest.scenario.category}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Difficulty:</span>
                            <span className="font-medium">{lastCompletedTest.scenario.difficulty}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Messages:</span>
                            <span className="font-medium">{lastCompletedTest.performance.totalMessages}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Context Switches:</span>
                            <span className="font-medium">{lastCompletedTest.performance.contextSwitches}</span>
                          </div>
                        </div>

                        {/* Quick Improvements */}
                        {lastCompletedTest.improvements && lastCompletedTest.improvements.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-green-200">
                            <div className="text-xs font-medium text-green-800 mb-1">Top Improvements:</div>
                            <div className="space-y-1">
                              {lastCompletedTest.improvements.slice(0, 3).map((improvement, index) => (
                                <div key={index} className="text-xs text-green-700">
                                  <span className={`inline-block w-1 h-1 rounded-full mr-1 ${
                                    improvement.priority === 'High' ? 'bg-red-500' :
                                    improvement.priority === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                                  }`}></span>
                                  <span className="font-medium">{improvement.area}:</span>
                                  <span className="ml-1">{improvement.issue}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 py-4">
                      <div className="text-xs">No test results yet</div>
                      <div className="text-xs mt-1">Run a test to see performance data</div>
                    </div>
                  )}

                </CardContent>
              </Card>
            </div>

            {/* Center Panel - Chat Interface */}
            <div className="col-span-6 flex flex-col">
              <Card className="flex-1 flex flex-col">
                <CardHeader className="pb-3 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">Advanced Conversation Testing</CardTitle>
                      <CardDescription>
                        Active Agent: {agents.find(a => a.id === selectedAgent)?.name}
                      </CardDescription>
                    </div>
                    <div className="flex space-x-2">
                      {!sessionActive ? (
                        <Button size="sm" onClick={startSession} className="bg-green-600 hover:bg-green-700">
                          <Play className="w-4 h-4 mr-1" />
                          Start
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={pauseSession}>
                          <Pause className="w-4 h-4 mr-1" />
                          Pause
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>

                {/* Messages Area */}
                <CardContent className="flex-1 flex flex-col min-h-0">
                  <div className="flex-1 bg-gray-50 rounded-lg p-4 overflow-y-auto mb-4" style={{minHeight: '400px'}}>
                    {messages.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        <div className="text-center">
                          <Bot className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                          <p>Start a conversation to see advanced metrics in action</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {messages.map((message) => (
                          <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-lg ${message.role === 'user' ? 'order-2' : 'order-1'}`}>
                              {/* Automatic Processing Logs Display */}
                              {message.debugFlags?.isLogMessage && (
                                <div className="mb-2 bg-gray-900 text-green-400 rounded-lg p-3 font-mono text-xs border">
                                  <div className="flex items-center mb-2">
                                    <Activity className="w-3 h-3 mr-1" />
                                    <span className="text-green-300 font-semibold">
                                      {message.debugFlags?.isAutomatic ? 'LangChain Execution Flow' : 'Backend Processing Logs'}
                                    </span>
                                  </div>
                                  <div className="max-h-40 overflow-y-auto space-y-1">
                                    {message.debugFlags?.specificLogs?.map((log, index) => (
                                      <div key={index} className="text-xs leading-relaxed">
                                        {log}
                                      </div>
                                    )) || backendLogs.slice(-8).map((log, index) => (
                                      <div key={index} className="text-xs">
                                        {log.replace(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\s+/, '')}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {/* Message Bubble */}
                              <div className={`px-2 py-1 rounded ${
                                message.role === 'user' 
                                  ? 'bg-purple-600 text-white' 
                                  : message.debugFlags?.isLogMessage 
                                    ? 'bg-transparent' 
                                    : 'bg-white border border-gray-200 text-gray-900'
                              }`}>
                                {!message.debugFlags?.isLogMessage && (
                                  <>
                                    {message.image && (
                                      <div className="mb-2">
                                        <img 
                                          src={message.image} 
                                          alt="Uploaded image" 
                                          className="max-w-full h-24 object-cover rounded border"
                                        />
                                      </div>
                                    )}
                                    <p className="text-xs leading-tight">{message.content}</p>
                                  </>
                                )}
                              </div>
                              
                              {/* Enhanced Message Metrics with Detailed Context Tracking */}
                              {message.role === 'agent' && (
                                <div className="mt-1 bg-gray-50 rounded border border-gray-200">
                                  {/* Response Metrics */}
                                  <div className="px-2 py-0.5 bg-gray-100 rounded-t">
                                    <div className="flex items-center space-x-3 text-xs">
                                      <div className="flex items-center space-x-1">
                                        <span className="text-blue-600 font-medium">Tools:</span>
                                        <span className="text-gray-800 font-bold">{message.metrics.toolsCalled?.length || 0}</span>
                                      </div>
                                      <div className="flex items-center space-x-1">
                                        <span className="text-purple-600 font-medium">Context:</span>
                                        <span className="text-gray-800 font-bold">{message.metrics.contextUsed?.length || 0}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Compact Context & Tool Tracking */}
                                  <div className="p-1 space-y-0.5">
                                    {/* Topic Switch & Products */}
                                    <div className="bg-amber-50 p-1 rounded text-xs">
                                      <span className="font-medium text-amber-800">🔄</span>
                                      <span className="text-amber-700 ml-1">
                                        {(() => {
                                          const userMessages = messages.filter(m => m.role === 'user');
                                          const currentMessageIndex = messages.indexOf(message);
                                          
                                          // Find the user message that triggered this agent response
                                          const triggeringUserMessage = messages.filter((m, idx) => m.role === 'user' && idx < currentMessageIndex).slice(-1)[0];
                                          
                                          if (!triggeringUserMessage) return 'start→start';
                                          
                                          // Find the previous user message for comparison
                                          const userMessageIndex = userMessages.indexOf(triggeringUserMessage);
                                          const prevUserMessage = userMessageIndex > 0 ? userMessages[userMessageIndex - 1] : null;
                                          
                                          const detectTopic = (content) => {
                                            if (!content) return 'start';
                                            const lower = content.toLowerCase();
                                            if (lower.includes('order') || lower.includes('track') || lower.includes('ord')) return 'order';
                                            if (lower.includes('product') || lower.includes('search') || lower.includes('find') || lower.includes('show') || lower.includes('headphone') || lower.includes('airpod') || lower.includes('sony') || lower.includes('apple') || lower.includes('jabra') || lower.includes('samsung')) return 'product';
                                            if (lower.includes('return') || lower.includes('refund')) return 'return';
                                            if (lower.includes('payment') || lower.includes('pay') || lower.includes('checkout')) return 'payment';
                                            if (lower.includes('shipping') || lower.includes('delivery')) return 'shipping';
                                            if (lower.includes('cart') || lower.includes('add') || lower.includes('remove')) return 'cart';
                                            if (lower.includes('policy') || lower.includes('help') || lower.includes('support')) return 'support';
                                            return 'general';
                                          };
                                          
                                          const prevTopic = prevUserMessage ? detectTopic(prevUserMessage.content) : 'start';
                                          const currentTopic = detectTopic(triggeringUserMessage.content);
                                          
                                          return `${prevTopic}→${currentTopic}`;
                                        })()}
                                      </span>
                                      <span className="text-amber-600 ml-1">|</span>
                                      <span className="font-medium text-amber-800">📦</span>
                                      <span className="text-amber-700 ml-1">
                                        {(() => {
                                          const currentUserMessage = messages.filter(m => m.role === 'user' && messages.indexOf(m) <= messages.indexOf(message)).slice(-1)[0];
                                          if (!currentUserMessage) return 'None';
                                          
                                          const content = currentUserMessage.content.toLowerCase();
                                          const products = [];
                                          if (content.includes('sony') || content.includes('wh-1000xm4')) products.push('Sony');
                                          if (content.includes('airpods') || content.includes('apple')) products.push('AirPods');
                                          if (content.includes('jabra')) products.push('Jabra');
                                          if (content.includes('samsung')) products.push('Samsung');
                                          
                                          return products.length > 0 ? products.join(',') : 'None';
                                        })()}
                                      </span>
                                    </div>

                                    {/* Tools & Context */}
                                    <div className="bg-green-50 p-1 rounded text-xs">
                                      <span className="font-medium text-green-800">🔧</span>
                                      <span className="text-green-700 ml-1">
                                        {message.metrics.toolsCalled && message.metrics.toolsCalled.length > 0 
                                          ? message.metrics.toolsCalled.map(tool => {
                                              return tool.replace('Tool', '').replace('Product', 'Prod').replace('Customer', 'Cust');
                                            }).join(',')
                                          : 'None'
                                        }
                                      </span>
                                      <span className="text-green-600 ml-1">|</span>
                                      <span className="font-medium text-green-800">🧠</span>
                                      <span className="text-green-700 ml-1">
                                        {message.metrics.contextUsed && message.metrics.contextUsed.length > 0
                                          ? message.metrics.contextUsed.map(ctx => 
                                              ctx.replace('_', ' ').replace('product_catalog', 'products')
                                                 .replace('user_preferences', 'user')
                                                 .replace('conversation_history', 'conversation')
                                            ).join(',')
                                          : 'None'
                                        }
                                      </span>
                                    </div>

                                    {/* Debug Flags */}
                                    {message.debugFlags && (
                                      <div className="bg-blue-50 p-1 rounded text-xs">
                                        <span className="font-medium text-blue-800">🔍 Debug:</span>
                                        <span className="text-blue-700 ml-1">
                                          {Object.entries(message.debugFlags)
                                            .filter(([key, value]) => value === true)
                                            .map(([key, value]) => key.replace('used_', '').replace('_', '-'))
                                            .join(',') || 'none'
                                          }
                                        </span>
                                        {message.debugFlags.tools_available && (
                                          <>
                                            <span className="text-blue-600 ml-1">|</span>
                                            <span className="text-blue-700 ml-1">tools:{message.debugFlags.tools_available}</span>
                                          </>
                                        )}
                                        {message.debugFlags.mentioned_products_count > 0 && (
                                          <>
                                            <span className="text-blue-600 ml-1">|</span>
                                            <span className="text-blue-700 ml-1">products:{message.debugFlags.mentioned_products_count}</span>
                                          </>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                              
                              <div className={`text-xs ${message.role === 'user' ? 'text-right text-gray-400' : 'text-left text-gray-400'}`}>
                                {message.timestamp.toLocaleTimeString()}
                              </div>
                            </div>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </div>

                  {/* Image Preview */}
                  {imagePreview && (
                    <div className="mb-3 p-2 bg-gray-50 rounded-lg border">
                      <div className="flex items-center space-x-3">
                        <img 
                          src={imagePreview} 
                          alt="Preview" 
                          className="h-12 w-12 object-cover rounded border"
                        />
                        <div className="flex-1">
                          <p className="text-xs text-gray-600">Image ready to send</p>
                          <p className="text-xs text-gray-400">{selectedImage?.name}</p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={removeImage}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Message Input */}
                  <div className="flex space-x-3">
                    <div className="flex-1 flex space-x-2">
                      <Input
                        value={currentMessage}
                        onChange={(e) => setCurrentMessage(e.target.value)}
                        placeholder={sessionActive ? "Type your message or upload an image..." : "Start session to begin testing"}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        className="flex-1"
                        disabled={!sessionActive}
                      />
                      
                      {/* Image Upload Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('image-upload-2')?.click()}
                        className="px-3"
                        title="Upload Image"
                        disabled={!sessionActive}
                      >
                        <ImagePlus className="w-4 h-4" />
                      </Button>
                      <input
                        id="image-upload-2"
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </div>
                    
                    <Button 
                      onClick={sendMessage} 
                      disabled={!sessionActive || (!currentMessage.trim() && !selectedImage)}
                    >
                      <MessageSquare className="w-4 h-4" />
                    </Button>
                    {messages.length > 0 && (
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          onClick={() => setShowBackendLogs(true)}
                          className="text-xs px-3 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white border-0"
                        >
                          <Activity className="w-4 h-4 mr-1" />
                          Backend Logs
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={async () => {
                            console.log('🚀 RocketLogs clicked!');
                            try {
                              const backendUrl = await getBackendUrl();
                              const sessionId = "test-return-1749670828468";
                              console.log('🚀 ROCKET LOGS: Fetching for session:', sessionId);
                              const response = await fetch(`${backendUrl}/api/logs/${sessionId}`);
                              if (response.ok) {
                                const data = await response.json();
                                console.log('🚀 ROCKET LOGS: Fetched', data.logs?.length || 0, 'logs');
                                setBackendLogs(data.logs || []);
                                
                                // Add inline logs message to chat
                                const logsMessage: Message = {
                                  id: `logs_${Date.now()}`,
                                  role: 'agent',
                                  content: '',
                                  timestamp: new Date(),
                                  metrics: {
                                    processingTime: 0,
                                    toolsCalled: [],
                                    contextUsed: [],
                                    qualityScore: 0,
                                    confidence: 0,
                                    complexity: 0,
                                    hallucinationRisk: 0
                                  },
                                  debugFlags: { isLogMessage: true }
                                };
                                
                                setMessages(prev => [...prev, logsMessage]);
                              }
                            } catch (error) {
                              console.error('Rocket logs failed:', error);
                            }
                          }}
                          className="text-xs px-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0"
                        >
                          🚀 RocketLogs
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Panel - Performance Analytics */}
            <div className="col-span-3 space-y-4 overflow-y-auto">
              




              {/* Test Summary Modal - REMOVED */}
              {false && showTestSummary && testSummary && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-lg w-full max-w-4xl h-full max-h-[90vh] overflow-hidden">
                    <div className="p-6 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-xl font-semibold">Test Results & Improvement Recommendations</h2>
                          <p className="text-gray-600 mt-1">
                            {testSummary.scenario.name} - {testSummary.scenario.category}
                          </p>
                        </div>
                        <Button 
                          variant="outline" 
                          onClick={() => setShowTestSummary(false)}
                        >
                          Close
                        </Button>
                      </div>
                    </div>
                    
                    <div className="p-6 overflow-y-auto" style={{maxHeight: 'calc(90vh - 140px)'}}>
                      {/* Performance Overview */}
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold mb-4">Performance Overview</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div className="bg-gray-50 p-4 rounded-lg text-center">
                            <div className={`text-2xl font-bold ${testSummary.performance.overallScore > 80 ? 'text-green-600' : testSummary.performance.overallScore > 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                              {testSummary.performance.overallScore}%
                            </div>
                            <div className="text-sm text-gray-600">Overall Score</div>
                          </div>
                          <div className="bg-gray-50 p-4 rounded-lg text-center">
                            <div className={`text-2xl font-bold ${testSummary.performance.qualityScore > 70 ? 'text-green-600' : testSummary.performance.qualityScore > 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                              {testSummary.performance.qualityScore}%
                            </div>
                            <div className="text-sm text-gray-600">Quality Score</div>
                          </div>
                          <div className="bg-gray-50 p-4 rounded-lg text-center">
                            <div className={`text-2xl font-bold ${testSummary.performance.speedScore > 70 ? 'text-green-600' : testSummary.performance.speedScore > 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                              {testSummary.performance.avgProcessingTime}s
                            </div>
                            <div className="text-sm text-gray-600">Avg Response Time</div>
                          </div>
                          <div className="bg-gray-50 p-4 rounded-lg text-center">
                            <div className="text-2xl font-bold text-blue-600">
                              {testSummary.performance.totalMessages}
                            </div>
                            <div className="text-sm text-gray-600">Total Messages</div>
                          </div>
                          <div className="bg-gray-50 p-4 rounded-lg text-center">
                            <div className="text-2xl font-bold text-purple-600">
                              {testSummary.performance.toolsUsed}
                            </div>
                            <div className="text-sm text-gray-600">Tools Used</div>
                          </div>
                          <div className="bg-gray-50 p-4 rounded-lg text-center">
                            <div className={`text-2xl font-bold ${testSummary.performance.hallucinationScore > 80 ? 'text-green-600' : testSummary.performance.hallucinationScore > 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                              {testSummary.performance.hallucinationScore}%
                            </div>
                            <div className="text-sm text-gray-600">Accuracy Score</div>
                          </div>
                        </div>
                      </div>

                      {/* Improvement Recommendations */}
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Improvement Recommendations</h3>
                        <div className="space-y-4">
                          {testSummary.improvements.map((improvement, index) => (
                            <div key={index} className="border border-gray-200 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="font-medium text-gray-900">{improvement.area}</h4>
                                <Badge 
                                  variant="outline"
                                  className={`${
                                    improvement.priority === 'High' ? 'border-red-300 text-red-700' :
                                    improvement.priority === 'Medium' ? 'border-yellow-300 text-yellow-700' :
                                    'border-green-300 text-green-700'
                                  }`}
                                >
                                  {improvement.priority} Priority
                                </Badge>
                              </div>
                              <div className="text-sm text-gray-600 mb-2">
                                <strong>Issue:</strong> {improvement.issue}
                              </div>
                              <div className="text-sm text-gray-600">
                                <strong>Recommendation:</strong> {improvement.recommendation}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-gray-200 text-center">
                        <p className="text-sm text-gray-500">
                          Test completed at {new Date(testSummary.completedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}


              {/* Backend Logs Modal */}
              {showBackendLogs && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-lg w-full max-w-6xl h-full max-h-[90vh] overflow-hidden">
                    <div className="p-6 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-xl font-semibold">Backend Server Logs</h2>
                          <p className="text-gray-600 mt-1">Real-time logs from the AI agent backend</p>
                        </div>
                        <Button 
                          variant="outline" 
                          onClick={() => setShowBackendLogs(false)}
                        >
                          Close
                        </Button>
                      </div>
                    </div>
                    
                    <div className="p-6 overflow-y-auto bg-gray-900 text-green-400 font-mono text-sm" style={{maxHeight: 'calc(90vh - 140px)'}}>
                      {backendLogs.length === 0 ? (
                        <div className="text-gray-500">No logs captured yet. Send some messages to see backend activity.</div>
                      ) : (
                        backendLogs.map((log, index) => (
                          <div key={index} className="mb-1 whitespace-pre-wrap">
                            {log}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}