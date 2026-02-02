Merge the specified branch INTO the current branch.

Branch to merge: "$ARGUMENTS"

Steps:
1. If no branch name was provided (empty argument), ask the user which branch to merge
2. Show which branch you're currently on: `git branch --show-current`
3. Merge the specified branch: `git merge <branchname>`
4. Report the result:
   - On success: show what was merged and any files changed
   - On conflict: list the conflicted files and advise the user to resolve them
