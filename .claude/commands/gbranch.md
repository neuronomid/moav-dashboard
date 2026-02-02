Create a new branch and switch to it.

Branch name: "$ARGUMENTS"

Steps:
1. If no branch name was provided (empty argument), ask the user what the new branch should be called
2. Create and switch to the new branch: `git checkout -b <branchname>`
3. Confirm the switch was successful by running `git branch` to show the current branch
4. If the branch already exists, report the error and suggest using `/gswitch` instead
