import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const ChatContext = createContext();

export const ChatProvider = ({ children }) => {
  const [conversations, setConversations] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(() => localStorage.getItem('activeSessionId') || null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load conversation sessions list on mount
  useEffect(() => {
    loadSessions();
  }, []);

  // Sync active session history when sessionId changes
  useEffect(() => {
    if (activeSessionId) {
      localStorage.setItem('activeSessionId', activeSessionId);
      loadSessionDetails(activeSessionId);
    } else {
      localStorage.removeItem('activeSessionId');
      setMessages([]);
    }
  }, [activeSessionId]);

  const loadSessions = async () => {
    try {
      const res = await api.getConversations();
      if (res.success) {
        setConversations(res.data);
      }
    } catch (err) {
      console.error('Failed to load sessions list', err);
    }
  };

  const loadSessionDetails = async (id) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.getConversationDetails(id);
      if (res.success) {
        setMessages(res.data.history || []);
      }
    } catch (err) {
      setError('Failed to load message history.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const startNewChat = () => {
    setActiveSessionId(null);
    setMessages([]);
  };

  const sendMessage = async (text) => {
    if (!text.trim()) return;

    // Optimistically push user message
    const tempUserMsg = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMsg]);
    setIsLoading(true);
    setError(null);

    try {
      const res = await api.sendMessage(text, activeSessionId);
      if (res.success) {
        const { sessionId, answer, citations, route, steps, responseTimeMs } = res.data;
        
        // Update session ID if it was a new chat
        if (!activeSessionId) {
          setActiveSessionId(sessionId);
        }

        // Add assistant response with meta tags
        const assistantMsg = {
          role: 'assistant',
          content: answer,
          timestamp: new Date().toISOString(),
          metadata: { citations, steps, route, responseTimeMs },
        };

        setMessages(prev => [...prev, assistantMsg]);
        loadSessions(); // refresh history list
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
      // Remove the optimistic user message if we fail, or mark it as error
    } finally {
      setIsLoading(false);
    }
  };

  const deleteConversation = async (id) => {
    try {
      const res = await api.deleteConversation(id);
      if (res.success) {
        if (activeSessionId === id) {
          startNewChat();
        }
        loadSessions();
      }
    } catch (err) {
      console.error('Failed to delete session', err);
    }
  };

  const submitFeedback = async (queryText, rating, feedbackText = '') => {
    try {
      await api.submitFeedback(queryText, rating, feedbackText);
      // Optional: show visual toast/notification on success
    } catch (err) {
      console.error('Failed to submit feedback', err);
    }
  };

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeSessionId,
        setActiveSessionId,
        messages,
        isLoading,
        error,
        startNewChat,
        sendMessage,
        deleteConversation,
        submitFeedback,
        refreshSessions: loadSessions,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => useContext(ChatContext);
