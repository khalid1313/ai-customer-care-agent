'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  content: string;
  timestamp: Date;
  isUser: boolean;
}

export default function DebugPlayground() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() => `debug_${Date.now()}`);
  const [backendLogs, setBackendLogs] = useState<string[]>([]);
  const [showBackendLogs, setShowBackendLogs] = useState(false);
  const [backendUrl, setBackendUrl] = useState('http://localhost:3004');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchBackendLogs = async () => {
    try {
      console.log('Fetching logs for session:', sessionId, 'from:', `${backendUrl}/api/logs/${sessionId}`);
      const response = await fetch(`${backendUrl}/api/logs/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Logs received:', data.logs?.length || 0, 'entries');
        setBackendLogs(data.logs || []);
      } else {
        console.log('Logs response not ok:', response.status);
        setBackendLogs([`Error: HTTP ${response.status} - Could not fetch logs`]);
      }
    } catch (error) {
      console.error('Failed to fetch backend logs:', error);
      setBackendLogs([`Error: ${error.message}`]);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      content: inputMessage,
      timestamp: new Date(),
      isUser: true,
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      console.log('Sending message to:', `${backendUrl}/api/ai-chat`);
      const response = await fetch(`${backendUrl}/api/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          sessionId: sessionId,
          testScenario: 'debug',
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Response received:', data);

      const aiMessage: Message = {
        id: `ai_${Date.now()}`,
        content: data.response || 'Sorry, I encountered an error.',
        timestamp: new Date(),
        isUser: false,
      };

      setMessages(prev => [...prev, aiMessage]);
      
      // Auto-fetch logs after each message
      setTimeout(fetchBackendLogs, 500);
      
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        content: `Error: ${error.message}`,
        timestamp: new Date(),
        isUser: false,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearConversation = () => {
    setMessages([]);
    setBackendLogs([]);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md mb-4 p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-blue-600">Debug Playground</h1>
              <p className="text-gray-600">Direct connection to AI agent backend</p>
              <p className="text-sm text-gray-500">Session: {sessionId}</p>
              <p className="text-sm text-gray-500">Backend: {backendUrl}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  fetchBackendLogs();
                  setShowBackendLogs(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Show Logs ({backendLogs.length})
              </button>
              <button
                onClick={clearConversation}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="h-96 overflow-y-auto border border-gray-200 rounded p-4 mb-4">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                <p>Send a message to test the AI agent</p>
              </div>
            )}
            
            {messages.map((message) => (
              <div
                key={message.id}
                className={`mb-4 ${message.isUser ? 'text-right' : 'text-left'}`}
              >
                <div
                  className={`inline-block max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.isUser
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  <p className={`text-xs mt-1 ${message.isUser ? 'text-blue-100' : 'text-gray-500'}`}>
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="text-left mb-4">
                <div className="inline-block bg-gray-200 text-gray-800 px-4 py-2 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                    <span>AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="flex space-x-3">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !inputMessage.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </div>

        {/* Backend URL Tester */}
        <div className="bg-white rounded-lg shadow-md mt-4 p-6">
          <h3 className="text-lg font-semibold mb-3">Backend Connection Test</h3>
          <div className="flex gap-3">
            <input
              type="text"
              value={backendUrl}
              onChange={(e) => setBackendUrl(e.target.value)}
              placeholder="Backend URL"
              className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={async () => {
                try {
                  const response = await fetch(`${backendUrl}/api/logs/test`);
                  alert(`Backend connection: ${response.ok ? 'SUCCESS' : 'FAILED'} (${response.status})`);
                } catch (error) {
                  alert(`Backend connection: FAILED - ${error.message}`);
                }
              }}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Test Connection
            </button>
          </div>
        </div>

        {/* Backend Logs Modal */}
        {showBackendLogs && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] flex flex-col">
              <div className="flex justify-between items-center p-4 border-b">
                <h2 className="text-xl font-semibold">Backend Logs - {sessionId}</h2>
                <button
                  onClick={() => setShowBackendLogs(false)}
                  className="text-gray-500 hover:text-gray-700 text-xl"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="bg-black text-green-400 p-4 rounded font-mono text-sm">
                  {backendLogs.length === 0 ? (
                    <div className="text-center text-gray-500">No logs available</div>
                  ) : (
                    backendLogs.map((log, index) => (
                      <div key={index} className="mb-1 whitespace-pre-wrap">
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-3 p-4 border-t">
                <button
                  onClick={fetchBackendLogs}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Refresh
                </button>
                <button
                  onClick={() => setShowBackendLogs(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}