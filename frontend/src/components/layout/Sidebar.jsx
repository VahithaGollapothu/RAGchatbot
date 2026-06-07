import React from 'react';
import { useChat } from '../../context/ChatContext';
import { MessageSquare, Plus, Trash2, Calendar, LayoutDashboard, GraduationCap } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = () => {
  const { conversations, activeSessionId, setActiveSessionId, startNewChat, deleteConversation } = useChat();
  const location = useLocation();

  const handleSessionClick = (id) => {
    if (location.pathname !== '/') {
      // If we are on admin page, redirect to home with target session
      setActiveSessionId(id);
      window.location.href = '/';
    } else {
      setActiveSessionId(id);
    }
  };

  return (
    <aside className="w-80 h-full bg-slate-900 border-r border-slate-800 flex flex-col text-slate-200 flex-shrink-0">
      {/* Brand area */}
      <div className="p-5 border-b border-slate-800/80 flex items-center gap-3">
        <div className="p-2 bg-brand-500 rounded-lg text-white">
          <GraduationCap className="h-5 w-5" />
        </div>
        <div>
          <span className="font-bold text-lg text-white">College Student Desk</span>
        </div>
      </div>

      {/* Start Chat Action */}
      <div className="p-4">
        <button
          onClick={startNewChat}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-semibold shadow-lg shadow-brand-500/20 hover:shadow-brand-500/30 transition-all duration-200 text-sm"
        >
          <Plus className="h-4 w-4" />
          New Chat Session
        </button>
      </div>

      {/* History Area */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        <span className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-2">
          Chat History
        </span>

        {conversations.length === 0 ? (
          <div className="text-center py-8 px-4 text-xs text-slate-500">
            No recent conversations.
          </div>
        ) : (
          conversations.map((sess) => {
            const isActive = activeSessionId === sess.id;
            return (
              <div
                key={sess.id}
                className={`group flex items-center justify-between rounded-xl px-3 py-3 cursor-pointer transition-all duration-150 ${
                  isActive
                    ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20'
                    : 'hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                <div
                  onClick={() => handleSessionClick(sess.id)}
                  className="flex items-center gap-3 min-w-0 flex-1"
                >
                  <MessageSquare className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-brand-400' : 'text-slate-500'}`} />
                  <div className="truncate text-sm font-medium">
                    {sess.preview || 'New Chat'}
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(sess.id);
                  }}
                  className="p-1 hover:bg-red-500/10 hover:text-red-400 text-slate-600 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                  title="Delete Chat"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Nav */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <Link
          to="/admin"
          className="flex items-center gap-3 px-3 py-2.5 text-sm font-semibold rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors"
        >
          <LayoutDashboard className="h-4 w-4" />
          Admin Dashboard
        </Link>
      </div>
    </aside>
  );
};

export default Sidebar;
