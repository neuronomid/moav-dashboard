Commit all changes with a descriptive commit message.

Steps:
1. Stage all changes: `git add -A`
2. Run `git diff --cached --stat` and `git diff --cached` to analyze what changed
3. If the user provided a message as argument: "$ARGUMENTS", use that as the commit message
4. If no message was provided (empty argument), analyze the staged diff and generate a clear commit message using conventional commit format: `type(scope): description`
   - Types: feat, fix, refactor, docs, style, test, chore, build, ci, perf
   - Keep it concise but descriptive
5. Commit the changes with the message
6. Show the result with `git log --oneline -1`

Important:
- Always use conventional commit format: `type(scope): description`
- If the diff is large, summarize the key changes
- Never skip staging — always run `git add -A` first
