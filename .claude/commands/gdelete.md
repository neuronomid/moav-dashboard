Delete a branch with safety checks. Requires user confirmation.

Branch to delete: "$ARGUMENTS"

Steps:
1. If no branch name was provided (empty argument), ask the user which branch to delete
2. Make sure the user is NOT currently on the branch to be deleted — if so, switch to main first
3. Check if the branch has been merged to main: `git branch --merged main`
4. Show a clear report:
   - If merged to main: "Branch '<name>' has been merged to main."
   - If NOT merged to main: "WARNING: Branch '<name>' has NOT been merged to main. Deleting will lose all unmerged changes."
5. Ask for explicit user confirmation: "Do you want to proceed with deleting this branch?"
6. Only delete after user confirms
7. When confirmed:
   - For local delete: `git branch -d <branchname>` (or `-D` if unmerged and user confirmed)
   - Show confirmation that the branch was deleted

Important:
- Do NOT merge the branch to main before deleting — only report the merge status
- Always require explicit user confirmation before deleting
