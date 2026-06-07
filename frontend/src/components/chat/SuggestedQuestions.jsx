import React from 'react';
import { HelpCircle } from 'lucide-react';

const SUGGESTIONS = [
  { text: "What is the attendance requirement?", label: "Attendance" },
  { text: "How can I apply for a scholarship?", label: "Scholarship" },
  { text: "What is the lateral entry process?", label: "Lateral Entry" },
  { text: "When are the exams scheduled?", label: "Examinations" },
  { text: "What are the hostel room structures?", label: "Hostel Facilities" },
  { text: "Tell me about placement statistics.", label: "Campus Placements" },
];

const SuggestedQuestions = ({ onSelect }) => {
  return (
    <div className="w-full max-w-3xl mx-auto py-6">
      <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-3 px-1 text-sm font-medium">
        <HelpCircle className="h-4 w-4" />
        Suggested Questions
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SUGGESTIONS.map((item, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(item.text)}
            className="flex flex-col text-left px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-xl hover:border-brand-500 dark:hover:border-brand-500 hover:bg-brand-50/10 dark:hover:bg-brand-950/10 transition-all duration-200"
          >
            <span className="text-xs font-semibold text-brand-600 dark:text-brand-400 uppercase tracking-wider mb-0.5">
              {item.label}
            </span>
            <span className="text-sm text-slate-700 dark:text-slate-200 line-clamp-1">
              {item.text}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SuggestedQuestions;
