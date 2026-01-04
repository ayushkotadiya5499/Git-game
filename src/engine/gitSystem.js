export const INITIAL_REPO_STATE = {
  branches: ["main"],
  current_branch: "main",
    branch_heads: { "main": "c1" },
    remote_heads: { "main": "c1" }, // Track where origin/main is
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
    ],
    workingDirectory: [], // { name, status: 'modified' | 'untracked' | 'deleted' }
    stagingArea: [],      // { name, status }
    stash: [],            // Stack of { id, message, files }
    tags: {}              // { tagName: commitId }
  };
  
  const generateID = () => Math.random().toString(36).substring(2, 8);
  
  export const processGitCommand = (state, input) => {
    const parts = input.trim().split(/\s+/);
    const cmd = parts[0];
    const subCmd = parts[1];
    const args = parts.slice(2);
  
    // Create deep clone only once at start
    const newState = structuredClone ? structuredClone(state) : JSON.parse(JSON.stringify(state));
  
    // Ensure remote_heads exists (for migration of old saves)
    if (!newState.remote_heads) newState.remote_heads = { ...newState.branch_heads };

    let output = { valid: true, message: "", state: newState, cmd: subCmd };
  
      
  
        // --- SHELL COMMANDS ---
    if (cmd === 'touch') {
        const fileName = subCmd;
        if (!fileName) return { valid: false, message: "touch: missing file operand", state, cmd: 'touch' };
        if (newState.workingDirectory.find(f => f.name === fileName) || newState.stagingArea.find(f => f.name === fileName)) {
            return { ...output, message: "" }; 
        }
        newState.workingDirectory.push({ name: fileName, status: 'untracked', content: '' });
        return { ...output, state: newState, message: "" };
    }
  
    if (cmd === 'echo') {
        // Syntax: echo "content" > file.txt
        const fullArgs = [subCmd, ...args].join(' ');
        const match = fullArgs.match(/"([^"]*)"\s*>(>)?\s*(\S+)/);
        
        if (!match) {
            return { valid: false, message: "usage: echo \"text\" > filename", state, cmd: 'echo' };
        }
        
        const newContent = match[1];
        const append = !!match[2];
        const fileName = match[3];
  
        // Find file in WD or Staging or HEAD (if tracked)
        let file = newState.workingDirectory.find(f => f.name === fileName);
        
        if (!file) {
            // Check staging (copy back to WD to modify)
            const stagedFile = newState.stagingArea.find(f => f.name === fileName);
            if (stagedFile) {
                file = { ...stagedFile, status: 'modified' };
                newState.workingDirectory.push(file);
            } else {
                // Create new
                file = { name: fileName, status: 'untracked', content: '' };
                newState.workingDirectory.push(file);
            }
        }
  
        if (append) {
            file.content += newContent + "\n";
        } else {
            file.content = newContent + "\n";
        }
        
        if (file.status !== 'untracked') file.status = 'modified';
        
        return { ...output, state: newState, message: "" };
    }
  
    if (cmd !== 'git') {
        if (cmd === 'clear') return { ...output, cmd: 'clear' };
        return { valid: false, message: `'-bash: ${cmd}: command not found'`, state, cmd };
    }
  
    switch (subCmd) {
      case 'diff':
         if (newState.workingDirectory.length === 0) {
             output.message = "";
         } else {
             output.message = newState.workingDirectory.map(f => {
                 return `diff --git a/${f.name} b/${f.name}\n--- a/${f.name}\n+++ b/${f.name}\n@@ -1 +1 @@\n+${f.content.trim()}`;
             }).join('\n');
         }
         break;

      case 'status':
            const staged = newState.stagingArea.length;
            const modified = newState.workingDirectory.length;
            output.message = `On branch ${newState.current_branch}\n`;
            
            // Compare local head with remote head
            const localHead = newState.branch_heads[newState.current_branch];
            const remoteHead = newState.remote_heads[newState.current_branch];
            
            if (localHead === remoteHead) {
                output.message += `Your branch is up to date with 'origin/${newState.current_branch}'.\n`;
            } else {
                // Naive check
                output.message += `Your branch is ahead/behind 'origin/${newState.current_branch}'.\n`;
            }
      
            if (staged === 0 && modified === 0) {
              output.message += `nothing to commit, working tree clean`;
            } else {
              if (staged > 0) output.message += `Changes to be committed:\n  ${newState.stagingArea.map(f => f.name).join('\n  ')}\n`;
              if (modified > 0) output.message += `Untracked/Modified files:\n  ${newState.workingDirectory.map(f => f.name).join('\n  ')}\n`;
            }
            break;
  
      case 'add':
        const filePat = args[0];
        if (!filePat) {
          output.valid = false;
          output.message = "Nothing specified, nothing added.";
        } else {
          // Move from workingDirectory to stagingArea
          // Handle '.'
          if (filePat === '.') {
             newState.stagingArea = [...newState.stagingArea, ...newState.workingDirectory];
             newState.workingDirectory = [];
          } else {
             const idx = newState.workingDirectory.findIndex(f => f.name === filePat);
             if (idx !== -1) {
               const file = newState.workingDirectory.splice(idx, 1)[0];
               newState.stagingArea.push(file);
             } else if (newState.stagingArea.find(f => f.name === filePat)) {
               // already staged, do nothing
             } else {
               output.valid = false;
               output.message = `fatal: pathspec '${filePat}' did not match any files`;
             }
          }
        }
        break;
  
      case 'commit':
        if (newState.stagingArea.length === 0) {
          output.valid = false;
          output.message = "nothing to commit, working tree clean";
        } else {
          const msgIdx = args.indexOf('-m');
          const message = msgIdx !== -1 ? args.slice(msgIdx + 1).join(' ').replace(/['"]/g, '') : "update files";
          
          const newId = 'c' + (newState.commits.length + 1);
          const parentId = newState.branch_heads[newState.current_branch];
          
          // Calculate file snapshot
          // 1. Get parent files
          const parentCommit = newState.commits.find(c => c.id === parentId);
          let currentFiles = parentCommit && parentCommit.files ? [...parentCommit.files] : [];
          
          // 2. Apply staging (simple add/update)
          newState.stagingArea.forEach(stagedFile => {
              if (!currentFiles.includes(stagedFile.name)) {
                  currentFiles.push(stagedFile.name);
              }
          });

          const newCommit = {
              id: newId,
              short_id: generateID(),
              message: message,
              branch: newState.current_branch,
              parent: parentId,
              lane: newState.lane_map[newState.current_branch],
              timestamp: new Date().toISOString(),
              files: currentFiles // Snapshot
          };
  
          newState.commits.push(newCommit);
          newState.branch_heads[newState.current_branch] = newId;
          newState.stagingArea = []; // Clear staging
          output.message = `[${newState.current_branch} ${newCommit.short_id}] ${message}`;
        }
        break;
  
      case 'branch':
        const name = args[0];
        if (!name) {
            output.message = `* ${newState.current_branch}\n  ${newState.branches.filter(b => b !== newState.current_branch).join('\n  ')}`;
        } else if (newState.branches.includes(name)) {
            output.valid = false;
            output.message = `fatal: A branch named '${name}' already exists.`;
        } else {
            newState.branches.push(name);
            newState.branch_heads[name] = newState.branch_heads[newState.current_branch];
            // Init remote head for new branch as null or same start? 
            // Real git doesn't set upstream auto, but for game let's track it
            if (newState.remote_heads[newState.current_branch]) {
                newState.remote_heads[name] = newState.remote_heads[newState.current_branch];
            }
            
            // Simple lane logic
            const maxLane = Math.max(...Object.values(newState.lane_map));
            newState.lane_map[name] = maxLane + 1;
            output.message = `Branch '${name}' created.`;
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
                // Copy remote tracking if exists
                 if (newState.remote_heads[newState.current_branch]) {
                    newState.remote_heads[target] = newState.remote_heads[newState.current_branch];
                }
  
                const maxL = Math.max(...Object.values(newState.lane_map));
                newState.lane_map[target] = maxL + 1;
            }
        }
  
        if (!newState.branches.includes(target)) {
            output.valid = false;
            output.message = `error: pathspec '${target}' did not match any branch/commit.`;
        } else {
            newState.current_branch = target;
            output.message = `Switched to ${isNew ? 'new ' : ''}branch '${target}'.`;
        }
        break;
  
      case 'merge':
          const source = args[0];
          if (!source || !newState.branches.includes(source)) {
              output.valid = false;
              output.message = `merge: ${source} - not something we can merge.`;
          } else if (source === newState.current_branch) {
              output.message = `Already up to date.`;
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
              output.message = `Merge made by the 'recursive' strategy.`;
          }
          break;
  
      case 'log':
          output.message = newState.commits.slice().reverse().map(c => 
              `\u001b[33mcommit ${c.id} (${c.short_id})\u001b[0m\nAuthor: User <user@gitgame.com>\nDate: ${c.timestamp}\n\n    ${c.message}`
          ).join('\n\n');
          break;
          
      case 'reset':
           const resetTarget = args[0] || 'HEAD'; // Simple HEAD~1 support
           if (resetTarget.includes('HEAD~')) {
               const count = parseInt(resetTarget.split('~')[1]);
               // Naive walk back
               let currentId = newState.branch_heads[newState.current_branch];
               for(let i=0; i<count; i++) {
                   const c = newState.commits.find(x => x.id === currentId);
                   if(c && c.parent) currentId = c.parent;
               }
               newState.branch_heads[newState.current_branch] = currentId;
               output.message = `HEAD is now at ${currentId} (simulated)`;
           } else {
               // Hard reset to a specific commit? For now just default behavior
                output.message = "Resetting...";
                // Basic logic for the game
                if (args.includes('--hard')) {
                    newState.stagingArea = [];
                    newState.workingDirectory = [];
                }
           }
           break;
  
      case 'stash':
          if (args[0] === 'pop') {
              if (newState.stash.length === 0) {
                  output.valid = false;
                  output.message = "No stash entries found.";
              } else {
                  const popped = newState.stash.pop();
                  newState.workingDirectory = [...newState.workingDirectory, ...popped.files];
                  output.message = `Dropped ${popped.id} (${popped.message})`;
              }
          } else {
              if (newState.workingDirectory.length === 0 && newState.stagingArea.length === 0) {
                   output.message = "No local changes to save";
              } else {
                  const stashId = "stash@{" + newState.stash.length + "}";
                  newState.stash.push({
                      id: stashId,
                      message: "WIP on " + newState.current_branch,
                      files: [...newState.workingDirectory, ...newState.stagingArea]
                  });
                  newState.workingDirectory = [];
                  newState.stagingArea = [];
                  output.message = `Saved working directory and index state ${stashId}`;
              }
          }
          break;
      
      case 'rebase':
          const rebaseSource = args[0];
          if (!rebaseSource || !newState.branches.includes(rebaseSource)) {
               output.valid = false;
               output.message = `rebase: ${rebaseSource || 'current'} is not a valid branch`;
          } else {
               // Mock rebase: just say it happened, or maybe move the pointer?
               // A real rebase is hard to visualize without changing IDs.
               // For this game, let's just update the parent of the first commit in the current branch's divergence
               output.message = `Successfully rebased and updated refs/heads/${newState.current_branch}.`;
          }
          break;
  
      case 'remote':
           if (args[0] === 'add') {
               output.message = `Remote '${args[1]}' added.`;
           } else if (args[0] === '-v') {
               output.message = `origin  https://github.com/user/repo.git (fetch)\norigin  https://github.com/user/repo.git (push)`;
           } else {
               output.message = "origin";
           }
           break;
  
      case 'push':
           // Update remote_heads[current_branch] to match branch_heads[current_branch]
           newState.remote_heads[newState.current_branch] = newState.branch_heads[newState.current_branch];
           
           output.message = `Enumerating objects: 5, done.\nWriting objects: 100% (3/3), 283 bytes | 283.00 KiB/s, done.\nTotal 3 (delta 0), reused 0 (delta 0)\nTo https://github.com/user/repo.git\n   ${newState.branch_heads[newState.current_branch].substring(0,7)}..${newState.branch_heads[newState.current_branch].substring(0,7)}  ${newState.current_branch} -> ${newState.current_branch}`;
           break;
  
      case 'pull':
           // In a real sim, this would fetch remote changes and merge.
           // For now, if we simulated remote activity, we might need to fast-forward.
           // We'll just assume it succeeds and syncs.
           output.message = `Updating ${newState.branch_heads[newState.current_branch].substring(0,7)}..${generateID()}\nFast-forward`;
           break;
  
      case 'cherry-pick':
           const cpHash = args[0];
           if (!cpHash) {
               output.valid = false;
               output.message = "usage: git cherry-pick <commit>";
           } else {
               const targetCommit = newState.commits.find(c => c.id === cpHash || c.short_id === cpHash);
               if (!targetCommit) {
                   output.valid = false;
                   output.message = `fatal: bad revision '${cpHash}'`;
               } else {
                   const newId = 'c' + (newState.commits.length + 1);
                   const cpCommit = {
                       id: newId,
                       short_id: generateID(),
                       message: targetCommit.message,
                       branch: newState.current_branch,
                       parent: newState.branch_heads[newState.current_branch],
                       lane: newState.lane_map[newState.current_branch],
                       timestamp: new Date().toISOString()
                   };
                   newState.commits.push(cpCommit);
                   newState.branch_heads[newState.current_branch] = newId;
                   output.message = `[${newState.current_branch} ${cpCommit.short_id}] ${cpCommit.message}`;
               }
           }
           break;
  
      case 'revert':
           const revHash = args[0] || 'HEAD';
           let revCommit;
           if (revHash === 'HEAD') {
               revCommit = newState.commits.find(c => c.id === newState.branch_heads[newState.current_branch]);
           } else {
               revCommit = newState.commits.find(c => c.id === revHash || c.short_id === revHash);
           }
           
           if (!revCommit) {
               output.valid = false;
               output.message = `fatal: bad revision '${revHash}'`;
           } else {
                const newId = 'c' + (newState.commits.length + 1);
                const rCommit = {
                   id: newId,
                   short_id: generateID(),
                   message: `Revert "${revCommit.message}"`,
                   branch: newState.current_branch,
                   parent: newState.branch_heads[newState.current_branch],
                   lane: newState.lane_map[newState.current_branch],
                   timestamp: new Date().toISOString()
                };
                newState.commits.push(rCommit);
                newState.branch_heads[newState.current_branch] = newId;
                output.message = `[${newState.current_branch} ${rCommit.short_id}] ${rCommit.message}`;
           }
           break;
  
      case 'tag':
           const tagName = args[0];
           if (!tagName) {
               // List tags
               output.message = Object.keys(newState.tags || {}).join('\n');
           } else {
               if (!newState.tags) newState.tags = {};
               if (newState.tags[tagName]) {
                   output.valid = false;
                   output.message = `fatal: tag '${tagName}' already exists`;
               } else {
                   const currentHead = newState.branch_heads[newState.current_branch];
                   newState.tags[tagName] = currentHead;
                   output.message = `Created tag '${tagName}' at ${currentHead}`;
               }
           }
           break;
  
    default:
      output.valid = false;
      output.message = `git: '${subCmd}' is not a git command. See 'git --help'.`;
  }

  return output;
};

export const simulateRemoteActivity = (state) => {
    let newState = JSON.parse(JSON.stringify(state));
    
    // 1. Pick a random branch or create a new one
    const branches = newState.branches;
    const branchToActOn = branches[Math.floor(Math.random() * branches.length)];
    
    // 2. Generate a commit
    const newId = 'r' + Math.floor(Math.random() * 10000); // Remote commit ID
    const parentId = newState.branch_heads[branchToActOn];
    
    // Check if parent exists
    if (!parentId) return state; // Safety check

    const newCommit = {
        id: newId,
        short_id: generateID(),
        message: `Remote: Update ${branchToActOn} features`,
        branch: branchToActOn,
        parent: parentId,
        lane: newState.lane_map[branchToActOn],
        timestamp: new Date().toISOString()
    };

    newState.commits.push(newCommit);
    newState.branch_heads[branchToActOn] = newId;

    return {
        state: newState,
        message: `Remote activity: New commit on '${branchToActOn}'`
    };
};
