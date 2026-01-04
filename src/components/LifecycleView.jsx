import React from 'react';
import { ArrowRight, File, HardDrive, Cloud, Server, AlertCircle, CheckCircle2 } from 'lucide-react';

const LifecycleView = ({ repoState, isDarkMode }) => {
  const theme = {
      box: isDarkMode ? 'bg-slate-800 border-white/10' : 'bg-white border-slate-200 shadow-sm',
      text: isDarkMode ? 'text-slate-200' : 'text-slate-800',
      subText: isDarkMode ? 'text-slate-500' : 'text-slate-400',
      iconMod: 'text-amber-500',
      iconStaged: 'text-emerald-500',
      arrow: isDarkMode ? 'text-slate-600' : 'text-slate-300'
  };

  // Helper to check sync status
  const currentBranch = repoState.current_branch;
  const localHead = repoState.branch_heads[currentBranch];
  const remoteHead = repoState.remote_heads[currentBranch];
  
  const isSynced = localHead === remoteHead;
  const isAhead = !isSynced && localHead !== remoteHead; // simplified check

  return (
    <div className={`flex flex-col gap-4 p-4 h-full overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 ${isDarkMode ? 'bg-slate-900' : 'bg-slate-50'}`}>
      <h3 className={`text-[10px] font-black uppercase tracking-widest ${theme.subText} mb-2`}>Git Lifecycle Pipeline</h3>
      
      {/* 1. Working Directory */}
      <div className={`p-3 rounded-lg border ${theme.box} relative group`}>
          <div className="flex items-center gap-2 mb-2">
              <File className="w-4 h-4 text-amber-500" />
              <span className={`text-xs font-bold uppercase tracking-wider ${theme.text}`}>Working Dir</span>
          </div>
          <div className="space-y-1.5 min-h-[40px]">
              {repoState.workingDirectory.length === 0 ? (
                  <span className={`text-[10px] italic ${theme.subText}`}>Clean</span>
              ) : (
                  repoState.workingDirectory.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-[10px] font-mono bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20 text-amber-500">
                          <span>{f.name}</span>
                          <span className="opacity-50 text-[8px] uppercase">{f.status}</span>
                      </div>
                  ))
              )}
          </div>
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2">
               <ArrowRight className={`w-4 h-4 rotate-90 ${theme.arrow}`} />
          </div>
      </div>

      <div className="h-2" /> {/* Spacer */}

      {/* 2. Staging Area */}
      <div className={`p-3 rounded-lg border ${theme.box} relative group`}>
          <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className={`text-xs font-bold uppercase tracking-wider ${theme.text}`}>Staging Area</span>
          </div>
          <div className="space-y-1.5 min-h-[40px]">
              {repoState.stagingArea.length === 0 ? (
                  <span className={`text-[10px] italic ${theme.subText}`}>Empty</span>
              ) : (
                  repoState.stagingArea.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-[10px] font-mono bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 text-emerald-500">
                          <span>{f.name}</span>
                          <span className="opacity-50 text-[8px] uppercase">Staged</span>
                      </div>
                  ))
              )}
          </div>
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2">
               <ArrowRight className={`w-4 h-4 rotate-90 ${theme.arrow}`} />
          </div>
      </div>

      <div className="h-2" />

      {/* 3. Local Repository */}
      <div className={`p-3 rounded-lg border ${theme.box} relative`}>
          <div className="flex items-center gap-2 mb-2">
              <HardDrive className="w-4 h-4 text-indigo-500" />
              <span className={`text-xs font-bold uppercase tracking-wider ${theme.text}`}>Local Repo</span>
          </div>
          <div className="text-[10px] font-mono text-indigo-400 bg-indigo-500/10 p-2 rounded border border-indigo-500/20 break-all">
              HEAD: {localHead}
          </div>
          {isAhead && (
             <div className="mt-2 text-[9px] text-amber-500 flex items-center gap-1 font-bold">
                 <AlertCircle className="w-3 h-3" /> Ahead of remote
             </div>
          )}
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2">
               <ArrowRight className={`w-4 h-4 rotate-90 ${theme.arrow}`} />
          </div>
      </div>

      <div className="h-2" />

      {/* 4. Remote Repository */}
      <div className={`p-3 rounded-lg border ${theme.box}`}>
          <div className="flex items-center gap-2 mb-2">
              <Cloud className="w-4 h-4 text-sky-500" />
              <span className={`text-xs font-bold uppercase tracking-wider ${theme.text}`}>Remote (Origin)</span>
          </div>
          <div className="text-[10px] font-mono text-sky-400 bg-sky-500/10 p-2 rounded border border-sky-500/20 break-all">
              {remoteHead || 'Not tracked'}
          </div>
          <div className="mt-2 text-[9px] flex items-center gap-1">
              <Server className="w-3 h-3 opacity-50" />
              <span className={isSynced ? 'text-emerald-500 font-bold' : 'text-amber-500 font-bold'}>
                  {isSynced ? 'Synced' : 'Sync Required'}
              </span>
          </div>
      </div>

    </div>
  );
};

export default LifecycleView;
