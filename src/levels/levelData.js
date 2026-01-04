export const LEVELS = [
  {
    id: 'beginner',
    title: 'Beginner: The Basics',
    description: 'Master the fundamental commands of Git.',
    tasks: [
      {
        id: 'init_status',
        instruction: "Let's start by checking the state of our repository. Run 'git status'.",
        check: (state, lastCmd) => lastCmd?.cmd === 'status',
        hint: "Type 'git status' and press Enter."
      },
      {
        id: 'add_file',
        instruction: "We have a new file 'feature.txt' in the working directory. Add it to the staging area.",
        setup: (state) => {
          state.workingDirectory.push({ name: 'feature.txt', status: 'untracked' });
        },
        check: (state) => state.stagingArea.some(f => f.name === 'feature.txt'),
        hint: "Type 'git add feature.txt' or 'git add .'"
      },
      {
        id: 'commit',
        instruction: "Now that the file is staged, commit it with a message.",
        check: (state, lastCmd) => lastCmd?.cmd === 'commit' && state.commits.length > 1,
        hint: "Type 'git commit -m \"added feature\"'"
      },
      {
        id: 'log',
        instruction: "Great! Now let's view the history of your commits.",
        check: (state, lastCmd) => lastCmd?.cmd === 'log',
        hint: "Type 'git log'"
      }
    ]
  },
  {
    id: 'intermediate',
    title: 'Intermediate: Branching & Merging',
    description: 'Learn how to manage parallel development.',
    tasks: [
      {
        id: 'branch',
        instruction: "Create a new branch named 'feature-branch'.",
        check: (state) => state.branches.includes('feature-branch'),
        hint: "Type 'git branch feature-branch'"
      },
      {
        id: 'checkout',
        instruction: "Switch to your new branch 'feature-branch'.",
        check: (state) => state.current_branch === 'feature-branch',
        hint: "Type 'git checkout feature-branch'"
      },
      {
        id: 'commit_branch',
        instruction: "Make a commit on this new branch.",
        check: (state, lastCmd) => lastCmd?.cmd === 'commit' && state.current_branch === 'feature-branch',
        hint: "Type 'git commit -m \"feature work\"'"
      },
      {
        id: 'checkout_main',
        instruction: "Switch back to the 'main' branch.",
        check: (state) => state.current_branch === 'main',
        hint: "Type 'git checkout main'"
      },
      {
        id: 'merge',
        instruction: "Merge 'feature-branch' into 'main'.",
        check: (state, lastCmd) => lastCmd?.cmd === 'merge' && state.commits[state.commits.length-1].message.includes('Merge'),
        hint: "Type 'git merge feature-branch'"
      }
    ]
  },
  {
    id: 'advanced',
    title: 'Advanced: Time Travel & Ref',
    description: 'Manipulate history and fix mistakes.',
    tasks: [
      {
        id: 'reset',
        instruction: "We made a mistake! Reset the last commit (Soft reset to keep changes staged).",
        check: (state, lastCmd) => lastCmd?.cmd === 'reset',
        hint: "Type 'git reset HEAD~1'"
      },
      {
        id: 'stash',
        instruction: "You have some work in progress but need to switch tasks. Stash your changes.",
        setup: (state) => {
            state.workingDirectory.push({ name: 'wip.txt', status: 'modified' });
        },
        check: (state) => state.stash.length > 0,
        hint: "Type 'git stash'"
      },
      {
        id: 'stash_pop',
        instruction: "Now bring your stashed changes back.",
        check: (state) => state.stash.length === 0 && state.workingDirectory.some(f => f.name === 'wip.txt'),
        hint: "Type 'git stash pop'"
      }
    ]
  },
  {
    id: 'expert',
    title: 'Expert: Surgical Operations',
    description: 'Perform precise history edits and tagging.',
    tasks: [
      {
        id: 'tag',
        instruction: "Let's mark this moment in history. Create a version tag 'v1.0'.",
        check: (state) => state.tags && state.tags['v1.0'],
        hint: "Type 'git tag v1.0'"
      },
      {
        id: 'cherry_pick',
        instruction: "We need a specific commit from another branch without merging the whole thing. Cherry-pick the commit 'c2' (simulated ID, check log if unsure).",
        setup: (state) => {
            // Ensure a divergent branch exists with a commit to pick
            if (!state.branches.includes('experiment')) {
                state.branches.push('experiment');
                state.lane_map['experiment'] = 2;
                // Create a commit on experiment that isn't on main
                const c2 = {
                    id: 'c2', short_id: '8b9c2d', message: 'experimental feature',
                    branch: 'experiment', parent: state.commits[0].id, lane: 2, timestamp: new Date().toISOString()
                };
                state.commits.push(c2);
                state.branch_heads['experiment'] = 'c2';
            }
        },
        check: (state, lastCmd) => lastCmd?.cmd === 'cherry-pick',
        hint: "Type 'git cherry-pick c2'"
      },
      {
        id: 'revert',
        instruction: "That cherry-pick wasn't quite right. Revert the last commit.",
        check: (state, lastCmd) => lastCmd?.cmd === 'revert',
        hint: "Type 'git revert HEAD' or 'git revert <commit-hash>'"
      }
    ]
  }
];
