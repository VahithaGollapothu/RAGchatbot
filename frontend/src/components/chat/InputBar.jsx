import React, { useState } from 'react';
import { Send, ArrowUp } from 'lucide-react';

const InputBar = ({ onSend, disabled }) => {
  const [text, setText] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim() && !disabled) {
      onSend(text.trim());
      setText('');
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-3xl mx-auto relative flex items-center bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-lg shadow-slate-100/50 dark:shadow-none focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/10 transition-all p-1.5"
    >
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Ask a question about admissions, fees, hostel, placements..."
        disabled={disabled}
        className="flex-1 bg-transparent px-4 py-3 text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none text-sm disabled:cursor-not-allowed"
      />
      <button
        type="submit"
        disabled={!text.trim() || disabled}
        className="p-3 bg-brand-500 hover:bg-brand-600 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-white disabled:text-slate-400 dark:disabled:text-slate-600 rounded-xl transition-all font-semibold flex items-center justify-center h-11 w-11 flex-shrink-0"
      >
        <ArrowUp className="h-5 w-5" />
      </button>
    </form>
  );
};

export default InputBar;
