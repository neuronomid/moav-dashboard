Show commit history.

Argument: "$ARGUMENTS"

Steps:
1. If a number was provided as argument, show that many commits
2. If no argument was provided, default to showing the last 10 commits
3. Run: `git log --oneline --graph --decorate -n <count>`
4. Display the results in a clear, readable format
