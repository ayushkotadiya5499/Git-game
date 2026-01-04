import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GitCommit, GitMerge, GitBranch, ZoomIn, ZoomOut, Maximize, Eye, EyeOff, MousePointer2, FileText } from 'lucide-react';

const GitGraph = ({ repoState, onSelectObject, selectedObject, isDarkMode = true }) => {
  const ROW_HEIGHT = 100;
  const COLUMN_WIDTH = 180;
  const NODE_SIZE = 56;
  const PADDING = 80;

  // Local state for UI controls
  const [hiddenBranches, setHiddenBranches] = useState(new Set());
  const [scale, setScale] = useState(1);
  const scrollContainerRef = useRef(null);

  // Check for uncommitted changes
  const hasChanges = repoState.workingDirectory.length > 0 || repoState.stagingArea.length > 0;

  // Calculate positions once using useMemo for performance
  const { positions, canvasHeight, canvasWidth } = useMemo(() => {
    const totalCommits = repoState.commits.length;
    const totalLanes = Math.max(...Object.values(repoState.lane_map), 0) + 1;
    
    // Calculate height: commits + virtual node space + padding
    const height = (totalCommits + (hasChanges ? 1 : 0)) * ROW_HEIGHT + PADDING * 2;
    const width = totalLanes * COLUMN_WIDTH + PADDING * 2;
    
    const posMap = {};
    
    // Position commits from TOP (newest) to BOTTOM (oldest)
    // Index 0 is oldest, so it goes to bottom
    repoState.commits.forEach((commit, idx) => {
      // Newest commits (higher index) at TOP
      const reversedIdx = totalCommits - 1 - idx;
      // Add extra row at top for virtual node if there are changes
      const yOffset = hasChanges ? ROW_HEIGHT : 0;
      
      posMap[commit.id] = {
        x: (commit.lane * COLUMN_WIDTH) + PADDING,
        y: reversedIdx * ROW_HEIGHT + PADDING + yOffset
      };
    });
    
    // Virtual work position (at very top, row 0)
    if (hasChanges) {
      const headId = repoState.branch_heads[repoState.current_branch];
      const headPos = posMap[headId];
      if (headPos) {
        posMap['virtual_work'] = {
          x: headPos.x,
          y: PADDING // Top row
        };
      }
    }
    
    return { positions: posMap, canvasHeight: height, canvasWidth: width };
  }, [repoState.commits, repoState.branch_heads, repoState.current_branch, repoState.lane_map, hasChanges]);

  const getPos = (commitId) => {
    return positions[commitId] || { x: PADDING, y: PADDING };
  };

  // Auto-scroll to top on new commits
  useEffect(() => {
    if (scrollContainerRef.current) {
      setTimeout(() => {
        scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    }
  }, [repoState.commits.length]);

  // Dynamic Theme Colors
  const colors = {
    nodeBg: isDarkMode ? 'bg-slate-800' : 'bg-white',
    nodeBorder: isDarkMode ? 'border-slate-500' : 'border-slate-400',
    nodeIcon: isDarkMode ? 'text-white' : 'text-slate-600',
    headBg: 'bg-indigo-600',
    headBorder: 'border-indigo-300',
    lineStroke: isDarkMode ? '#64748b' : '#94a3b8',
    lineGradientStart: '#6366f1',
    lineGradientEnd: isDarkMode ? '#64748b' : '#94a3b8',
    selectedRing: 'ring-4 ring-emerald-400 ring-offset-2 ring-offset-slate-900'
  };

  const toggleBranchVisibility = (branchName, e) => {
    e.stopPropagation();
    setHiddenBranches(prev => {
      const newSet = new Set(prev);
      if (newSet.has(branchName)) {
        newSet.delete(branchName);
      } else {
        newSet.add(branchName);
      }
      return newSet;
    });
  };

  const getPathDefinition = (start, end) => {
    // Smooth bezier curve from child (top) to parent (bottom)
    const midY = (start.y + end.y) / 2;
    return `M ${start.x} ${start.y} C ${start.x} ${midY}, ${end.x} ${midY}, ${end.x} ${end.y}`;
  };

  const renderEdge = (commit, parentId, isMerge = false, isVirtual = false) => {
    const start = getPos(isVirtual ? 'virtual_work' : commit.id);
    const end = getPos(parentId);
    const edgeId = `${commit.id || 'virtual'}-${parentId}`;
    const isSelected = selectedObject?.type === 'edge' && selectedObject?.id === edgeId;
    const isDimmed = !isVirtual && hiddenBranches.has(commit.branch);
    const d = getPathDefinition(start, end);

    return (
      <g key={edgeId} onClick={(e) => { e.stopPropagation(); onSelectObject({ type: 'edge', id: edgeId, source: commit, targetId: parentId }); }} className="cursor-pointer">
        <path d={d} stroke="transparent" strokeWidth="20" fill="none" />
        <path
          d={d}
          stroke={isSelected ? '#34d399' : (isMerge || isVirtual ? colors.lineStroke : "url(#lineGrad)")}
          strokeWidth={isSelected ? "5" : "3"}
          fill="none"
          markerEnd="url(#arrow)"
          strokeDasharray={isMerge || isVirtual ? "6 4" : "none"}
          className={`transition-all duration-300 ${isDimmed ? 'opacity-10' : 'opacity-100'}`}
        />
      </g>
    );
  };

  // Render commit node
  const renderCommitNode = (commit) => {
    const pos = getPos(commit.id);
    const isCurrentHead = Object.values(repoState.branch_heads).includes(commit.id);
    const activeBranches = Object.entries(repoState.branch_heads)
      .filter(([_, head]) => head === commit.id)
      .map(([name]) => name);
    const isSelected = selectedObject?.type === 'commit' && selectedObject?.data?.id === commit.id;
    const isHidden = hiddenBranches.has(commit.branch);
    const fileCount = commit.files ? commit.files.length : 0;

    return (
      <div
        key={commit.id}
        className={`absolute transition-all duration-300 ${isHidden ? 'opacity-20 blur-[1px]' : 'opacity-100'}`}
        style={{
          left: pos.x - NODE_SIZE / 2,
          top: pos.y - NODE_SIZE / 2,
          width: NODE_SIZE,
          height: NODE_SIZE
        }}
      >
        {/* Node Button */}
        <button
          onClick={(e) => { e.stopPropagation(); onSelectObject({ type: 'commit', data: commit }); }}
          className={`
            w-full h-full rounded-full border-[3px] flex items-center justify-center transition-all duration-200 shadow-lg
            ${isCurrentHead ? `${colors.headBg} ${colors.headBorder} shadow-indigo-500/40` : `${colors.nodeBg} ${colors.nodeBorder}`}
            ${isSelected ? colors.selectedRing : ''}
            hover:scale-110 hover:z-50
          `}
        >
          {commit.mergeParent ?
            <GitMerge className={`w-6 h-6 ${isCurrentHead ? 'text-white' : colors.nodeIcon}`} /> :
            <GitCommit className={`w-7 h-7 ${isCurrentHead ? 'text-white' : colors.nodeIcon}`} />
          }
        </button>

        {/* Hash Display */}
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${isDarkMode ? 'bg-slate-800 text-slate-400 border border-slate-700' : 'bg-white text-slate-500 border border-slate-200'}`}>
            {commit.short_id}
          </span>
        </div>

        {/* Branch Labels */}
        {activeBranches.length > 0 && (
          <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-20">
            {activeBranches.map(b => (
              <div key={b} className={`
                px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border shadow-md flex items-center gap-1.5 whitespace-nowrap
                ${b === repoState.current_branch ? 'bg-indigo-500 text-white border-indigo-400' : `${isDarkMode ? 'bg-slate-800 text-slate-300 border-slate-600' : 'bg-white text-slate-600 border-slate-200'}`}
              `}>
                <GitBranch className="w-3 h-3" />
                <span>{b}</span>
                <span className={`text-[8px] px-1 rounded ${b === repoState.current_branch ? 'bg-white/20' : 'bg-slate-500/20'}`}>
                  <FileText className="w-2 h-2 inline mr-0.5" />{fileCount}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Render virtual work node
  const renderVirtualNode = () => {
    if (!hasChanges) return null;
    const pos = getPos('virtual_work');
    const isSelected = selectedObject?.type === 'virtual';

    return (
      <div
        className="absolute transition-all duration-300"
        style={{
          left: pos.x - NODE_SIZE / 2,
          top: pos.y - NODE_SIZE / 2,
          width: NODE_SIZE,
          height: NODE_SIZE
        }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); onSelectObject({ type: 'virtual', data: { staging: repoState.stagingArea, working: repoState.workingDirectory } }); }}
          className={`
            w-full h-full rounded-full border-[3px] border-dashed flex items-center justify-center animate-pulse
            ${isDarkMode ? 'border-amber-500/60 bg-amber-500/10' : 'border-amber-400/60 bg-amber-50'}
            ${isSelected ? colors.selectedRing : ''}
          `}
        >
          <div className="w-3 h-3 rounded-full bg-amber-500" />
        </button>
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isDarkMode ? 'bg-amber-900/50 text-amber-400 border border-amber-700' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
            uncommitted
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-hidden relative h-full select-none" onClick={() => onSelectObject(null)}>
      {/* TOOLBAR */}
      <div className="absolute top-4 right-4 z-30 flex flex-col gap-2">
        <div className={`flex flex-col p-1 rounded-lg border shadow-xl ${isDarkMode ? 'bg-slate-800 border-white/10' : 'bg-white border-slate-200'}`}>
          <button onClick={(e) => { e.stopPropagation(); setScale(s => Math.min(s + 0.15, 2)); }} className="p-2 hover:text-indigo-500 transition-colors"><ZoomIn className="w-4 h-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); setScale(s => Math.max(s - 0.15, 0.4)); }} className="p-2 hover:text-indigo-500 transition-colors"><ZoomOut className="w-4 h-4" /></button>
          <button onClick={(e) => { e.stopPropagation(); setScale(1); }} className="p-2 hover:text-indigo-500 transition-colors"><Maximize className="w-4 h-4" /></button>
        </div>
      </div>

      {/* BRANCH FILTER LEGEND */}
      <div className="absolute bottom-4 left-4 z-30">
        <div className={`p-3 rounded-xl border shadow-xl backdrop-blur-md ${isDarkMode ? 'bg-slate-900/90 border-white/10' : 'bg-white/90 border-slate-200'}`}>
          <h4 className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-50 flex items-center gap-2">
            <MousePointer2 className="w-3 h-3" /> Filter Branches
          </h4>
          <div className="flex flex-col gap-1.5">
            {repoState.branches.map(b => (
              <button
                key={b}
                onClick={(e) => toggleBranchVisibility(b, e)}
                className={`flex items-center gap-2 text-[10px] font-bold px-2 py-1 rounded transition-all w-full text-left
                  ${hiddenBranches.has(b) ? 'opacity-40 hover:opacity-70 grayscale' : 'opacity-100'}
                  ${b === repoState.current_branch ? 'text-indigo-500 bg-indigo-500/10' : isDarkMode ? 'text-slate-300 hover:bg-white/5' : 'text-slate-600 hover:bg-slate-100'}
                `}
              >
                {hiddenBranches.has(b) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                {b}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SCROLLABLE CANVAS */}
      <div
        ref={scrollContainerRef}
        className="w-full h-full overflow-auto scrollbar-thin scrollbar-thumb-slate-700"
      >
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            transition: 'transform 0.2s ease-out',
            width: canvasWidth,
            height: canvasHeight,
            minWidth: '100%',
            minHeight: '100%',
            position: 'relative'
          }}
        >
          {/* SVG for edges */}
          <svg
            className="absolute inset-0 pointer-events-none"
            width={canvasWidth}
            height={canvasHeight}
            style={{ overflow: 'visible' }}
          >
            <defs>
              <linearGradient id="lineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={colors.lineGradientStart} />
                <stop offset="100%" stopColor={colors.lineGradientEnd} />
              </linearGradient>
              <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill={colors.lineGradientEnd} />
              </marker>
            </defs>

            <g className="pointer-events-auto">
              {repoState.commits.map((commit) => (
                <React.Fragment key={commit.id}>
                  {commit.parent && renderEdge(commit, commit.parent)}
                  {commit.mergeParent && renderEdge(commit, commit.mergeParent, true)}
                </React.Fragment>
              ))}
              {hasChanges && (() => {
                const headId = repoState.branch_heads[repoState.current_branch];
                return renderEdge({ id: 'virtual_work' }, headId, false, true);
              })()}
            </g>
          </svg>

          {/* Commit Nodes */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="pointer-events-auto">
              {repoState.commits.map(renderCommitNode)}
              {renderVirtualNode()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GitGraph;
