import React, { useState } from 'react';
import { BookOpen, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

const SourceCard = ({ citation }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-slate-200/60 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40 rounded-xl overflow-hidden text-xs transition-all duration-200">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-100 dark:hover:bg-slate-800/40 text-left font-medium text-slate-700 dark:text-slate-300 transition-colors"
      >
        <div className="flex items-center gap-2 truncate">
          <BookOpen className="h-3.5 w-3.5 text-brand-500 flex-shrink-0" />
          <span className="truncate">{citation.docName}</span>
          <span className="px-1.5 py-0.5 bg-brand-100 dark:bg-brand-950 text-brand-600 dark:text-brand-400 rounded text-[10px] font-semibold uppercase">
            {citation.category}
          </span>
        </div>
        {isOpen ? <ChevronUp className="h-3.5 w-3.5 text-slate-400" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
      </button>

      {isOpen && (
        <div className="px-4 pb-3 pt-1 border-t border-slate-200/40 dark:border-slate-800/30 text-slate-600 dark:text-slate-400 bg-white/30 dark:bg-slate-950/20 leading-relaxed font-sans">
          <p className="italic">"{citation.snippet}"</p>
          <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
            <span>Source: {citation.source}</span>
            <span>Chunk ID: {citation.chunkId}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SourceCard;
