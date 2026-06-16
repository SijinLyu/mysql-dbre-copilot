import React, { useState, useRef, useEffect } from 'react';

interface InputBarProps {
  onSend: (message: string) => void;
  disabled: boolean;
  suggestions?: string[];
}

export const InputBar: React.FC<InputBarProps> = ({ onSend, disabled, suggestions }) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  return (
    <div className="p-4 border-t" style={{ background: 'var(--bg-surface)', borderColor: 'var(--border)' }}>
      {suggestions && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3 max-w-3xl mx-auto">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => onSend(s)}
              className="text-xs px-3 py-1.5 rounded-full border transition-all hover:opacity-80"
              style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'var(--accent-soft)' }}
            >
              {s}
            </button>
          ))}
        </div>
      )}
      <div className="flex gap-2 items-end max-w-3xl mx-auto">
        <div className="flex-1 rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-input)', borderColor: 'var(--border)' }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your database..."
            disabled={disabled}
            rows={1}
            className="w-full resize-none px-4 py-3 text-sm bg-transparent outline-none disabled:opacity-50 placeholder:opacity-50"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>
        <button
          onClick={handleSubmit}
          disabled={disabled || !input.trim()}
          className="p-3 rounded-xl text-white transition-all disabled:opacity-30"
          style={{ background: 'var(--accent)' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
};
