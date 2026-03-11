import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Upload, MessageSquare, FileText, 
  Brain, Sparkles, 
  BarChart3, Menu
} from 'lucide-react';
import DocumentUpload from './components/DocumentUpload';
import DocumentLibrary from './components/DocumentLibrary';
import ChatInterface from './components/ChatInterface';
import './App.css';

// For development: use localhost:8001
// For production: REACT_APP_BACKEND_URL should be set to empty string to use same origin with /api prefix
const API_URL = process.env.REACT_APP_BACKEND_URL || window.location.origin;

function App() {
  const [activeTab, setActiveTab] = useState('chat');
  // Use a fixed user ID for demo/development
  const [userId] = useState('demo_user');
  const [stats, setStats] = useState({
    total_documents: 0,
    total_chat_sessions: 0,
    total_messages: 0
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/stats?user_id=${userId}`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleDocumentUploaded = () => {
    fetchStats();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-primary-500 to-purple-600 p-2 rounded-xl">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Mimir
                </h1>
                <p className="text-xs text-gray-500">Your Personal Intelligence Hub</p>
              </div>
            </div>

            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
              data-testid="mobile-menu-button"
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="hidden lg:flex items-center space-x-4">
              <div className="flex items-center space-x-6 text-sm">
                <div className="flex items-center space-x-2" data-testid="docs-stat">
                  <FileText className="w-4 h-4 text-primary-600" />
                  <span className="font-semibold">{stats.total_documents}</span>
                  <span className="text-gray-500">Docs</span>
                </div>
                <div className="flex items-center space-x-2" data-testid="chats-stat">
                  <MessageSquare className="w-4 h-4 text-purple-600" />
                  <span className="font-semibold">{stats.total_chat_sessions}</span>
                  <span className="text-gray-500">Chats</span>
                </div>
                <div className="flex items-center space-x-2" data-testid="messages-stat">
                  <Sparkles className="w-4 h-4 text-pink-600" />
                  <span className="font-semibold">{stats.total_messages}</span>
                  <span className="text-gray-500">Queries</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Navigation Sidebar */}
          <div className={`${sidebarOpen ? 'block' : 'hidden'} lg:block w-full lg:w-64 space-y-2`}>
            <nav className="card space-y-1" data-testid="navigation-sidebar">
              <button
                onClick={() => {
                  setActiveTab('chat');
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                  activeTab === 'chat'
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                data-testid="nav-chat"
              >
                <MessageSquare className="w-5 h-5" />
                <span>Chat</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('upload');
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                  activeTab === 'upload'
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                data-testid="nav-upload"
              >
                <Upload className="w-5 h-5" />
                <span>Upload Documents</span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('library');
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                  activeTab === 'library'
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                data-testid="nav-library"
              >
                <FileText className="w-5 h-5" />
                <span>Document Library</span>
              </button>
            </nav>

            {/* Quick Stats Card */}
            <div className="card bg-gradient-to-br from-primary-500 to-purple-600 text-white">
              <div className="flex items-center space-x-2 mb-4">
                <BarChart3 className="w-5 h-5" />
                <h3 className="font-semibold">Your Knowledge</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="opacity-90">Documents</span>
                  <span className="font-bold text-lg">{stats.total_documents}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="opacity-90">Chat Sessions</span>
                  <span className="font-bold text-lg">{stats.total_chat_sessions}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="opacity-90">Total Queries</span>
                  <span className="font-bold text-lg">{stats.total_messages}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            {activeTab === 'chat' && (
              <ChatInterface userId={userId} apiUrl={API_URL} />
            )}
            
            {activeTab === 'upload' && (
              <DocumentUpload 
                userId={userId} 
                apiUrl={API_URL}
                onUploadSuccess={handleDocumentUploaded}
              />
            )}
            
            {activeTab === 'library' && (
              <DocumentLibrary 
                userId={userId} 
                apiUrl={API_URL}
                onDocumentDeleted={handleDocumentUploaded}
              />
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-16 py-8 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="flex items-center space-x-2 text-gray-600">
              <Brain className="w-5 h-5 text-primary-600" />
              <span className="text-sm">
                Powered by GPT-4o & Advanced RAG Technology
              </span>
            </div>
            <div className="text-sm text-gray-500">
              Your personal knowledge, intelligently organized
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
