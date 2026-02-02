Pull latest changes from the remote repository.

Branch argument: "$ARGUMENTS"

Steps:
1. If a branch name was provided, pull that branch: `git pull origin <branch>`
2. If no branch was provided (empty argument), pull the current branch: `git pull`
3. Show the result — any new commits pulled, files changed, or "already up to date"
4. If there are merge conflicts, report them clearly and list the conflicted files
