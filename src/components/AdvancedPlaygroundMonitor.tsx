import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

interface RealTimeEvent {
  timestamp: string;
  event: string;
  messageIndex?: number;
  message?: string;
  processingTime?: number;
  toolsUsed?: number;
  workflowExecuted?: boolean;
  topicSwitch?: boolean;
  contextCompressed?: boolean;
  predictionMade?: boolean;
  workflow?: string;
  steps?: any;
  fromTopic?: string;
  toTopic?: string;
  confidence?: number;
  predictedIntent?: string;
  preparatoryActions?: number;
  error?: string;
}

interface AnalysisResult {
  messageIndex: number;
  input: {
    content: string;
    expectedTools?: string[];
    expectedTopic?: string;
    expectedWorkflow?: string;
    expectedPrediction?: string;
  };
  output: {
    response: string;
    processingTime: number;
  };
  toolAnalysis: {
    toolsUsed: string[];
    expectedTools: string[];
    toolsMatchExpected: boolean | null;
    workflowExecuted: boolean;
    workflowSteps?: any;
  };
  contextAnalysis: {
    topicInfo: any;
    topicMatched: boolean | null;
    topicSwitchDetected: boolean;
    topicSwitchExpected: boolean;
    flowInfo: any;
    contextRecovery: boolean;
  };
  advancedAnalysis?: {
    workflowAnalysis: any;
    predictiveAnalysis: any;
    customerAnalysis: any;
    contextManagement: any;
    qualityMetrics: {
      responseLength: number;
      responseQuality: number;
      contextAccuracy: number;
      toolEfficiency: number;
      overallScore: number;
    };
  };
}

interface PlaygroundMonitorProps {
  scenarioId: string;
  onScenarioRun: (scenarioId: string, config: any) => void;
}

export default function AdvancedPlaygroundMonitor({ scenarioId, onScenarioRun }: PlaygroundMonitorProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [realTimeEvents, setRealTimeEvents] = useState<RealTimeEvent[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [currentMessage, setCurrentMessage] = useState<number>(-1);
  const [agentConfig, setAgentConfig] = useState({
    model: 'gpt-3.5-turbo',
    temperature: 0.1,
    useRAG: true,
    useToolEnforcement: true,
    useEnhancedContext: true
  });
  const eventsEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [realTimeEvents]);

  const runScenario = async () => {
    setIsRunning(true);
    setResults([]);
    setRealTimeEvents([]);
    setAnalytics(null);
    setCurrentMessage(-1);

    try {
      const response = await fetch(`/api/enhanced-playground/${scenarioId}/enhanced-run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          agentConfig,
          monitoringLevel: 'comprehensive',
          enableRealTimeMonitoring: true
        })
      });

      if (!response.ok) {
        throw new Error('Failed to run scenario');
      }

      const data = await response.json();
      
      setResults(data.results);
      setRealTimeEvents(data.realTimeEvents || []);
      setAnalytics(data.analytics);
      
      // Simulate real-time processing for demo
      if (data.realTimeEvents) {
        setRealTimeEvents([]);
        for (let i = 0; i < data.realTimeEvents.length; i++) {
          await new Promise(resolve => setTimeout(resolve, 500));
          setRealTimeEvents(prev => [...prev, data.realTimeEvents[i]]);
          
          // Update current message being processed
          if (data.realTimeEvents[i].messageIndex !== undefined) {
            setCurrentMessage(data.realTimeEvents[i].messageIndex);
          }
        }
      }

    } catch (error) {
      console.error('Error running scenario:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'message_processing_start': return '🎯';
      case 'message_processed': return '✅';
      case 'workflow_executed': return '🔧';
      case 'topic_switch_detected': return '🔄';
      case 'context_compressed': return '🗜️';
      case 'intent_predicted': return '🔮';
      case 'message_processing_error': return '❌';
      default: return '📊';
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'message_processed': return 'bg-green-100 border-green-500';
      case 'workflow_executed': return 'bg-blue-100 border-blue-500';
      case 'topic_switch_detected': return 'bg-yellow-100 border-yellow-500';
      case 'context_compressed': return 'bg-purple-100 border-purple-500';
      case 'intent_predicted': return 'bg-indigo-100 border-indigo-500';
      case 'message_processing_error': return 'bg-red-100 border-red-500';
      default: return 'bg-gray-100 border-gray-500';
    }
  };

  const formatEventDetails = (event: RealTimeEvent) => {
    switch (event.event) {
      case 'message_processed':
        return `Processed in ${event.processingTime}ms, used ${event.toolsUsed} tools${event.workflowExecuted ? ', executed workflow' : ''}${event.topicSwitch ? ', topic switch' : ''}`;
      case 'workflow_executed':
        return `Workflow: ${event.workflow}, ${event.steps?.total || 0} steps`;
      case 'topic_switch_detected':
        return `${event.fromTopic} → ${event.toTopic} (${Math.round((event.confidence || 0) * 100)}% confidence)`;
      case 'context_compressed':
        return `${event.originalMessages} → ${event.compressedMessages} messages (${Math.round((event.compressionRatio || 0) * 100)}% ratio)`;
      case 'intent_predicted':
        return `Next: ${event.predictedIntent} (${Math.round((event.confidence || 0) * 100)}% confidence), ${event.preparatoryActions} actions prepared`;
      default:
        return '';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
      {/* Control Panel */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>🎮 Advanced Playground Control</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Scenario</label>
            <Badge variant="outline" className="w-full p-2 text-center">
              {scenarioId}
            </Badge>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Agent Configuration</label>
            <div className="space-y-2">
              <div>
                <label className="text-xs">Model</label>
                <select 
                  value={agentConfig.model}
                  onChange={(e) => setAgentConfig(prev => ({ ...prev, model: e.target.value }))}
                  className="w-full p-2 border rounded text-sm"
                >
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  <option value="gpt-4">GPT-4</option>
                </select>
              </div>
              <div>
                <label className="text-xs">Temperature</label>
                <input
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={agentConfig.temperature}
                  onChange={(e) => setAgentConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                  className="w-full p-2 border rounded text-sm"
                />
              </div>
              <div className="space-y-1">
                <label>
                  <input
                    type="checkbox"
                    checked={agentConfig.useRAG}
                    onChange={(e) => setAgentConfig(prev => ({ ...prev, useRAG: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-xs">Enable RAG</span>
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={agentConfig.useToolEnforcement}
                    onChange={(e) => setAgentConfig(prev => ({ ...prev, useToolEnforcement: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-xs">Tool Enforcement</span>
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={agentConfig.useEnhancedContext}
                    onChange={(e) => setAgentConfig(prev => ({ ...prev, useEnhancedContext: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-xs">Enhanced Context</span>
                </label>
              </div>
            </div>
          </div>

          <Button 
            onClick={runScenario} 
            disabled={isRunning}
            className="w-full"
          >
            {isRunning ? '🔄 Running...' : '🚀 Run Enhanced Scenario'}
          </Button>

          {analytics && (
            <div className="mt-4 p-3 bg-gray-50 rounded">
              <h4 className="font-medium text-sm mb-2">📊 Summary</h4>
              <div className="text-xs space-y-1">
                <div>Success Rate: {Math.round((analytics.successfulMessages / analytics.totalMessages) * 100)}%</div>
                <div>Avg Response Time: {Math.round(analytics.performanceMetrics.averageResponseTime)}ms</div>
                <div>Workflows Executed: {analytics.workflowExecutions}</div>
                <div>Context Switches: {analytics.contextSwitches}</div>
                <div>Compressions: {analytics.compressionEvents}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Real-Time Event Stream */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>📡 Real-Time Event Stream</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 overflow-y-auto space-y-2">
            {realTimeEvents.length === 0 && !isRunning && (
              <div className="text-center text-gray-500 text-sm mt-20">
                Click "Run Enhanced Scenario" to see real-time events
              </div>
            )}
            
            {realTimeEvents.map((event, index) => (
              <div 
                key={index}
                className={`p-3 rounded-lg border-l-4 ${getEventColor(event.event)}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono text-gray-500">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                  <span className="text-lg">{getEventIcon(event.event)}</span>
                </div>
                <div className="text-sm font-medium">
                  {event.event.replace(/_/g, ' ').toUpperCase()}
                  {event.messageIndex !== undefined && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      Msg {event.messageIndex + 1}
                    </Badge>
                  )}
                </div>
                {event.message && (
                  <div className="text-xs text-gray-600 mt-1 italic">
                    "{event.message.substring(0, 50)}..."
                  </div>
                )}
                {formatEventDetails(event) && (
                  <div className="text-xs text-gray-700 mt-1">
                    {formatEventDetails(event)}
                  </div>
                )}
                {event.error && (
                  <div className="text-xs text-red-600 mt-1">
                    Error: {event.error}
                  </div>
                )}
              </div>
            ))}
            <div ref={eventsEndRef} />
          </div>
        </CardContent>
      </Card>

      {/* Detailed Analysis Results */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>🔍 Message Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 overflow-y-auto space-y-3">
            {results.length === 0 && !isRunning && (
              <div className="text-center text-gray-500 text-sm mt-20">
                Detailed analysis will appear here
              </div>
            )}

            {results.map((result, index) => (
              <div 
                key={index}
                className={`p-3 border rounded-lg ${currentMessage === index ? 'bg-blue-50 border-blue-500' : 'bg-white'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline">Message {index + 1}</Badge>
                  <Badge 
                    variant={result.advancedAnalysis?.qualityMetrics?.overallScore > 80 ? "default" : "secondary"}
                  >
                    {Math.round(result.advancedAnalysis?.qualityMetrics?.overallScore || 0)}% Quality
                  </Badge>
                </div>

                <div className="text-xs text-gray-600 mb-2">
                  "{result.input.content.substring(0, 60)}..."
                </div>

                <div className="space-y-2 text-xs">
                  {/* Tool Analysis */}
                  <div>
                    <span className="font-medium">🛠️ Tools:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {result.toolAnalysis.toolsUsed.map((tool, toolIndex) => (
                        <Badge key={toolIndex} variant="outline" className="text-xs">
                          {tool.replace(/_tool$/, '').replace(/_/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                    {result.toolAnalysis.workflowExecuted && (
                      <Badge variant="default" className="text-xs mt-1">
                        Workflow Executed
                      </Badge>
                    )}
                  </div>

                  {/* Context Analysis */}
                  <div>
                    <span className="font-medium">🎯 Context:</span>
                    <div className="mt-1">
                      <Badge 
                        variant={result.contextAnalysis.topicMatched ? "default" : "secondary"}
                        className="text-xs mr-1"
                      >
                        Topic: {result.contextAnalysis.topicMatched ? '✅' : '❌'}
                      </Badge>
                      {result.contextAnalysis.topicSwitchDetected && (
                        <Badge variant="outline" className="text-xs">
                          Topic Switch
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Advanced Analysis */}
                  {result.advancedAnalysis && (
                    <div>
                      <span className="font-medium">📊 Advanced:</span>
                      <div className="grid grid-cols-2 gap-1 mt-1 text-xs">
                        <div>Response: {result.advancedAnalysis.qualityMetrics.responseQuality}%</div>
                        <div>Context: {result.advancedAnalysis.qualityMetrics.contextAccuracy}%</div>
                        <div>Tools: {result.advancedAnalysis.qualityMetrics.toolEfficiency}%</div>
                        <div>Time: {result.output.processingTime}ms</div>
                      </div>
                    </div>
                  )}

                  {/* Workflow Analysis */}
                  {result.advancedAnalysis?.workflowAnalysis?.workflowDetection?.workflow && (
                    <div>
                      <span className="font-medium">🔧 Workflow:</span>
                      <Badge variant="outline" className="text-xs ml-1">
                        {result.advancedAnalysis.workflowAnalysis.workflowDetection.workflow}
                      </Badge>
                    </div>
                  )}

                  {/* Prediction Analysis */}
                  {result.advancedAnalysis?.predictiveAnalysis?.intentPrediction?.nextIntent && (
                    <div>
                      <span className="font-medium">🔮 Prediction:</span>
                      <Badge variant="outline" className="text-xs ml-1">
                        {result.advancedAnalysis.predictiveAnalysis.intentPrediction.nextIntent.primary}
                      </Badge>
                    </div>
                  )}

                  {/* Customer Analysis */}
                  {result.advancedAnalysis?.customerAnalysis?.customerProfile?.communicationStyle && (
                    <div>
                      <span className="font-medium">👤 Customer:</span>
                      <Badge variant="outline" className="text-xs ml-1">
                        {result.advancedAnalysis.customerAnalysis.customerProfile.communicationStyle}
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}