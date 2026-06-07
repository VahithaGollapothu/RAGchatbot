import React from 'react';

const TypingIndicator = () => {
  return (
    <div className="flex items-start gap-4 py-4 max-w-3xl mx-auto w-full">
      <div className="h-9 w-9 bg-brand-500 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-md shadow-brand-500/20">
        🎓
      </div>
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl rounded-tl-none px-5 py-4 flex items-center gap-1.5 shadow-sm">
        <div className="h-2 w-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="h-2 w-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="h-2 w-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
};

export default TypingIndicator;
