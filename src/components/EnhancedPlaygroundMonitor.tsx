import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

interface TopicInfo {
  primaryTopic: string;
  confidence: number;
  isTopicSwitch: boolean;
  previousTopic?: string;
}

interface AmbiguityInfo {
  isAmbiguous: boolean;
  ambiguityType?: string;
  resolutionStrategy?: string;
}

interface FlowInfo {
  currentFlowState: string;
  interruption?: {
    type: string;
    urgency: string;
  };
  needsFlowRecovery: boolean;
}

interface ToolAnalysis {
  toolsUsed: string[];
  expectedTools: string[];
  toolsMatchExpected: boolean;
  toolCount: number;
  uniqueTools: number;
}

interface ContextAnalysis {
  topicInfo: TopicInfo;
  topicMatched: boolean;
  topicSwitchDetected: boolean;
  topicSwitchExpected: boolean;
  topicSwitchCorrect: boolean;
  confidence: number;
}

interface QualityMetrics {
  responseLength: number;
  responseQuality: number;
  toolEfficiency: number;
  contextAccuracy: number;
  overallScore: number;
}

interface EnhancedResult {
  messageIndex: number;
  input: {
    content: string;
    expectedTools: string[];
    expectedTopic?: string;
    expectedTopicSwitch?: boolean;
    expectedAmbiguity?: boolean;
  };
  output: {
    response: string;
    processingTime: number;
  };
  toolAnalysis: ToolAnalysis;
  contextAnalysis: ContextAnalysis;
  ambiguityAnalysis: AmbiguityInfo;
  flowAnalysis: FlowInfo;
  qualityMetrics: QualityMetrics;
  timestamp: string;
  error?: string;
}

interface ComprehensiveMetrics {
  totalMessages: number;
  successfulMessages: number;
  successRate: number;
  averageScore: number;
  averageProcessingTime: number;
  contextSwitches: number;
  ambiguousQueries: number;
  flowInterruptions: number;
  toolUsageStats: Record<string, number>;
  topicDistribution: Record<string, number>;
  contextAccuracy: number;
  sessionComplexity: string;
  escalationNeeded: boolean;
}

interface PlaygroundData {
  results: EnhancedResult[];
  metrics: ComprehensiveMetrics;
  sessionSummary: any;
}

const EnhancedPlaygroundMonitor: React.FC = () => {
  const [playgroundData, setPlaygroundData] = useState<PlaygroundData | null>(null);
  const [selectedResult, setSelectedResult] = useState<EnhancedResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [monitoringLevel, setMonitoringLevel] = useState<'basic' | 'detailed' | 'comprehensive'>('comprehensive');

  const fetchPlaygroundData = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/enhanced-playground/monitor');
      const data = await response.json();
      if (data.success) {
        setPlaygroundData(data.data);
      }
    } catch (error) {
      console.error('Error fetching playground data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaygroundData();
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600 bg-green-50';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getTopicSwitchBadge = (result: EnhancedResult) => {
    const { topicSwitchDetected, topicSwitchExpected, topicSwitchCorrect } = result.contextAnalysis;
    
    if (topicSwitchDetected) {
      return (
        <Badge variant={topicSwitchCorrect ? "default" : "destructive"}>
          Topic Switch {topicSwitchCorrect ? '✓' : '✗'}
        </Badge>
      );
    }
    return null;
  };

  const getAmbiguityBadge = (result: EnhancedResult) => {
    const { ambiguityDetected, ambiguityExpected, ambiguityCorrect } = result.ambiguityAnalysis;
    
    if (ambiguityDetected) {
      return (
        <Badge variant={ambiguityCorrect ? "secondary" : "destructive"}>
          Ambiguous {ambiguityCorrect ? '✓' : '✗'}
        </Badge>
      );
    }
    return null;
  };

  const getFlowBadge = (result: EnhancedResult) => {
    const { interruptionDetected, interruptionExpected, interruptionCorrect } = result.flowAnalysis;
    
    if (interruptionDetected) {
      return (
        <Badge variant={interruptionCorrect ? "outline" : "destructive"}>
          Flow Interrupt {interruptionCorrect ? '✓' : '✗'}
        </Badge>
      );
    }
    return null;
  };

  if (!playgroundData) {
    return (
      <div className="p-6">
        <div className="text-center">
          {loading ? 'Loading playground data...' : 'No playground data available'}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Enhanced Playground Monitor</h1>
        <div className="flex gap-2">
          <select
            value={monitoringLevel}
            onChange={(e) => setMonitoringLevel(e.target.value as any)}
            className="px-3 py-1 border rounded-md"
          >
            <option value="basic">Basic</option>
            <option value="detailed">Detailed</option>
            <option value="comprehensive">Comprehensive</option>
          </select>
          <Button onClick={fetchPlaygroundData} disabled={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {playgroundData.metrics.successRate}%
            </div>
            <p className="text-xs text-muted-foreground">
              {playgroundData.metrics.successfulMessages}/{playgroundData.metrics.totalMessages} messages
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(playgroundData.metrics.averageScore)}`}>
              {playgroundData.metrics.averageScore}
            </div>
            <p className="text-xs text-muted-foreground">
              Quality Score
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Context Switches</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {playgroundData.metrics.contextSwitches}
            </div>
            <p className="text-xs text-muted-foreground">
              Topic Changes Detected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {playgroundData.metrics.averageProcessingTime}ms
            </div>
            <p className="text-xs text-muted-foreground">
              Average Processing
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Conversation Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span>Ambiguous Queries:</span>
              <Badge variant="secondary">{playgroundData.metrics.ambiguousQueries}</Badge>
            </div>
            <div className="flex justify-between">
              <span>Flow Interruptions:</span>
              <Badge variant="outline">{playgroundData.metrics.flowInterruptions}</Badge>
            </div>
            <div className="flex justify-between">
              <span>Context Accuracy:</span>
              <Badge variant="default">{playgroundData.metrics.contextAccuracy}%</Badge>
            </div>
            <div className="flex justify-between">
              <span>Session Complexity:</span>
              <Badge variant={playgroundData.metrics.sessionComplexity === 'high' ? 'destructive' : 'default'}>
                {playgroundData.metrics.sessionComplexity}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tool Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {Object.entries(playgroundData.metrics.toolUsageStats)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 8)
                .map(([tool, count]) => (
                <div key={tool} className="flex justify-between text-sm">
                  <span className="truncate">{tool.replace(/_/g, ' ')}</span>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Topic Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(playgroundData.metrics.topicDistribution)
                .sort(([,a], [,b]) => b - a)
                .map(([topic, count]) => (
                <div key={topic} className="flex justify-between text-sm">
                  <span className="capitalize">{topic.replace(/_/g, ' ')}</span>
                  <Badge variant="secondary">{count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Message Results */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Message Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {playgroundData.results.map((result, index) => (
              <div
                key={index}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedResult?.messageIndex === result.messageIndex
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedResult(result)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="font-medium text-sm mb-1">
                      Message #{result.messageIndex + 1}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      "{result.input.content.substring(0, 80)}..."
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge className={getScoreColor(result.qualityMetrics.overallScore)}>
                      Score: {result.qualityMetrics.overallScore}
                    </Badge>
                    <div className="text-xs text-gray-500">
                      {result.output.processingTime}ms
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-2">
                  {getTopicSwitchBadge(result)}
                  {getAmbiguityBadge(result)}
                  {getFlowBadge(result)}
                  
                  <Badge variant={result.toolAnalysis.toolsMatchExpected ? "default" : "secondary"}>
                    Tools: {result.toolAnalysis.toolCount} {result.toolAnalysis.toolsMatchExpected ? '✓' : '⚠'}
                  </Badge>
                  
                  {result.contextAnalysis.topicInfo.primaryTopic && (
                    <Badge variant="outline">
                      {result.contextAnalysis.topicInfo.primaryTopic.replace(/_/g, ' ')}
                    </Badge>
                  )}
                </div>

                {result.toolAnalysis.toolsUsed.length > 0 && (
                  <div className="text-xs text-gray-500">
                    Tools used: {result.toolAnalysis.toolsUsed.map(tool => 
                      tool.replace(/_tool$/, '').replace(/_/g, ' ')
                    ).join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Result View */}
      {selectedResult && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Detailed Analysis - Message #{selectedResult.messageIndex + 1}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">Input & Output</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Query:</span>
                    <div className="bg-gray-50 p-2 rounded mt-1">
                      {selectedResult.input.content}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Response:</span>
                    <div className="bg-blue-50 p-2 rounded mt-1 max-h-32 overflow-y-auto">
                      {selectedResult.output.response}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Context Analysis</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Topic:</span>
                    <Badge variant="outline">
                      {selectedResult.contextAnalysis.topicInfo.primaryTopic}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Confidence:</span>
                    <span>{Math.round(selectedResult.contextAnalysis.confidence * 100)}%</span>
                  </div>
                  {selectedResult.contextAnalysis.topicInfo.isTopicSwitch && (
                    <div className="flex justify-between">
                      <span>Previous Topic:</span>
                      <Badge variant="secondary">
                        {selectedResult.contextAnalysis.topicInfo.previousTopic}
                      </Badge>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Context Accuracy:</span>
                    <span className={getScoreColor(selectedResult.qualityMetrics.contextAccuracy)}>
                      {selectedResult.qualityMetrics.contextAccuracy}%
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Tool Analysis</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Tools Used:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedResult.toolAnalysis.toolsUsed.map((tool, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {tool.replace(/_tool$/, '').replace(/_/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Expected Tools:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedResult.input.expectedTools.map((tool, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {tool.replace(/_tool$/, '').replace(/_/g, ' ')}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span>Tool Efficiency:</span>
                    <span className={getScoreColor(selectedResult.qualityMetrics.toolEfficiency)}>
                      {selectedResult.qualityMetrics.toolEfficiency}%
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Quality Metrics</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Response Quality:</span>
                    <span className={getScoreColor(selectedResult.qualityMetrics.responseQuality)}>
                      {selectedResult.qualityMetrics.responseQuality}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Response Length:</span>
                    <span>{selectedResult.qualityMetrics.responseLength} chars</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Processing Time:</span>
                    <span>{selectedResult.output.processingTime}ms</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Overall Score:</span>
                    <span className={getScoreColor(selectedResult.qualityMetrics.overallScore)}>
                      {selectedResult.qualityMetrics.overallScore}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EnhancedPlaygroundMonitor;