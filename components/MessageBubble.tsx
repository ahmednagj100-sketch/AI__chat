import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, User, AlertCircle } from 'lucide-react';
import { Message } from '../types';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const isError = message.isError;

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[85%] md:max-w-[75%] gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser 
            ? 'bg-primary-600 text-white' 
            : isError 
              ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' 
              : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
        }`}>
          {isUser ? <User size={18} /> : isError ? <AlertCircle size={18} /> : <Bot size={18} />}
        </div>

        {/* Bubble */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div
            className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm transition-colors duration-200 ${
              isUser
                ? 'bg-primary-600 text-white rounded-tr-sm'
                : isError
                ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 rounded-tl-sm'
                : 'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-gray-100 rounded-tl-sm'
            }`}
          >
            {isUser ? (
              <div className="whitespace-pre-wrap">{message.text}</div>
            ) : (
              <div className="markdown-body prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-pre:bg-gray-800 dark:prose-pre:bg-gray-900 prose-pre:text-gray-100">
                <ReactMarkdown>{message.text}</ReactMarkdown>
              </div>
            )}
          </div>
          <span className="text-xs text-gray-400 dark:text-gray-500 mt-1 px-1">
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
};