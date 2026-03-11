import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Send, MessageSquare, FileText, Download, Copy, Sparkles, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

function ChatInterface({ userId, apiUrl }) {
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    if (currentSessionId) {
      fetchChatHistory();
    }
  }, [currentSessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchSessions = async () => {
    try {
      setLoadingSessions(true);
      const response = await axios.get(`${apiUrl}/api/chat/sessions?user_id=${userId}`);
      setSessions(response.data.sessions);
      
      if (response.data.sessions.length > 0) {
        setCurrentSessionId(response.data.sessions[0].id);
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoadingSessions(false);
    }
  };

  const fetchChatHistory = async () => {
    try {
      const response = await axios.get(
        `${apiUrl}/api/chat/history/${currentSessionId}?user_id=${userId}`
      );
      setMessages(response.data.history);
    } catch (error) {
      console.error('Error fetching chat history:', error);
    }
  };

  const startNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || loading) return;

    const userMessage = inputMessage;
    setInputMessage('');
    setLoading(true);

    // Add user message immediately
    const tempMessages = [...messages, {
      message: userMessage,
      response: '',
      sources: [],
      created_at: new Date().toISOString(),
      isLoading: true
    }];
    setMessages(tempMessages);

    try {
      const formData = new FormData();
      formData.append('user_id', userId);
      formData.append('message', userMessage);
      if (currentSessionId) {
        formData.append('session_id', currentSessionId);
      }

      const response = await axios.post(`${apiUrl}/api/chat`, formData);
      
      // Update with actual response
      setMessages([...messages, {
        message: userMessage,
        response: response.data.response,
        sources: response.data.sources,
        created_at: new Date().toISOString()
      }]);

      // Update session ID if it's a new chat
      if (!currentSessionId) {
        setCurrentSessionId(response.data.session_id);
        fetchSessions();
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages([...messages, {
        message: userMessage,
        response: 'Sorry, I encountered an error processing your request. Please try again.',
        sources: [],
        created_at: new Date().toISOString(),
        isError: true
      }]);
    } finally {
      setLoading(false);
    }
  };

  const exportChat = async () => {
    if (!currentSessionId) return;

    try {
      const response = await axios.get(
        `${apiUrl}/api/chat/export/${currentSessionId}?user_id=${userId}`
      );
      
      const blob = new Blob([response.data.content], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.data.filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting chat:', error);
      alert('Failed to export chat');
    }
  };

  const copyMessage = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-12rem)]">
      {/* Sessions Sidebar */}
      <div className="lg:col-span-1 card overflow-y-auto max-h-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Chat History</h3>
          <button
            onClick={startNewChat}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            data-testid="new-chat-button"
          >
            + New
          </button>
        </div>

        {loadingSessions ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p>No chat history yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map(session => (
              <button
                key={session.id}
                onClick={() => setCurrentSessionId(session.id)}
                className={`w-full text-left p-3 rounded-lg transition-all ${
                  currentSessionId === session.id
                    ? 'bg-primary-50 border-2 border-primary-300'
                    : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                }`}
                data-testid={`session-${session.id}`}
              >
                <p className="text-sm font-medium text-gray-900 truncate">
                  {session.title}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(session.last_activity).toLocaleDateString()}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chat Area */}
      <div className="lg:col-span-3 card flex flex-col max-h-full">
        <div className="flex items-center justify-between mb-4 pb-4 border-b">
          <div className="flex items-center space-x-2">
            <div className="bg-gradient-to-br from-primary-500 to-purple-600 p-2 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">AI Assistant</h3>
              <p className="text-xs text-gray-500">Powered by GPT-4o & RAG</p>
            </div>
          </div>
          {currentSessionId && (
            <button
              onClick={exportChat}
              className="text-sm text-gray-600 hover:text-primary-600 flex items-center space-x-1"
              data-testid="export-chat-button"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4" data-testid="messages-container">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-gradient-to-br from-primary-100 to-purple-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-10 h-10 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Ask me anything!
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                I can help you find information from your documents, synthesize insights, and answer questions based on your knowledge base.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                {[
                  'What were the key takeaways from my system design notes?',
                  'Summarize the main concepts from my recent documents',
                  'Find information about database optimization',
                  'What did I learn about microservices architecture?'
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => setInputMessage(suggestion)}
                    className="p-3 text-left text-sm bg-white border border-gray-200 rounded-lg hover:border-primary-300 hover:shadow-sm transition-all"
                    data-testid={`suggestion-${i}`}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div key={index} className="space-y-4">
                {/* User Message */}
                <div className="flex justify-end">
                  <div className="max-w-[80%] bg-primary-600 text-white rounded-lg p-4">
                    <p className="whitespace-pre-wrap">{msg.message}</p>
                  </div>
                </div>

                {/* AI Response */}
                {msg.isLoading ? (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] bg-gray-100 rounded-lg p-4">
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-600"></div>
                        <span className="text-gray-600">Thinking...</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] space-y-3">
                      <div className={`rounded-lg p-4 ${
                        msg.isError ? 'bg-red-50 border border-red-200' : 'bg-gray-100'
                      }`}>
                        <div className="markdown prose prose-sm max-w-none">
                          <ReactMarkdown>{msg.response}</ReactMarkdown>
                        </div>
                        
                        <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-gray-200">
                          <button
                            onClick={() => copyMessage(msg.response)}
                            className="text-xs text-gray-500 hover:text-primary-600 flex items-center space-x-1"
                            data-testid={`copy-message-${index}`}
                          >
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </button>
                        </div>
                      </div>

                      {/* Sources */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="flex items-center space-x-2 mb-2">
                            <FileText className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-900">
                              Sources ({msg.sources.length})
                            </span>
                          </div>
                          <div className="space-y-2">
                            {msg.sources.map((source, i) => (
                              <div
                                key={i}
                                className="text-sm text-blue-800 flex items-center space-x-2"
                                data-testid={`source-${i}`}
                              >
                                <span className="text-blue-600">[{i + 1}]</span>
                                <span>{source.filename}</span>
                                <span className="text-xs text-blue-600">
                                  (Relevance: {(source.relevance * 100).toFixed(0)}%)
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t pt-4">
          {messages.length === 0 && (
            <div className="mb-3 flex items-start space-x-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>
                Make sure you've uploaded some documents first! The AI can only answer questions based on your uploaded knowledge base.
              </p>
            </div>
          )}
          <div className="flex space-x-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Ask anything about your documents..."
              className="input flex-1"
              disabled={loading}
              data-testid="chat-input"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !inputMessage.trim()}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="send-button"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatInterface;
