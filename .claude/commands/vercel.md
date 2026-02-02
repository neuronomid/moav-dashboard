Deploy the current project to Vercel production.

Steps:

1. Check Vercel CLI is installed and logged in:
   ```bash
   vercel whoami
   ```

2. If not logged in, run:
   ```bash
   vercel login
   ```

3. Deploy to production:
   ```bash
   vercel --prod
   ```

4. After deployment:
   - Display the deployment URL
   - Show the build status
   - Mention that logs can be viewed with: `vercel logs <url>`

5. If deployment fails:
   - Show the error output
   - Suggest common fixes (check vercel.json, environment variables, build settings)
