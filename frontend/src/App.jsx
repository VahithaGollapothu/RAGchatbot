import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { ChatProvider } from './context/ChatContext';
import ChatPage from './pages/ChatPage';
import DashboardPage from './pages/DashboardPage';

function App() {
  return (
    <ThemeProvider>
      <ChatProvider>
        <Router>
          <Routes>
            <Route path="/" element={<ChatPage />} />
            <Route path="/admin" element={<DashboardPage />} />
            {/* Fallback route */}
            <Route path="*" element={<ChatPage />} />
          </Routes>
        </Router>
      </ChatProvider>
    </ThemeProvider>
  );
}

export default App;
