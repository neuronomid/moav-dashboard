Revert to the previous commit. Use this when development went wrong and you want to discard recent changes.

Steps:
1. Show the current commit that will be discarded: `git log --oneline -1`
2. Also show the commit you will revert to: `git log --oneline -2`
3. Display warning: "WARNING: This will permanently discard the last commit and all its changes."
4. Ask for explicit user confirmation: "Do you want to revert to the previous commit?"
5. Only proceed after user confirms
6. When confirmed:
   - Run: `git reset --hard HEAD~1`
   - Show the commit you are now on: `git log --oneline -1`

Important:
- This is a destructive operation — always require explicit user confirmation
- Never proceed without the user saying yes
