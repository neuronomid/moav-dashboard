Switch to an existing branch.

Branch name: "$ARGUMENTS"

Steps:
1. If no branch name was provided (empty argument), show available branches with `git branch` and ask the user which one to switch to
2. Check for uncommitted changes with `git status --porcelain`
3. If there are uncommitted changes, warn the user and ask if they want to proceed (changes may be lost) or if they should commit first using `/gsave`
4. Switch to the branch: `git checkout <branchname>`
5. Confirm the switch was successful
