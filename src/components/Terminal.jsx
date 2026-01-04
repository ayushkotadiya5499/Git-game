import React, { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon, ChevronRight } from 'lucide-react';

const Terminal = ({ history, onCommand }) => {
  const [command, setCommand] = useState('');
  const [cmdHistory, setCmdHistory] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const terminalEndRef = useRef(null);

  const scrollToBottom = () => terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => scrollToBottom(), [history]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const input = command.trim();
    if (!input) return;
    
    setCmdHistory(prev => [input, ...prev]);
    setHistoryIdx(-1);
    onCommand(input);
    setCommand('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
        const nextIdx = historyIdx + 1;
        if (nextIdx < cmdHistory.length) {
            setHistoryIdx(nextIdx);
            setCommand(cmdHistory[nextIdx]);
        }
    } else if (e.key === 'ArrowDown') {
        const nextIdx = historyIdx - 1;
        if (nextIdx >= 0) {
            setHistoryIdx(nextIdx);
            setCommand(cmdHistory[nextIdx]);
        } else {
            setHistoryIdx(-1);
            setCommand('');
        }
    }
  };

  return (
    <div className="flex-[2] min-h-[150px] bg-slate-900 rounded-xl sm:rounded-2xl border border-white/5 flex flex-col overflow-hidden shadow-2xl relative">
      <div className="px-3 sm:px-5 py-2 sm:py-3 bg-slate-800/80 border-b border-white/5 flex items-center justify-between">
        <div className="flex gap-1.5 sm:gap-2">
          <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-rose-500/30 border border-rose-500/50" />
          <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-amber-500/30 border border-amber-500/50" />
          <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-emerald-500/30 border border-emerald-500/50" />
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 text-slate-500">
          <TerminalIcon className="w-3 h-3" />
          <span className="text-[8px] sm:text-[10px] font-mono font-bold uppercase tracking-wider sm:tracking-widest">Git Terminal</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3 sm:p-6 font-mono text-[10px] sm:text-xs space-y-2 scrollbar-hide">
        {history.map((item, i) => (
          <div key={i} className={`
            leading-relaxed animate-in fade-in slide-in-from-bottom-1 duration-300
            ${item.type === 'command' ? 'text-white font-bold flex items-center gap-2' : ''}
            ${item.type === 'error' ? 'text-rose-400 bg-rose-400/5 p-2 rounded border border-rose-400/20' : ''}
            ${item.type === 'success' ? 'text-emerald-400' : ''}
            ${item.type === 'info' ? 'text-slate-500 italic' : ''}
          `}>
            {item.type === 'command' && <ChevronRight className="w-3 h-3 text-indigo-500" />}
            <span className="whitespace-pre-wrap">{item.content}</span>
          </div>
        ))}
        <div ref={terminalEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-3 sm:p-5 bg-slate-900 border-t border-white/5 flex items-center gap-2 sm:gap-3">
        <span className="text-indigo-500 font-bold font-mono">$</span>
        <input 
          autoFocus
          type="text" 
          value={command}
          onKeyDown={handleKeyDown}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="git commit -m 'message'..."
          className="w-full bg-transparent outline-none border-none text-slate-200 font-mono text-xs sm:text-sm placeholder:text-slate-600"
        />
      </form>
    </div>
  );
};

export default Terminal;
