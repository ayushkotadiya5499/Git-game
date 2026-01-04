import React, { useState, useEffect, useRef } from 'react';
import { GitBranch, Activity, RefreshCw, CheckCircle2, Command as CommandIcon, History, Search, Hash, X, ArrowRight, ChevronRight, Play, Pause, FastForward, Sun, Moon, GraduationCap, MonitorPlay, MoveRight, FileText, Undo2, BookOpen, Sparkles } from 'lucide-react';
import GitGraph from './GitGraph';
import Terminal from './Terminal';
import LifecycleView from './LifecycleView';
import { INITIAL_REPO_STATE, processGitCommand, simulateRemoteActivity } from '../engine/gitSystem';
import { LEVELS } from '../levels/levelData';

const GameInterface = () => {
  // --- STATE ---
  const [repoState, setRepoState] = useState(INITIAL_REPO_STATE);
  const [terminalHistory, setTerminalHistory] = useState([
    { type: 'info', content: 'GitGraph Engine v3.0.0 (Stable) initialized.' },
    { type: 'info', content: '💡 Type "help" in terminal for quick reference!' }
  ]);
  
  // Selection State: { type: 'commit'|'edge'|'virtual', data: ... }
  const [selectedObject, setSelectedObject] = useState(null);
  
  // New Modes & Settings
  const [gameMode, setGameMode] = useState('level'); // 'level' | 'simulation'
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [simSpeed, setSimSpeed] = useState(0); // 0 = paused, 1 = slow, 2 = fast
  const [sidebarTab, setSidebarTab] = useState('lifecycle'); // 'stats' | 'lifecycle'
  
  // Level State
  const [currentLevelIdx, setCurrentLevelIdx] = useState(0);
  const [currentTaskIdx, setCurrentTaskIdx] = useState(0);
  const [completed, setCompleted] = useState(false);
  
  // Undo feature - store previous states
  const [stateHistory, setStateHistory] = useState([]);
  const MAX_UNDO_HISTORY = 10;
  
  // Tutorial tooltip state
  const [showTutorial, setShowTutorial] = useState(true);
  const [tutorialStep, setTutorialStep] = useState(0);

  // Persistence Load
  useEffect(() => {
    const saved = localStorage.getItem('gitGamePro_save_v2');
    if (saved) {
        try {
            const data = JSON.parse(saved);
            setRepoState(prev => ({ ...prev, ...data.repoState }));
            setCurrentLevelIdx(data.currentLevelIdx);
            setCurrentTaskIdx(data.currentTaskIdx);
            setCompleted(data.completed);
            setGameMode(data.gameMode || 'level');
            setIsDarkMode(data.isDarkMode ?? true);
            setTerminalHistory(prev => [...prev, { type: 'success', content: 'Session restored from local storage.' }]);
        } catch (e) {
            console.error("Failed to load save", e);
        }
    }
  }, []);

  // Persistence Save
  useEffect(() => {
      const data = {
          repoState,
          currentLevelIdx,
          currentTaskIdx,
          completed,
          gameMode,
          isDarkMode
      };
      localStorage.setItem('gitGamePro_save_v2', JSON.stringify(data));
  }, [repoState, currentLevelIdx, currentTaskIdx, completed, gameMode, isDarkMode]);

  // Simulation Loop - optimized with useCallback pattern
  useEffect(() => {
      let interval;
      if (gameMode === 'simulation' && simSpeed > 0) {
          const delay = simSpeed === 1 ? 5000 : 2000;
          interval = setInterval(() => {
              setRepoState(prevState => {
                  const result = simulateRemoteActivity(prevState);
                  return result.state !== prevState ? result.state : prevState;
              });
          }, delay);
      }
      return () => clearInterval(interval);
  }, [gameMode, simSpeed]);

  const currentLevel = LEVELS[currentLevelIdx];
  const currentTask = currentLevel ? currentLevel.tasks[currentTaskIdx] : null;

  // --- LOGIC ---
  const handleCommand = (input) => {
    if (input === 'clear') { 
        setTerminalHistory([]); 
        return; 
    }
    if (input === 'reset') { 
        resetGame();
        return; 
    }
    if (input === 'undo') {
        handleUndo();
        return;
    }

    const res = processGitCommand(repoState, input);

    if (res.valid) {
      // Save current state to history before applying new state (for undo)
      setStateHistory(prev => [...prev.slice(-MAX_UNDO_HISTORY + 1), repoState]);
      
      setRepoState(res.state);
      setTerminalHistory(p => [...p, { type: 'command', content: `> ${input}` }, { type: 'success', content: res.message }]);
      
      // Check Task Completion ONLY in Level Mode
      if (gameMode === 'level' && currentTask && !completed) {
          const lastCmd = { cmd: res.cmd, args: input.split(' ').slice(2), full: input };
          
          if (currentTask.check(res.state, lastCmd)) {
              handleTaskCompletion();
          }
      }

    } else {
      setTerminalHistory(p => [...p, { type: 'command', content: `> ${input}` }, { type: 'error', content: res.message }]);
    }
  };
  
  // Undo last command
  const handleUndo = () => {
    if (stateHistory.length === 0) {
      setTerminalHistory(p => [...p, { type: 'error', content: 'Nothing to undo!' }]);
      return;
    }
    const prevState = stateHistory[stateHistory.length - 1];
    setStateHistory(prev => prev.slice(0, -1));
    setRepoState(prevState);
    setTerminalHistory(p => [...p, { type: 'info', content: '↩️ Undid last command' }]);
  };

  const handleTaskCompletion = () => {
      setTerminalHistory(p => [...p, { type: 'success', content: `\n✅ Task Completed: ${currentTask.id}` }]);
      
      if (currentTaskIdx + 1 < currentLevel.tasks.length) {
          const nextTask = currentLevel.tasks[currentTaskIdx + 1];
          setCurrentTaskIdx(p => p + 1);
          if (nextTask.setup) {
             setRepoState(prev => {
                 const newState = JSON.parse(JSON.stringify(prev));
                 nextTask.setup(newState);
                 return newState;
             });
          }
      } else {
          // Level Complete
          if (currentLevelIdx + 1 < LEVELS.length) {
              setTerminalHistory(p => [...p, { type: 'success', content: `\n🎉 Level '${currentLevel.title}' Completed! Moving to next level...` }]);
              setTimeout(() => {
                  setCurrentLevelIdx(p => p + 1);
                  setCurrentTaskIdx(0);
                  const nextLevel = LEVELS[currentLevelIdx + 1];
                  if(nextLevel && nextLevel.tasks[0].setup) {
                      setRepoState(prev => {
                        const newState = JSON.parse(JSON.stringify(prev));
                        nextLevel.tasks[0].setup(newState);
                        return newState;
                    });
                  }
              }, 1500);
          } else {
              setCompleted(true);
              setTerminalHistory(p => [...p, { type: 'success', content: `\n🏆 CONGRATULATIONS! You have mastered all levels.` }]);
          }
      }
  };

  const resetGame = () => {
    localStorage.removeItem('gitGamePro_save_v2');
    setRepoState(INITIAL_REPO_STATE);
    setCurrentLevelIdx(0);
    setCurrentTaskIdx(0);
    setCompleted(false);
    setSimSpeed(0);
    setTerminalHistory([{ type: 'info', content: 'Repository and Game Progress reset.' }]);
  };
  
  useEffect(() => {
      if (gameMode === 'level' && currentLevelIdx === 0 && currentTaskIdx === 0 && currentTask?.setup && !localStorage.getItem('gitGamePro_save_v2')) {
           setRepoState(prev => {
                 const newState = JSON.parse(JSON.stringify(prev));
                 currentTask.setup(newState);
                 return newState;
             });
      }
  }, [gameMode]);

  // Calculate Progress
  const levelProgress = completed ? 100 : ((currentTaskIdx) / (currentLevel?.tasks.length || 1)) * 100;
  
  // Theme Helpers
  const theme = {
      bg: isDarkMode ? 'bg-slate-950' : 'bg-slate-50',
      text: isDarkMode ? 'text-slate-200' : 'text-slate-800',
      headerBg: isDarkMode ? 'bg-slate-900' : 'bg-white',
      border: isDarkMode ? 'border-white/5' : 'border-slate-200',
      accentBg: isDarkMode ? 'bg-indigo-500/10' : 'bg-indigo-50',
      accentBorder: isDarkMode ? 'border-indigo-500/20' : 'border-indigo-200',
      panelBg: isDarkMode ? 'bg-slate-900' : 'bg-white',
      mutedText: isDarkMode ? 'text-slate-500' : 'text-slate-400',
      graphBg: isDarkMode ? 'bg-[radial-gradient(#1e293b_1px,transparent_1px)]' : 'bg-[radial-gradient(#cbd5e1_1px,transparent_1px)]',
      overlayBg: isDarkMode ? 'bg-slate-950/80' : 'bg-slate-50/80'
  };

  return (
    <div className={`flex flex-col h-[100dvh] font-sans overflow-hidden transition-colors duration-500 ${theme.bg} ${theme.text}`}>
      
      {/* 1. HEADER */}
      <header className={`flex items-center justify-between px-4 py-3 border-b shrink-0 z-50 ${theme.headerBg} ${theme.border}`}>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg border ${theme.accentBg} ${theme.accentBorder}`}>
              <GitBranch className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <h1 className={`text-sm font-black tracking-wider uppercase ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>GitGraph <span className="text-indigo-500">Pro</span></h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{gameMode === 'level' ? 'Training Mode' : 'Simulation Mode'}</p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className={`hidden sm:flex items-center p-1 rounded-lg border ${theme.border} ${isDarkMode ? 'bg-slate-950' : 'bg-slate-100'}`}>
              <button 
                onClick={() => setGameMode('level')}
                className={`flex items-center gap-2 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${gameMode === 'level' ? 'bg-indigo-500 text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}
              >
                  <GraduationCap className="w-3 h-3" /> Learn
              </button>
              <button 
                onClick={() => setGameMode('simulation')}
                className={`flex items-center gap-2 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${gameMode === 'simulation' ? 'bg-emerald-500 text-white shadow' : 'text-slate-500 hover:text-slate-700'}`}
              >
                  <MonitorPlay className="w-3 h-3" /> Sim
              </button>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
             <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-2 rounded-lg border transition-all ${theme.border} hover:bg-indigo-500/10`}
            >
                {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>
            
            <button 
                onClick={resetGame} 
                className={`group flex items-center gap-2 px-3 py-1.5 border rounded-lg transition-all ${theme.border} hover:bg-red-500/10 hover:border-red-500/30`}
            >
                <RefreshCw className={`w-3.5 h-3.5 group-hover:text-red-400 group-hover:rotate-180 transition-transform duration-500 ${theme.mutedText}`} />
                <span className={`hidden sm:inline text-[10px] font-bold uppercase tracking-wider group-hover:text-red-400 ${theme.mutedText}`}>Reset</span>
            </button>
        </div>
      </header>

      {/* 2. MISSION CONTROL BAR */}
      {gameMode === 'level' ? (
          <section className={`border-b px-4 py-3 shrink-0 flex flex-col sm:flex-row gap-3 sm:items-center justify-between backdrop-blur-sm relative overflow-hidden ${theme.headerBg} ${theme.border} ${isDarkMode ? 'bg-opacity-50' : 'bg-opacity-90'}`}>
             <div className="absolute top-0 left-0 h-[2px] bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700" style={{ width: `${levelProgress}%` }} />
             
             <div className="flex items-start gap-3 w-full max-w-4xl">
                 <div className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full bg-indigo-500 text-white font-black text-xs shrink-0 shadow-lg shadow-indigo-500/20">
                     {currentLevelIdx + 1}
                 </div>
                 <div className="flex-1 min-w-0">
                     <div className="flex items-center gap-2 mb-0.5">
                         <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
                             {completed ? "Training Complete" : currentLevel?.title}
                         </span>
                         {!completed && <span className={`px-1.5 py-0.5 rounded border text-[9px] font-mono ${theme.border} ${theme.mutedText}`}>{currentTaskIdx + 1}/{currentLevel?.tasks.length}</span>}
                     </div>
                     <p className={`text-xs sm:text-sm font-medium leading-tight ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>
                         {completed ? "You have successfully mastered the curriculum." : currentTask?.instruction}
                     </p>
                     {currentTask?.hint && !completed && (
                         <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-slate-500">
                             <Search className="w-3 h-3" />
                             <span>Hint: <span className={`font-mono text-indigo-500 px-1 rounded ${theme.accentBg}`}>{currentTask.hint}</span></span>
                         </div>
                     )}
                 </div>
             </div>
          </section>
      ) : (
          <section className={`border-b px-4 py-3 shrink-0 flex items-center justify-between ${theme.headerBg} ${theme.border}`}>
               <div className="flex items-center gap-4">
                   <div className="flex flex-col">
                       <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Simulation Control</span>
                       <span className={`text-xs ${theme.mutedText}`}>Parameters & Events</span>
                   </div>
                   <div className={`h-8 w-px ${theme.border}`} />
                   <div className="flex items-center gap-2">
                       <button onClick={() => setSimSpeed(0)} className={`p-1.5 rounded ${simSpeed === 0 ? 'bg-slate-200 text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}><Pause className="w-4 h-4" /></button>
                       <button onClick={() => setSimSpeed(1)} className={`p-1.5 rounded ${simSpeed === 1 ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-slate-600'}`}><Play className="w-4 h-4" /></button>
                       <button onClick={() => setSimSpeed(2)} className={`p-1.5 rounded ${simSpeed === 2 ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-600'}`}><FastForward className="w-4 h-4" /></button>
                   </div>
                   <span className="text-[10px] font-mono text-slate-500 uppercase">{simSpeed === 0 ? 'PAUSED' : simSpeed === 1 ? 'NORMAL SPEED' : 'FAST FORWARD'}</span>
               </div>
               
               <div className={`hidden lg:flex items-center gap-3 px-3 py-1.5 rounded border ${theme.border} ${isDarkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
                  <GitBranch className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Head -&gt;</span>
                  <span className="text-xs font-mono font-bold text-indigo-500">{repoState.current_branch}</span>
               </div>
          </section>
      )}

      {/* 3. WORKSPACE (Split View) */}
      <main className={`flex-1 overflow-hidden flex flex-col lg:flex-row ${theme.bg}`}>
        
        {/* LEFT: GRAPH VISUALIZATION */}
        <div className={`flex-1 relative overflow-hidden flex flex-col ${theme.graphBg} [background-size:24px_24px]`}>
            <div className={`absolute inset-0 pointer-events-none ${theme.overlayBg}`} /> 
            
            {/* Graph Container */}
            <div className="flex-1 relative overflow-hidden">
                 <GitGraph 
                    repoState={repoState} 
                    selectedObject={selectedObject}
                    onSelectObject={setSelectedObject} 
                    isDarkMode={isDarkMode} 
                 />
            </div>

            {/* Universal Inspector Panel (Floating Bottom Sheet style) */}
            {selectedObject && (
                <div className={`absolute bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 backdrop-blur-xl border rounded-xl shadow-2xl p-4 animate-in slide-in-from-bottom-6 fade-in duration-300 z-40 ${isDarkMode ? 'bg-slate-900/90 border-white/10' : 'bg-white/90 border-slate-200'}`}>
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                             <div className={`w-2 h-2 rounded-full ${selectedObject.type === 'edge' ? 'bg-emerald-500' : selectedObject.type === 'virtual' ? 'bg-amber-500' : 'bg-indigo-500'}`} />
                             <h4 className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                                 {selectedObject.type === 'commit' ? 'Commit Details' : selectedObject.type === 'edge' ? 'Relationship' : 'Uncommitted Changes'}
                             </h4>
                        </div>
                        <button onClick={() => setSelectedObject(null)} className="text-slate-500 hover:text-indigo-500 transition-colors"><X className="w-4 h-4" /></button>
                    </div>
                    
                    {selectedObject.type === 'commit' && (
                        <div className="space-y-3">
                            <div className={`p-2 rounded border font-mono text-[10px] break-all ${isDarkMode ? 'bg-slate-950 border-white/5 text-indigo-300' : 'bg-slate-50 border-slate-200 text-indigo-600'}`}>
                                {selectedObject.data.id}
                            </div>
                            <div>
                                <p className="text-[9px] text-slate-500 font-bold uppercase mb-1">Message</p>
                                <p className={`text-xs italic ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>"{selectedObject.data.message}"</p>
                            </div>
                            <div className={`flex items-center justify-between pt-2 border-t ${theme.border}`}>
                                <div className="flex flex-col">
                                    <span className="text-[9px] text-slate-500 font-bold uppercase">Branch</span>
                                    <span className={`text-xs font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{selectedObject.data.branch}</span>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-[9px] text-slate-500 font-bold uppercase">Timestamp</span>
                                    <span className="text-[10px] font-mono text-slate-400">{new Date(selectedObject.data.timestamp).toLocaleTimeString()}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {selectedObject.type === 'edge' && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between gap-2">
                                <div className={`flex-1 p-2 rounded border text-center ${theme.border} ${theme.panelBg}`}>
                                    <span className="text-[8px] uppercase font-bold text-slate-500 block mb-1">Child</span>
                                    <span className={`text-[10px] font-mono ${isDarkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>
                                        {selectedObject.source.short_id || 'Virtual'}
                                    </span>
                                </div>
                                <ArrowRight className="w-4 h-4 text-slate-500" />
                                <div className={`flex-1 p-2 rounded border text-center ${theme.border} ${theme.panelBg}`}>
                                    <span className="text-[8px] uppercase font-bold text-slate-500 block mb-1">Parent</span>
                                    <span className={`text-[10px] font-mono ${isDarkMode ? 'text-indigo-300' : 'text-indigo-600'}`}>
                                        {repoState.commits.find(c => c.id === selectedObject.targetId)?.short_id || '???'} 
                                    </span>
                                </div>
                            </div>
                            <div className="text-center p-2">
                                <span className="text-[10px] text-slate-500 italic">Diff view not available in simulation.</span>
                            </div>
                        </div>
                    )}

                    {selectedObject.type === 'virtual' && (
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <div className={`p-2 rounded border ${theme.border} ${theme.panelBg}`}>
                                    <span className="text-[9px] font-bold uppercase text-amber-500 block mb-1">Working Dir</span>
                                    <span className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{selectedObject.data.working.length}</span>
                                </div>
                                <div className={`p-2 rounded border ${theme.border} ${theme.panelBg}`}>
                                    <span className="text-[9px] font-bold uppercase text-emerald-500 block mb-1">Staged</span>
                                    <span className={`text-xl font-black ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>{selectedObject.data.staging.length}</span>
                                </div>
                            </div>
                            <div>
                                <p className="text-[9px] text-slate-500 font-bold uppercase mb-1">Modified Files</p>
                                <div className="max-h-24 overflow-y-auto space-y-1">
                                    {[...selectedObject.data.working, ...selectedObject.data.staging].slice(0, 5).map((f, i) => (
                                        <div key={i} className="flex items-center gap-2 text-[10px] font-mono">
                                            <FileText className="w-3 h-3 text-slate-500" />
                                            <span>{f.name}</span>
                                        </div>
                                    ))}
                                    {([...selectedObject.data.working, ...selectedObject.data.staging].length > 5) && (
                                        <span className="text-[9px] text-slate-500 italic">...and more</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>

        {/* RIGHT: TERMINAL & STATS SIDEBAR */}
        <div className={`h-[40vh] lg:h-auto lg:w-96 flex flex-col border-t lg:border-t-0 lg:border-l shrink-0 z-30 shadow-2xl ${theme.border} ${theme.panelBg}`}>
            {/* Terminal */}
            <div className={`flex-1 flex flex-col min-h-0 ${isDarkMode ? 'bg-slate-950' : 'bg-slate-900'}`}>
               <Terminal history={terminalHistory} onCommand={handleCommand} />
            </div>

            {/* Sidebar Tabs */}
            <div className={`flex items-center border-t ${theme.border} ${theme.headerBg}`}>
                <button 
                    onClick={() => setSidebarTab('lifecycle')}
                    className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors border-r ${theme.border} ${sidebarTab === 'lifecycle' ? 'text-indigo-500 bg-indigo-500/5' : theme.mutedText}`}
                >
                    Lifecycle Flow
                </button>
                <button 
                    onClick={() => setSidebarTab('stats')}
                    className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${sidebarTab === 'stats' ? 'text-indigo-500 bg-indigo-500/5' : theme.mutedText}`}
                >
                    Repo Stats
                </button>
            </div>

            {/* Bottom Panel Content */}
            <div className={`h-64 overflow-hidden shrink-0 ${theme.panelBg}`}>
                {sidebarTab === 'lifecycle' ? (
                    <LifecycleView repoState={repoState} isDarkMode={isDarkMode} />
                ) : (
                    <div className={`h-full p-4 grid grid-cols-2 gap-3 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 ${theme.panelBg}`}>
                        <div className={`rounded p-2 flex flex-col justify-center border ${isDarkMode ? 'bg-slate-800/50 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Active Branch</span>
                            <div className="flex items-center gap-1.5">
                                <GitBranch className="w-3 h-3 text-indigo-500" />
                                <span className={`text-xs font-mono font-bold truncate ${isDarkMode ? 'text-indigo-300' : 'text-indigo-700'}`}>{repoState.current_branch}</span>
                            </div>
                        </div>
                        <div className={`rounded p-2 flex flex-col justify-center border ${isDarkMode ? 'bg-slate-800/50 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                            <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Repository</span>
                            <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
                                <span><span className={isDarkMode ? 'text-white' : 'text-slate-900'}>{repoState.commits.length}</span> Cmt</span>
                                <span><span className={isDarkMode ? 'text-white' : 'text-slate-900'}>{repoState.branches.length}</span> Br</span>
                            </div>
                        </div>
                        <div className={`rounded p-2 flex flex-col justify-center border col-span-2 ${isDarkMode ? 'bg-slate-800/50 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Changes</span>
                                <span className="text-[9px] font-mono text-slate-400">{repoState.stagingArea.length} Staged / {repoState.workingDirectory.length} Mod</span>
                            </div>
                            <div className="flex gap-1 h-1.5">
                                {repoState.stagingArea.length > 0 && <div className="bg-emerald-500 rounded-full flex-1" />}
                                {repoState.workingDirectory.length > 0 && <div className="bg-amber-500 rounded-full flex-1" />}
                                {repoState.stagingArea.length === 0 && repoState.workingDirectory.length === 0 && <div className="bg-slate-400/20 rounded-full flex-1" />}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </main>
    </div>
  );
};

export default GameInterface;