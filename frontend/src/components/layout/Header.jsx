import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon, GraduationCap, LayoutDashboard, MessageSquare } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const Header = () => {
  const { isDark, toggleTheme } = useTheme();
  const location = useLocation();
  const isAdmin = location.pathname === '/admin';

  return (
    <header className="sticky top-0 z-40 w-full glass-effect border-b border-slate-200/50 dark:border-slate-800/50 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-brand-500 rounded-xl text-white shadow-lg shadow-brand-500/30 flex items-center justify-center">
          <GraduationCap className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white font-sans flex items-center gap-2">
            College Student Desk
            <span className="text-xs bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
              Adaptive RAG
            </span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Student Query Assistant</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {isAdmin ? (
          <Link
            to="/"
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl text-brand-600 bg-brand-50 dark:text-brand-400 dark:bg-brand-950/40 hover:bg-brand-100 dark:hover:bg-brand-950/80 transition-all border border-brand-100 dark:border-brand-900/30"
          >
            <MessageSquare className="h-4 w-4" />
            Chat Window
          </Link>
        ) : (
          <Link
            to="/admin"
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl text-slate-600 bg-slate-100 dark:text-slate-300 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all border border-slate-200/40 dark:border-slate-700/55"
          >
            <LayoutDashboard className="h-4 w-4" />
            Admin Dashboard
          </Link>
        )}

        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-500 dark:text-slate-400 transition-colors"
          title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      </div>
    </header>
  );
};

export default Header;
