import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  GitBranch, 
  GitCommit, 
  GitMerge, 
  Info, 
  ChevronRight, 
  Command as CommandIcon, 
  CheckCircle2,
  RefreshCw,
  HelpCircle,
  Hash,
  Terminal as TerminalIcon,
  Search,
  History,
  Activity,
  X
} from 'lucide-react';

const INITIAL_STATE = {
  repo_state: {
    branches: ["main"],
    current_branch: "main",
    branch_heads: { "main": "c1" },
    lane_map: { "main": 0 },
    commits: [
      {
        id: "c1",
        short_id: "7a2f1b",
        message: "initial commit",
        branch: "main",
        parent: null,
        lane: 0,
        timestamp: new Date().toISOString()
      }
    ]
  },
  explanation: "Welcome to the Final Edition of GitGraph Pro. Execute commands to build your repository map."
};

const App = () => {
  // --- STATE ---
  const [repoState, setRepoState] = useState(INITIAL_STATE.repo_state);
  const [terminalHistory, setTerminalHistory] = useState([
    { type: 'info', content: 'GitGraph Engine v3.0.0 (Stable) initialized.' },
    { type: 'info', content: 'Tip: Use arrow keys to navigate command history.' }
  ]);
  const [command, setCommand] = useState('');
  const [cmdHistory, setCmdHistory] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [explanation, setExplanation] = useState(INITIAL_STATE.explanation);
  const [selectedCommit, setSelectedCommit] = useState(null);
  
  const terminalEndRef = useRef(null);

  // --- UTILS ---
  const scrollToBottom = () => terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => scrollToBottom(), [terminalHistory]);

  const generateID = () => Math.random().toString(36).substring(2, 8);

  // --- CORE ENGINE ---
  const processGitCommand = (input) => {
    const parts = input.trim().split(/\s+/);
    const cmd = parts[0];
    const subCmd = parts[1];
    const args = parts.slice(2);

    if (cmd !== 'git' && !['help', 'clear', 'reset'].includes(cmd)) {
      return { valid: false, error_message: `'-bash: ${cmd}: command not found'` };
    }

    if (cmd === 'help') {
      return { valid: true, explanation: "Available: branch, checkout, commit, merge, status, log." };
    }

    let newState = JSON.parse(JSON.stringify(repoState));
    let result = { valid: true, explanation: "", repo_state: newState };

    switch (subCmd) {
      case 'branch':
        const name = args[0];
        if (!name) {
            result.explanation = `On branch ${newState.current_branch}\nOther branches: ${newState.branches.filter(b => b !== newState.current_branch).join(', ')}`;
        } else if (newState.branches.includes(name)) {
            result.valid = false;
            result.error_message = `fatal: A branch named '${name}' already exists.`;
        } else {
            newState.branches.push(name);
            newState.branch_heads[name] = newState.branch_heads[newState.current_branch];
            const maxLane = Math.max(...Object.values(newState.lane_map));
            newState.lane_map[name] = maxLane + 1;
            result.explanation = `Branch '${name}' created at ${newState.branch_heads[name]}.`;
        }
        break;

      case 'checkout':
        let target = args[0];
        let isNew = false;
        if (args[0] === '-b') {
            target = args[1];
            isNew = true;
            if (!newState.branches.includes(target)) {
                newState.branches.push(target);
                newState.branch_heads[target] = newState.branch_heads[newState.current_branch];
                const maxL = Math.max(...Object.values(newState.lane_map));
                newState.lane_map[target] = maxL + 1;
            }
        }

        if (!newState.branches.includes(target)) {
            result.valid = false;
            result.error_message = `error: pathspec '${target}' did not match any branch.`;
        } else {
            newState.current_branch = target;
            result.explanation = `Switched to ${isNew ? 'new ' : ''}branch '${target}'.`;
        }
        break;

      case 'commit':
        const msgIdx = args.indexOf('-m');
        const message = msgIdx !== -1 ? args.slice(msgIdx + 1).join(' ').replace(/['"]/g, '') : "update files";
        const newId = 'c' + (newState.commits.length + 1);
        const parentId = newState.branch_heads[newState.current_branch];
        
        const newCommit = {
            id: newId,
            short_id: generateID(),
            message: message,
            branch: newState.current_branch,
            parent: parentId,
            lane: newState.lane_map[newState.current_branch],
            timestamp: new Date().toISOString()
        };

        newState.commits.push(newCommit);
        newState.branch_heads[newState.current_branch] = newId;
        result.explanation = `[${newState.current_branch} ${newCommit.short_id}] ${message}`;
        break;

      case 'merge':
        const source = args[0];
        if (!source || !newState.branches.includes(source)) {
            result.valid = false;
            result.error_message = `merge: ${source} - not something we can merge.`;
        } else if (source === newState.current_branch) {
            result.valid = false;
            result.error_message = `Already up to date.`;
        } else {
            const mId = 'c' + (newState.commits.length + 1);
            const mergeCommit = {
                id: mId,
                short_id: generateID(),
                message: `Merge branch '${source}' into ${newState.current_branch}`,
                branch: newState.current_branch,
                parent: newState.branch_heads[newState.current_branch],
                mergeParent: newState.branch_heads[source],
                lane: newState.lane_map[newState.current_branch],
                timestamp: new Date().toISOString()
            };
            newState.commits.push(mergeCommit);
            newState.branch_heads[newState.current_branch] = mId;
            result.explanation = `Merge made by the 'recursive' strategy.`;
        }
        break;

      case 'status':
        result.explanation = `On branch ${newState.current_branch}\nYour branch is up to date with 'origin/${newState.current_branch}'.\n\nnothing to commit, working tree clean`;
        break;

      case 'log':
        result.explanation = "Viewing commit graph history.";
        break;

      default:
        result.valid = false;
        result.error_message = `git: '${subCmd}' is not a git command. See 'git --help'.`;
    }

    return result;
  };

  const handleCommand = (e) => {
    e.preventDefault();
    const input = command.trim();
    if (!input) return;

    if (input === 'clear') { 
        setTerminalHistory([]); 
        setCommand(''); 
        return; 
    }
    if (input === 'reset') { 
        setRepoState(INITIAL_STATE.repo_state); 
        setExplanation(INITIAL_STATE.explanation); 
        setTerminalHistory([{ type: 'info', content: 'Repository reset to initial state.' }]); 
        setCommand(''); 
        setCmdHistory([]);
        return; 
    }

    const res = processGitCommand(input);
    setCmdHistory(prev => [input, ...prev]);
    setHistoryIdx(-1);

    if (res.valid) {
      setRepoState(res.repo_state);
      setExplanation(res.explanation);
      setTerminalHistory(p => [...p, { type: 'command', content: `> ${input}` }, { type: 'success', content: res.explanation }]);
    } else {
      setTerminalHistory(p => [...p, { type: 'command', content: `> ${input}` }, { type: 'error', content: res.error_message }]);
    }
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

  // --- GRAPH RENDERING ---
  const ROW_HEIGHT = 90;
  const COLUMN_WIDTH = 140;

  const getPos = (commitId) => {
    const idx = repoState.commits.findIndex(c => c.id === commitId);
    const commit = repoState.commits[idx];
    if (!commit) return { x: 0, y: 0 };
    return {
        x: (commit.lane * COLUMN_WIDTH) + 80,
        y: (idx * ROW_HEIGHT) + 80
    };
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden">
      {/* HEADER */}
      <header className="flex items-center justify-between px-6 py-4 bg-slate-900/80 backdrop-blur-md border-b border-white/5 shrink-0 z-50">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/20 ring-1 ring-white/20">
            <GitBranch className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-white uppercase">GitGraph <span className="text-indigo-400 font-light italic">Pro</span></h1>
            <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">Engine v3.0 // Multi-Branch Visualization</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end mr-4">
                <span className="text-[10px] text-slate-500 font-black uppercase">Session Active</span>
                <span className="text-xs font-mono text-indigo-400">repo_local_v3</span>
            </div>
            <button 
                onClick={() => setCommand('reset')} 
                className="group flex items-center gap-2 px-4 py-2 text-xs font-black bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all uppercase tracking-widest"
            >
                <RefreshCw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" /> Reset
            </button>
            <div className="flex items-center gap-3 px-4 py-2 bg-indigo-500/10 rounded-lg border border-indigo-500/30">
                <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest">Active</span>
                <span className="text-sm font-mono font-black text-indigo-400 uppercase tracking-tighter flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" /> {repoState.current_branch}
                </span>
            </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex flex-1 overflow-hidden p-4 gap-4 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 to-slate-950">
        
        {/* VISUALIZATION CANVAS */}
        <div className="flex-[3] flex flex-col bg-slate-900/40 rounded-2xl border border-white/5 overflow-hidden relative shadow-inner">
          
          {/* Legend / Info Overlay */}
          <div className="absolute top-6 left-6 z-20 flex flex-col gap-3">
            <div className="flex items-center gap-3 bg-slate-900/90 backdrop-blur-xl p-3 px-5 rounded-2xl border border-white/10 shadow-2xl max-w-md animate-in fade-in slide-in-from-left-4">
                <div className="p-2 bg-indigo-500/20 rounded-lg">
                    <Activity className="w-4 h-4 text-indigo-400" />
                </div>
                <span className="text-sm font-semibold text-slate-200 leading-tight">{explanation}</span>
            </div>
          </div>

          <div className="flex-1 overflow-auto relative p-12 scrollbar-thin scrollbar-thumb-slate-800">
            {/* SVG GRID BACKGROUND */}
            <div className="absolute inset-0 pointer-events-none opacity-20" style={{ backgroundImage: 'radial-gradient(#475569 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

            <svg 
              className="absolute top-0 left-0 pointer-events-none" 
              width={Object.keys(repoState.lane_map).length * COLUMN_WIDTH + 300} 
              height={repoState.commits.length * ROW_HEIGHT + 300}
            >
              <defs>
                <linearGradient id="lineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#475569" />
                </linearGradient>
                <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#475569" />
                </marker>
              </defs>
              
              {/* Connection Lines */}
              {repoState.commits.map((commit) => {
                const start = getPos(commit.id);
                const paths = [];

                if (commit.parent) {
                  const end = getPos(commit.parent);
                  paths.push(
                    <path 
                      key={`${commit.id}-parent`} 
                      d={`M ${start.x} ${start.y} C ${start.x} ${start.y - 40}, ${end.x} ${end.y + 40}, ${end.x} ${end.y}`}
                      stroke="url(#lineGrad)" strokeWidth="3" fill="none" markerEnd="url(#arrow)"
                      className="transition-all duration-700"
                    />
                  );
                }
                
                if (commit.mergeParent) {
                  const end = getPos(commit.mergeParent);
                  paths.push(
                    <path 
                      key={`${commit.id}-merge`} 
                      d={`M ${start.x} ${start.y} C ${start.x} ${start.y - 40}, ${end.x} ${end.y + 40}, ${end.x} ${end.y}`}
                      stroke="#818cf8" strokeWidth="3" strokeDasharray="6 4" fill="none"
                      className="opacity-60"
                    />
                  );
                }
                return paths;
              })}
            </svg>

            {/* Commit Nodes */}
            <div className="relative z-10">
              {repoState.commits.map((commit) => {
                const pos = getPos(commit.id);
                const isCurrentHead = Object.values(repoState.branch_heads).includes(commit.id);
                const activeBranches = Object.entries(repoState.branch_heads)
                  .filter(([_, head]) => head === commit.id)
                  .map(([name]) => name);

                return (
                  <div 
                    key={commit.id} 
                    className="absolute transition-all duration-500 ease-out group"
                    style={{ left: pos.x - 24, top: pos.y - 24 }}
                  >
                    {/* The Node */}
                    <button 
                      onClick={() => setSelectedCommit(commit)}
                      className={`
                        w-12 h-12 rounded-full border-[3px] flex items-center justify-center transition-all duration-300
                        ${isCurrentHead ? 'bg-indigo-600 border-indigo-300 shadow-[0_0_30px_rgba(99,102,241,0.6)] scale-110' : 'bg-slate-800 border-slate-600'}
                        hover:scale-125 hover:border-white hover:z-50
                      `}
                    >
                      {commit.mergeParent ? <GitMerge className="w-5 h-5 text-white" /> : <GitCommit className="w-6 h-6 text-white" />}
                    </button>

                    {/* Branch Labels (Floating next to node) */}
                    <div className="absolute left-16 top-1 flex flex-col gap-1.5 pointer-events-none">
                        {activeBranches.map(b => (
                            <div key={b} className={`
                                px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap border shadow-xl flex items-center gap-2
                                ${b === repoState.current_branch ? 'bg-indigo-500 text-white border-white animate-bounce' : 'bg-slate-800 text-slate-400 border-slate-700'}
                            `}>
                                <GitBranch className="w-3 h-3" /> {b} {b === repoState.current_branch && '★'}
                            </div>
                        ))}
                    </div>

                    {/* Quick Peek */}
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-[10px] px-2 py-1 rounded border border-white/10 whitespace-nowrap font-mono text-indigo-400 font-bold pointer-events-none">
                        {commit.short_id}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Commit Inspector Panel */}
          {selectedCommit && (
            <div className="absolute right-6 bottom-6 w-72 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-5 animate-in zoom-in-95 fade-in duration-200 z-50">
                <div className="flex justify-between items-start mb-4">
                    <h4 className="text-xs font-black uppercase tracking-widest text-indigo-400">Commit Details</h4>
                    <button onClick={() => setSelectedCommit(null)} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
                <div className="space-y-4">
                    <div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Hash</p>
                        <p className="font-mono text-xs bg-slate-950 p-2 rounded border border-white/5">{selectedCommit.id} ({selectedCommit.short_id})</p>
                    </div>
                    <div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Message</p>
                        <p className="text-sm font-medium italic text-slate-200">"{selectedCommit.message}"</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Branch</p>
                            <p className="text-xs font-bold text-indigo-400">{selectedCommit.branch}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Lane</p>
                            <p className="text-xs font-bold text-slate-400"># {selectedCommit.lane}</p>
                        </div>
                    </div>
                </div>
            </div>
          )}
        </div>

        {/* TERMINAL & REPO INFO */}
        <div className="flex-[2] flex flex-col gap-4">
          
          {/* TERMINAL EMULATOR */}
          <div className="flex-[2] bg-slate-900 rounded-2xl border border-white/5 flex flex-col overflow-hidden shadow-2xl relative">
            <div className="px-5 py-3 bg-slate-800/80 border-b border-white/5 flex items-center justify-between">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/30 border border-rose-500/50" />
                <div className="w-3 h-3 rounded-full bg-amber-500/30 border border-amber-500/50" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/30 border border-emerald-500/50" />
              </div>
              <div className="flex items-center gap-2 text-slate-500">
                <TerminalIcon className="w-3 h-3" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest">Git Terminal</span>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6 font-mono text-xs space-y-2 scrollbar-hide">
              {terminalHistory.map((item, i) => (
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

            <form onSubmit={handleCommand} className="p-5 bg-slate-900 border-t border-white/5 flex items-center gap-3">
              <span className="text-indigo-500 font-bold font-mono">$</span>
              <input 
                autoFocus
                type="text" 
                value={command}
                onKeyDown={handleKeyDown}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="git commit -m 'feat: add logic'..."
                className="w-full bg-transparent outline-none border-none text-slate-200 font-mono text-sm placeholder:text-slate-800"
              />
            </form>
          </div>

          {/* ANALYTICS / BRANCH INDEX */}
          <div className="flex-1 bg-slate-900/60 rounded-2xl border border-white/5 p-5 flex flex-col gap-4">
            <h3 className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2 tracking-[0.2em]">
                <Hash className="w-3 h-3 text-indigo-500" /> Lane Distribution
            </h3>
            <div className="flex-1 overflow-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-800">
                {Object.entries(repoState.lane_map).map(([name, lane]) => (
                    <div 
                        key={name} 
                        className={`
                            flex items-center justify-between p-3 rounded-xl border transition-colors
                            ${name === repoState.current_branch ? 'bg-indigo-500/10 border-indigo-500/40' : 'bg-white/5 border-white/5'}
                        `}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-2 h-2 rounded-full ${name === repoState.current_branch ? 'bg-indigo-400 shadow-[0_0_8px_#818cf8]' : 'bg-slate-600'}`} />
                            <span className={`text-xs font-mono font-bold ${name === repoState.current_branch ? 'text-white' : 'text-slate-400'}`}>{name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black text-slate-600 uppercase">Lane</span>
                            <span className="text-xs font-mono font-black text-indigo-400">{lane}</span>
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex flex-col gap-1">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Commits</span>
                    <span className="text-lg font-mono font-black text-white">{repoState.commits.length}</span>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/5 flex flex-col gap-1">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Branches</span>
                    <span className="text-lg font-mono font-black text-white">{repoState.branches.length}</span>
                </div>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-purple-700 text-white flex justify-between items-center text-[10px] font-black uppercase tracking-[0.3em] shrink-0 shadow-2xl">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1.5"><CommandIcon className="w-3 h-3" /> Core: git-v3-engine</div>
          <div className="flex items-center gap-1.5"><History className="w-3 h-3" /> Graph: enabled</div>
          <div className="flex items-center gap-1.5"><Search className="w-3 h-3" /> Inspection: active</div>
        </div>
        <div className="flex items-center gap-4">
            <span className="opacity-50">Localhost Environment</span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white/20 rounded">
                <CheckCircle2 className="w-3 h-3" /> Ready
            </div>
        </div>
      </footer>
    </div>
  );
};

export default App;