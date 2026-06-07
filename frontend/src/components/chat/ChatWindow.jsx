import React, { useRef, useEffect } from 'react';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import SuggestedQuestions from './SuggestedQuestions';
import { GraduationCap } from 'lucide-react';

const ChatWindow = ({ messages, isLoading, onSendSuggestion }) => {
  const bottomRef = useRef(null);

  // Auto scroll to bottom of chat
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto px-4 py-8 flex flex-col justify-between">
        {/* Visual empty state hero */}
        <div className="flex-1 flex flex-col items-center justify-center text-center my-auto py-12">
          <div className="h-16 w-16 bg-brand-500 rounded-3xl text-white shadow-xl shadow-brand-500/20 flex items-center justify-center text-3xl mb-6 transform hover:rotate-12 transition-transform duration-300">
            🎓
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white mb-2 font-sans">
            How can College Student Desk help you today?
          </h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-md text-sm leading-relaxed">
            I am your college assistant. Ask me questions about admissions, fees, hostel regulations, scholarships, placement data, or attendance rules.
          </p>
        </div>

        {/* Suggestion Quick Clicks */}
        <SuggestedQuestions onSelect={onSendSuggestion} />
        <div ref={bottomRef} />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-6 py-6 space-y-2 radial-bg">
      {messages.map((msg, idx) => (
        <MessageBubble key={idx} message={msg} />
      ))}
      {isLoading && <TypingIndicator />}
      <div ref={bottomRef} />
    </div>
  );
};

export default ChatWindow;
