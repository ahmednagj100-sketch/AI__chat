import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Trash2, Github } from 'lucide-react';
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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    <div className="flex flex-col h-screen bg-gray-50 font-sans">
      {/* Header */}
      <header className="flex-shrink-0 bg-white border-b border-gray-200 shadow-sm z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary-600">
            <Sparkles className="w-6 h-6 fill-primary-100" />
            <h1 className="text-xl font-bold tracking-tight text-gray-900">Gemini<span className="text-primary-600">Flux</span></h1>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={startNewChat}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Clear conversation"
            >
              <Trash2 size={20} />
            </button>
            <a 
              href="https://github.com/google-gemini" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
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