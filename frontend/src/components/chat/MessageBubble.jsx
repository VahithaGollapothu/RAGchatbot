import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Copy, Check, Info, Sparkles, AlertTriangle, Cpu } from 'lucide-react';
import SourceCard from './SourceCard';
import { useChat } from '../../context/ChatContext';

const MessageBubble = ({ message }) => {
  const { submitFeedback } = useChat();
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState(null); // 'like' | 'dislike'
  const [showRAGTrace, setShowRAGTrace] = useState(false);

  const isUser = message.role === 'user';
  const meta = message.metadata;

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFeedback = (ratingType) => {
    if (feedback) return; // Allow single feedback submission
    setFeedback(ratingType);
    const score = ratingType === 'like' ? 1 : -1;
    submitFeedback(message.content, score, '');
  };

  return (
    <div className={`flex items-start gap-4 py-4 max-w-3xl mx-auto w-full group ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`h-9 w-9 rounded-xl flex items-center justify-center text-white flex-shrink-0 shadow-md ${
          isUser
            ? 'bg-slate-700 shadow-slate-700/20'
            : 'bg-brand-500 shadow-brand-500/20'
        }`}
      >
        {isUser ? '👤' : '🎓'}
      </div>

      {/* Message content panel */}
      <div className="flex-1 flex flex-col gap-2.5 min-w-0">
        <div
          className={`px-5 py-4 rounded-2xl border ${
            isUser
              ? 'bg-slate-100 dark:bg-slate-800/80 border-slate-200/50 dark:border-slate-800/50 rounded-tr-none text-slate-800 dark:text-slate-100'
              : 'bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800/80 rounded-tl-none text-slate-800 dark:text-slate-100 shadow-sm'
          }`}
        >
          {/* Main message text */}
          <div className="whitespace-pre-line text-sm leading-relaxed font-normal">
            {message.content}
          </div>

          {/* Action buttons (only for assistant responses) */}
          {!isUser && (
            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <button
                  onClick={handleCopy}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg transition-colors"
                  title="Copy response"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={() => handleFeedback('like')}
                  disabled={feedback !== null}
                  className={`p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors ${
                    feedback === 'like' ? 'text-emerald-500' : 'text-slate-400 hover:text-emerald-600'
                  }`}
                  title="Thumbs up"
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleFeedback('dislike')}
                  disabled={feedback !== null}
                  className={`p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors ${
                    feedback === 'dislike' ? 'text-red-500' : 'text-slate-400 hover:text-red-600'
                  }`}
                  title="Thumbs down"
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                </button>
              </div>

              {meta?.steps && (
                <button
                  onClick={() => setShowRAGTrace(!showRAGTrace)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-brand-600 dark:text-brand-400 hover:underline px-2 py-1 rounded hover:bg-brand-500/5 transition-colors"
                >
                  <Cpu className="h-3.5 w-3.5" />
                  {showRAGTrace ? 'Hide Pipeline Trace' : 'View Pipeline Trace'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Citations block */}
        {!isUser && meta?.citations && meta.citations.length > 0 && (
          <div className="space-y-1.5 mt-1">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
              Source Citations ({meta.citations.length})
            </span>
            <div className="grid grid-cols-1 gap-2">
              {meta.citations.map((cit, idx) => (
                <SourceCard key={idx} citation={cit} />
              ))}
            </div>
          </div>
        )}

        {/* Expandable Pipeline Execution Trace */}
        {!isUser && showRAGTrace && meta?.steps && (
          <div className="mt-1.5 p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 text-xs">
            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-semibold mb-2">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Adaptive RAG Trace Log
            </div>
            <div className="space-y-1.5 font-mono text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
              <div>• Classification Route: <span className="text-slate-800 dark:text-slate-200 font-semibold">{meta.route || 'N/A'}</span></div>
              {meta.responseTimeMs && <div>• Response Time: <span className="text-slate-800 dark:text-slate-200">{meta.responseTimeMs} ms</span></div>}
              <div className="border-t border-slate-200/50 dark:border-slate-800/40 my-2 pt-2">
                <span className="font-semibold text-slate-600 dark:text-slate-400 block mb-1">Executed Steps:</span>
                {meta.steps.map((st, i) => (
                  <div key={i} className="flex items-start justify-between py-0.5">
                    <span>{st.step}</span>
                    <span className="text-slate-800 dark:text-slate-200 font-medium">
                      {st.result !== undefined ? String(st.result) : (st.count !== undefined ? `${st.count} items` : 'Done')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
