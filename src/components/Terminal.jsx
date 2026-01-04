import React, { useState, useRef, useEffect } from 'react';
import { Terminal as TerminalIcon, ChevronRight, HelpCircle, Lightbulb } from 'lucide-react';

// Git command suggestions for autocomplete
const GIT_COMMANDS = [
  'git status', 'git add .', 'git add', 'git commit -m ""', 'git commit',
  'git branch', 'git checkout', 'git checkout -b', 'git merge', 'git log',
  'git diff', 'git stash', 'git stash pop', 'git reset', 'git reset --hard',
  'git push', 'git pull', 'git rebase', 'git cherry-pick', 'git revert',
  'git tag', 'git remote -v', 'touch', 'echo', 'clear', 'reset', 'help'
];

const Terminal = ({ history, onCommand, showHints = true }) => {
  const [command, setCommand] = useState('');
  const [cmdHistory, setCmdHistory] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const terminalEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => scrollToBottom(), [history]);

  // Update suggestions based on input
  useEffect(() => {
    if (command.length > 0) {
      const filtered = GIT_COMMANDS.filter(cmd => 
        cmd.toLowerCase().startsWith(command.toLowerCase())
      ).slice(0, 5);
      setSuggestions(filtered);
      setSelectedSuggestion(0);
    } else {
      setSuggestions([]);
    }
  }, [command]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const input = command.trim();
    if (!input) return;
    
    // Handle help command locally
    if (input === 'help') {
      setShowHelp(true);
      setCommand('');
      return;
    }
    
    setCmdHistory(prev => [input, ...prev]);
    setHistoryIdx(-1);
    setSuggestions([]);
    onCommand(input);
    setCommand('');
  };

  const handleKeyDown = (e) => {
    // Tab for autocomplete
    if (e.key === 'Tab' && suggestions.length > 0) {
      e.preventDefault();
      const selected = suggestions[selectedSuggestion];
      setCommand(selected);
      setSuggestions([]);
      return;
    }
    
    // Navigate suggestions with Ctrl+Up/Down or when suggestions visible
    if (suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedSuggestion(prev => Math.min(prev + 1, suggestions.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedSuggestion(prev => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === 'Enter' && selectedSuggestion >= 0) {
        // If suggestion is selected, use it
        const selected = suggestions[selectedSuggestion];
        if (selected !== command) {
          e.preventDefault();
          setCommand(selected);
          setSuggestions([]);
          return;
        }
      }
      if (e.key === 'Escape') {
        setSuggestions([]);
        return;
      }
    }
    
    // History navigation (only when no suggestions)
    if (suggestions.length === 0) {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        const nextIdx = historyIdx + 1;
        if (nextIdx < cmdHistory.length) {
          setHistoryIdx(nextIdx);
          setCommand(cmdHistory[nextIdx]);
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIdx = historyIdx - 1;
        if (nextIdx >= 0) {
          setHistoryIdx(nextIdx);
          setCommand(cmdHistory[nextIdx]);
        } else {
          setHistoryIdx(-1);
          setCommand('');
        }
      }
    }
  };

  const applySuggestion = (suggestion) => {
    setCommand(suggestion);
    setSuggestions([]);
    inputRef.current?.focus();
  };

  return (
    <div className="flex-[2] min-h-[150px] bg-slate-900 rounded-xl sm:rounded-2xl border border-white/5 flex flex-col overflow-hidden shadow-2xl relative">
      {/* Header */}
      <div className="px-3 sm:px-5 py-2 sm:py-3 bg-slate-800/80 border-b border-white/5 flex items-center justify-between">
        <div className="flex gap-1.5 sm:gap-2">
          <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-rose-500/30 border border-rose-500/50" />
          <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-amber-500/30 border border-amber-500/50" />
          <div className="w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-emerald-500/30 border border-emerald-500/50" />
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowHelp(!showHelp)}
            className="text-slate-500 hover:text-indigo-400 transition-colors"
            title="Show Help"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1.5 sm:gap-2 text-slate-500">
            <TerminalIcon className="w-3 h-3" />
            <span className="text-[8px] sm:text-[10px] font-mono font-bold uppercase tracking-wider sm:tracking-widest">Git Terminal</span>
          </div>
        </div>
      </div>

      {/* Help Panel */}
      {showHelp && (
        <div className="bg-indigo-950/50 border-b border-indigo-500/20 p-3 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-indigo-400 flex items-center gap-2">
              <Lightbulb className="w-3.5 h-3.5" /> Quick Reference
            </h3>
            <button onClick={() => setShowHelp(false)} className="text-slate-500 hover:text-white text-xs">×</button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="space-y-1">
              <p className="text-slate-400"><span className="text-emerald-400 font-mono">git status</span> - Check repo state</p>
              <p className="text-slate-400"><span className="text-emerald-400 font-mono">git add .</span> - Stage all files</p>
              <p className="text-slate-400"><span className="text-emerald-400 font-mono">git commit -m "msg"</span> - Commit</p>
              <p className="text-slate-400"><span className="text-emerald-400 font-mono">git branch name</span> - Create branch</p>
            </div>
            <div className="space-y-1">
              <p className="text-slate-400"><span className="text-emerald-400 font-mono">git checkout name</span> - Switch branch</p>
              <p className="text-slate-400"><span className="text-emerald-400 font-mono">git merge name</span> - Merge branch</p>
              <p className="text-slate-400"><span className="text-emerald-400 font-mono">git log</span> - View history</p>
              <p className="text-slate-400"><span className="text-emerald-400 font-mono">touch file.txt</span> - Create file</p>
            </div>
          </div>
          <p className="text-[9px] text-slate-500 mt-2 border-t border-white/5 pt-2">
            💡 Press <kbd className="bg-slate-800 px-1 rounded">Tab</kbd> to autocomplete • <kbd className="bg-slate-800 px-1 rounded">↑↓</kbd> for history
          </p>
        </div>
      )}

      {/* Terminal Output */}
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

      {/* Autocomplete Suggestions */}
      {suggestions.length > 0 && (
        <div className="absolute bottom-16 left-3 right-3 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden z-10 animate-in fade-in slide-in-from-bottom-2 duration-150">
          {suggestions.map((suggestion, idx) => (
            <button
              key={suggestion}
              onClick={() => applySuggestion(suggestion)}
              className={`w-full text-left px-3 py-1.5 text-xs font-mono transition-colors ${
                idx === selectedSuggestion 
                  ? 'bg-indigo-600 text-white' 
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              {suggestion}
            </button>
          ))}
          <div className="px-3 py-1 text-[9px] text-slate-500 border-t border-slate-700 bg-slate-800/50">
            Press Tab to complete • ↑↓ to navigate
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 sm:p-5 bg-slate-900 border-t border-white/5 flex items-center gap-2 sm:gap-3">
        <span className="text-indigo-500 font-bold font-mono">$</span>
        <input 
          ref={inputRef}
          autoFocus
          type="text" 
          value={command}
          onKeyDown={handleKeyDown}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="Type 'help' for commands..."
          className="w-full bg-transparent outline-none border-none text-slate-200 font-mono text-xs sm:text-sm placeholder:text-slate-600"
        />
      </form>
    </div>
  );
};

export default Terminal;
