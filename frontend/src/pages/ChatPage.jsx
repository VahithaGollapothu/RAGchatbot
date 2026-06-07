import React from 'react';
import { useChat } from '../context/ChatContext';
import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import ChatWindow from '../components/chat/ChatWindow';
import InputBar from '../components/chat/InputBar';

const ChatPage = () => {
  const { messages, isLoading, sendMessage, error } = useChat();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans">
      {/* Sidebar Panel */}
      <Sidebar />

      {/* Main chat window container */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <Header />

        {/* Global error banner */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-medium text-center">
            {error}
          </div>
        )}

        {/* Main Conversation Stream */}
        <ChatWindow
          messages={messages}
          isLoading={isLoading}
          onSendSuggestion={sendMessage}
        />

        {/* Bottom Input Area */}
        <div className="p-6 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent dark:from-slate-950 dark:via-slate-950 dark:to-transparent">
          <InputBar onSend={sendMessage} disabled={isLoading} />
          <span className="block text-[10px] text-center text-slate-400 dark:text-slate-500 mt-3 font-medium">
            Answers are grounded in college knowledge documents. Inspect RAG traces for verifiable inline citations.
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
