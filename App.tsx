import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Trash2, Github, Moon, Sun, Bug, X, Terminal } from 'lucide-react';
import { Chat } from '@google/genai';
import { Message, DebugLog } from './types';
import { createChatSession, sendMessageStream } from './services/geminiService';
import { MessageBubble } from './components/MessageBubble';
import { ChatInput } from './components/ChatInput';
import { TypingIndicator } from './components/TypingIndicator';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Helper to add logs
  const addDebugLog = useCallback((type: DebugLog['type'], message: string) => {
    const newLog: DebugLog = {
      id: Date.now().toString() + Math.random().toString(),
      timestamp: new Date(),
      type,
      message
    };
    setDebugLogs(prev => [...prev, newLog]);
    // Also log to console for good measure
    if (type === 'error') console.error(`[App] ${message}`);
    else console.log(`[App] ${message}`);
  }, []);

  // Initialize theme
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
    
    addDebugLog('info', 'Application initialized');
    addDebugLog('debug', `Theme set to ${savedTheme || (prefersDark ? 'dark' : 'light')}`);
  }, [addDebugLog]);

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const newMode = !prev;
      if (newMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
      addDebugLog('info', `Theme toggled to ${newMode ? 'Dark' : 'Light'} Mode`);
      return newMode;
    });
  };

  const toggleDebugMode = () => {
    setIsDebugMode(prev => !prev);
  };

  // Initialize chat session on mount
  useEffect(() => {
    startNewChat();
  }, []);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Auto-scroll logs
  useEffect(() => {
    if (isDebugMode) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [debugLogs, isDebugMode]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  const startNewChat = useCallback(() => {
    try {
      addDebugLog('info', 'Initializing new chat session...');
      const session = createChatSession();
      setChatSession(session);
      setMessages([{
        id: 'welcome',
        role: 'model',
        text: "Hello! I'm Gemini. How can I help you today?",
        timestamp: new Date()
      }]);
      addDebugLog('success', 'Chat session created successfully');
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : String(e);
      addDebugLog('error', `Failed to start chat session: ${errMsg}`);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: "Error: Failed to initialize chat. Please check your API key.",
        timestamp: new Date(),
        isError: true
      }]);
    }
  }, [addDebugLog]);

  const handleSendMessage = async (text: string) => {
    if (!chatSession || isStreaming) {
        if (isStreaming) addDebugLog('debug', 'Blocked message send: Stream already in progress');
        return;
    }

    addDebugLog('info', `User sent message (${text.length} chars)`);
    
    const userMsgId = Date.now().toString();
    const userMessage: Message = {
      id: userMsgId,
      role: 'user',
      text: text,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsStreaming(true);

    try {
      // Create a placeholder for the model response
      const modelMsgId = (Date.now() + 1).toString();
      setMessages(prev => [...prev, {
        id: modelMsgId,
        role: 'model',
        text: '',
        timestamp: new Date()
      }]);

      addDebugLog('info', 'Calling sendMessageStream...');
      let fullText = '';
      let chunkCount = 0;
      const startTime = performance.now();
      
      const stream = sendMessageStream(chatSession, text);

      for await (const chunk of stream) {
        chunkCount++;
        fullText += chunk;
        setMessages(prev => 
          prev.map(msg => 
            msg.id === modelMsgId 
              ? { ...msg, text: fullText } 
              : msg
          )
        );
        if (chunkCount % 5 === 0) {
            addDebugLog('debug', `Received ${chunkCount} chunks so far...`);
        }
      }
      
      const endTime = performance.now();
      addDebugLog('success', `Stream complete. Total chunks: ${chunkCount}. Duration: ${((endTime - startTime) / 1000).toFixed(2)}s`);

    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      addDebugLog('error', `Chat error: ${errMsg}`);
      
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: "I encountered an error while processing your request. Please try again.",
        timestamp: new Date(),
        isError: true
      }]);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 font-sans transition-colors duration-200 overflow-hidden">
      
      {/* Main Content Area */}
      <div className={`flex flex-col flex-1 h-full transition-all duration-300 ${isDebugMode ? 'mr-80' : 'mr-0'}`}>
        {/* Header */}
        <header className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm z-10 transition-colors duration-200">
          <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400">
              <Sparkles className="w-6 h-6 fill-primary-100 dark:fill-primary-900/50" />
              <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Gemini<span className="text-primary-600 dark:text-primary-400">Flux</span></h1>
            </div>
            
            <div className="flex items-center gap-3">
               <button 
                onClick={toggleDebugMode}
                className={`p-2 rounded-lg transition-colors ${
                    isDebugMode 
                    ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/20 dark:text-primary-400' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title="Toggle Debug Console"
              >
                <Bug size={20} />
              </button>
              <button 
                onClick={toggleTheme}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              >
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <button 
                onClick={startNewChat}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                title="Clear conversation"
              >
                <Trash2 size={20} />
              </button>
              <a 
                href="https://github.com/google-gemini" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Github size={20} />
              </a>
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <main className="flex-1 overflow-y-auto relative scroll-smooth">
          <div className="max-w-4xl mx-auto px-4 py-8">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {isStreaming && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
               <TypingIndicator />
            )}
            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* Input Area */}
        <div className="flex-shrink-0 z-20">
          <ChatInput onSend={handleSendMessage} disabled={isStreaming} />
        </div>
      </div>

      {/* Debug Panel (Fixed Right) */}
      <div 
        className={`fixed inset-y-0 right-0 w-80 bg-gray-900 text-gray-300 border-l border-gray-700 shadow-2xl transform transition-transform duration-300 ease-in-out z-40 flex flex-col ${
          isDebugMode ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800">
          <div className="flex items-center gap-2 text-green-400">
            <Terminal size={18} />
            <h2 className="font-mono text-sm font-bold">Debug Console</h2>
          </div>
          <button 
            onClick={() => setDebugLogs([])}
            className="text-xs text-gray-400 hover:text-white underline mr-2"
          >
            Clear
          </button>
          <button 
            onClick={toggleDebugMode}
            className="text-gray-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-2">
          {debugLogs.length === 0 && (
             <div className="text-gray-600 italic text-center mt-10">No logs yet...</div>
          )}
          {debugLogs.map((log) => (
            <div key={log.id} className="break-all border-l-2 pl-2" style={{
                borderColor: log.type === 'error' ? '#ef4444' : log.type === 'success' ? '#22c55e' : log.type === 'debug' ? '#64748b' : '#3b82f6'
            }}>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-gray-500 text-[10px]">
                  {log.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}.{log.timestamp.getMilliseconds().toString().padStart(3, '0')}
                </span>
                <span className={`uppercase text-[10px] font-bold ${
                  log.type === 'error' ? 'text-red-500' : 
                  log.type === 'success' ? 'text-green-500' : 
                  log.type === 'debug' ? 'text-gray-500' : 'text-blue-400'
                }`}>
                  {log.type}
                </span>
              </div>
              <div className={log.type === 'error' ? 'text-red-300' : 'text-gray-300'}>
                {log.message}
              </div>
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>
        
        <div className="p-2 bg-gray-800 border-t border-gray-700 text-[10px] text-gray-500 text-center">
            @google/genai SDK • Gemini 3 Flash
        </div>
      </div>
    </div>
  );
};

export default App;