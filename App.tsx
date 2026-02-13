import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Trash2, Github, Moon, Sun } from 'lucide-react';
import { Chat } from '@google/genai';
import { Message } from './types';
import { createChatSession, sendMessageStream } from './services/geminiService';
import { MessageBubble } from './components/MessageBubble';
import { ChatInput } from './components/ChatInput';
import { TypingIndicator } from './components/TypingIndicator';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
  }, []);

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
      return newMode;
    });
  };

  // Initialize chat session on mount
  useEffect(() => {
    startNewChat();
  }, []);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  const startNewChat = useCallback(() => {
    try {
      const session = createChatSession();
      setChatSession(session);
      setMessages([{
        id: 'welcome',
        role: 'model',
        text: "Hello! I'm Gemini. How can I help you today?",
        timestamp: new Date()
      }]);
    } catch (e) {
      console.error("Failed to start chat session", e);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: "Error: Failed to initialize chat. Please check your API key.",
        timestamp: new Date(),
        isError: true
      }]);
    }
  }, []);

  const handleSendMessage = async (text: string) => {
    if (!chatSession || isStreaming) return;

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

      let fullText = '';
      const stream = sendMessageStream(chatSession, text);

      for await (const chunk of stream) {
        fullText += chunk;
        setMessages(prev => 
          prev.map(msg => 
            msg.id === modelMsgId 
              ? { ...msg, text: fullText } 
              : msg
          )
        );
      }
    } catch (error) {
      console.error("Chat error:", error);
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
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 font-sans transition-colors duration-200">
      {/* Header */}
      <header className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm z-10 transition-colors duration-200">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400">
            <Sparkles className="w-6 h-6 fill-primary-100 dark:fill-primary-900/50" />
            <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Gemini<span className="text-primary-600 dark:text-primary-400">Flux</span></h1>
          </div>
          
          <div className="flex items-center gap-3">
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
  );
};

export default App;