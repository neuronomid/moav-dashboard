Commit all current changes and push the specified branch to GitHub.

Branch argument: "$ARGUMENTS"

Steps:

**If a branch name was provided:**
1. Stage all changes: `git add -A`
2. Run `git diff --cached --stat` to see what changed
3. Generate a proper conventional commit message based on the changes (type(scope): description)
4. Commit the changes
5. Push the branch to GitHub: `git push origin <branchname>`
6. If the push fails because the branch doesn't exist on remote, use: `git push -u origin <branchname>`
7. Show confirmation of the push

**If no branch name was provided (empty argument):**
1. Ask the user: "Which branch do you want to push to GitHub?"
2. Show a list of available branches using `git branch`
3. Present the branches as options with "main" as the first/default option
4. Wait for the user to choose before proceeding
5. Then follow the steps above with the chosen branch
