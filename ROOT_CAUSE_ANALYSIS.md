# Root Cause Analysis: Stale GitHub Pages Deployment

## Executive Summary

**The deployed site (https://ashup1711.github.io/rrfashion/) is serving stale content from July 8, 2026, because the GitHub Pages "Build and deployment" source setting is mismatched with the current deploy workflow.**

## Timeline of Events

| Date | Event | Commit | Deployment Method |
|------|-------|--------|-------------------|
| Jul 8, 16:57 | Switched to `actions/deploy-pages@v4` | `2b21fbd` | GitHub Actions (workflow) mode |
| Jul 8, various | Multiple successful deployments | `8f81df4` etc. | `actions/deploy-pages@v4` (worked ✅) |
| Jul 23, 15:21 | **Simplified workflow to `peaceiris/actions-gh-pages@v4`** | **`61a8256`** | Branch-push mode |
| Jul 23, 15:21 | Deploy workflow runs successfully | Run ID: 29997038144 | Pushes to gh-pages ✅ |
| Jul 23, now | **Live site still serves Jul 8 content** | — | **NOT deployed ❌** |

## Root Cause: Pages Source Mismatch

### The Problem in One Sentence

**The GitHub Pages "Build and deployment" source is set to "GitHub Actions" (configured when `actions/deploy-pages` was used), but the current deploy workflow (`peaceiris/actions-gh-pages`) pushes to a branch — which only works when the source is "Deploy from a branch: gh-pages".**

### How GitHub Pages Deployment Works

GitHub Pages has two mutually exclusive modes:

1. **"Deploy from a branch" (legacy mode):**
   - GitHub automatically watches the configured branch (e.g., `gh-pages`)
   - When new commits are pushed, the built-in `pages-build-deployment` workflow auto-triggers
   - The files are copied from the branch to the Pages CDN
   - Used with: `peaceiris/actions-gh-pages`, `JamesIves/github-pages-deploy-action`

2. **"GitHub Actions" (workflow mode):**
   - GitHub does NOT auto-deploy from branch pushes
   - You must use `actions/deploy-pages` to trigger deployment via the Deployment API
   - Used with: `actions/upload-pages-artifact` + `actions/deploy-pages`

### The Chain of Events

**Step 1 — Previous workflow (commit `2b21fbd`, Jul 8):**
The deploy workflow used `actions/deploy-pages@v4`:
```yaml
- name: Upload artifact
  uses: actions/upload-pages-artifact@v3
  with:
    path: ./frontend/dist

- name: Deploy to GitHub Pages
  id: deployment
  uses: actions/deploy-pages@v4
```

For this to work, the Pages source was set to **"GitHub Actions"** in the repo Settings → Pages.

**Step 2 — Current workflow (commit `61a8256`, Jul 23):**
The deploy workflow was simplified to use `peaceiris/actions-gh-pages@v4`:
```yaml
- uses: peaceiris/actions-gh-pages@v4
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    publish_dir: frontend/dist
    enable_jekyll: false
    user_name: github-actions
    user_email: github-actions@github.com
    commit_message: "deploy: ${{ github.sha }}"
```

This action works by **pushing the build artifacts to the `gh-pages` branch**. It does NOT call the Pages Deployment API. The actual deployment from the branch to the CDN depends on GitHub's internal `pages-build-deployment` workflow.

**Step 3 — The break (the missed setting change):**
When switching the workflow back to peaceiris, **the Pages source setting in Settings → Pages was never changed back from "GitHub Actions" to "Deploy from a branch: gh-pages".**

Since the source is "GitHub Actions":
- The `pages-build-deployment` workflow is NOT triggered by pushes to gh-pages
- No automatic copy from gh-pages branch to the Pages CDN occurs
- The old deployment (from Jul 8) remains live indefinitely

## Evidence

### Evidence 1: gh-pages branch has the latest build
```
$ git show origin/gh-pages:index.html | grep -o 'assets/index-[^.]*\.js'
→ assets/index-D-dCmKQw.js      # NEW build (correct code-split chunks)
```

### Evidence 2: Live site serves OLD build
```
$ curl -s "https://ashup1711.github.io/rrfashion/index.html" | grep -o 'assets/index-[^.]*\.js'
→ assets/index-BFkpu5ca.js       # OLD build (364KB single bundle)
```

### Evidence 3: The new JS file returns 404 on the live server
```
$ curl -s -o /dev/null -w "HTTP %{http_code}" "https://ashup1711.github.io/rrfashion/assets/index-D-dCmKQw.js"
→ HTTP 404
```

### Evidence 4: Last-modified header shows Jul 8
```
$ curl -sI "https://ashup1711.github.io/rrfashion/index.html" | grep -i last-modified
→ last-modified: Wed, 08 Jul 2026 12:15:16 GMT
```

### Evidence 5: Old file is NOT in gh-pages branch (peaceiris cleans it)
```
$ git ls-tree -r origin/gh-pages --name-name | grep "index-BFkpu5ca"
→ (no output — file doesn't exist in gh-pages)
```

### Evidence 6: Deployments API shows no deployments after Jul 8
```
curl -s "https://api.github.com/repos/ashup1711/rrfashion/deployments"
→ Last deployment: 8f81df4 on 2026-07-08T12:14:44Z
  (no deployments for 61a8256 or 8eeb99f)
```

### Evidence 7: Workflow ran successfully but Pages not updated
```
Run ID=29997038144 name="Deploy frontend to GitHub Pages" conclusion=success head_sha=61a8256
→ Workflow succeeded but live site unchanged
```

### Evidence 8: Peaceiris action only pushes to branch (no deploy API call)
From the peaceiris README: "This action only pushes the commit to the gh-pages branch — the actual deployment is done by GitHub as a followup workflow." The follow-up workflow (`pages-build-deployment`) only runs when Pages source is "Deploy from a branch".

## Secondary Issues

### 1. `runtime-env.js` points to `localhost:3000/api`
The file `frontend/public/runtime-env.js` contains:
```js
window.__RUNTIME_ENV__ = {
  API_URL: 'http://localhost:3000/api',
};
```
This means even after the deployment fix, the frontend will try to call `http://localhost:3000/api` for all API requests, which won't work from GitHub Pages. The previous workflow (commit `2b21fbd`) had a step to inject the correct API URL:
```yaml
- name: Inject runtime API URL
  run: |
    API_URL='${{ vars.FRONTEND_API_URL }}'
    echo "window.__RUNTIME_ENV__ = { API_URL: '$API_URL' };" > dist/runtime-env.js
```
This step was **removed** in the simplified workflow. To fix this, either:
- Re-add the injection step to set the API URL to a publicly accessible backend
- Or use a GitHub environment variable like `${{ vars.FRONTEND_API_URL }}`

### 2. PWA Service Worker Caching (Post-Fix Issue)
The VitePWA configuration uses `StaleWhileRevalidate` for JS/CSS assets with a 7-day cache. After the deployment is fixed:
- Returning users who have visited the old site may see stale content
- The service worker will update in the background, but the first load will show old UI
- A `workbox.routing.setDefaultHandler()` change or `skipWaiting()` + `clientsClaim()` may be needed

### 3. Unnecessary Permissions
The deploy workflow includes:
```yaml
permissions:
  contents: write
  pages: write     # NOT needed by peaceiris (only by actions/deploy-pages)
  id-token: write  # NOT needed by peaceiris (only by actions/deploy-pages)
```
These extra permissions are harmless but misleading.

### 4. Missing `react-helmet-async`
The local dev server fails `npm run build` with:
```
[commonjs--resolver] Missing export "HelmetProvider" in "react-helmet-async"
```
This indicates a dependency issue that was likely manually patched in node_modules but not committed to `package-lock.json`. The deploy workflow hides this because `npx vite build` is used instead of `npm run build` (which may use a different build script). But this could break future builds.

## The Fix

### Immediate Fix (5 minutes, no code change needed)

**Change the GitHub Pages source in Settings:**

1. Go to https://github.com/ashup1711/rrfashion/settings/pages
2. Under "Build and deployment" → "Source", change from **"GitHub Actions"** to **"Deploy from a branch"**
3. Set **Branch** to `gh-pages` and **folder** to `/ (root)`
4. Click **Save**

After saving, GitHub will automatically trigger the `pages-build-deployment` workflow using the latest gh-pages commit. Within 1-2 minutes, the live site will serve the latest content.

### Long-term Fix Options

**Option A: Keep peaceiris + "Deploy from a branch" (Recommended)**
- Keep the current workflow as-is
- Update the Pages source to "Deploy from a branch: gh-pages / root"
- This requires no changes to the deploy workflow
- The workflow remains simple and fast

**Option B: Switch back to `actions/deploy-pages`** (if you want "GitHub Actions" mode)
- Keep the Pages source as "GitHub Actions"
- Update the workflow to use `actions/upload-pages-artifact` + `actions/deploy-pages`
- Re-add the `environment: github-pages` block and `url: ${{ steps.deployment.outputs.page_url }}`
- Re-add the `runtime-env.js` injection step

**Option C: Hybrid approach** (cleanest for this project)
1. Change Pages source to "Deploy from a branch: gh-pages / root"
2. Keep the current peaceiris workflow (it already works correctly)
3. Add a post-deploy step that injects the correct API URL into `runtime-env.js` before deploy
4. Remove unnecessary `pages: write` and `id-token: write` permissions from the deploy workflow

## Verification Steps

After applying the fix:

1. **Check the Actions tab** — you should see a new `pages-build-deployment` workflow triggered automatically
2. **Check the live site** — reload https://ashup1711.github.io/rrfashion/ with DevTools → Network tab
3. **Verify** the JS bundle URL changed from `index-BFkpu5ca.js` to `index-D-dCmKQw.js`
4. **Verify** code-split chunks appear in the Network tab (lazy-loaded chunks)
5. **Check** `last-modified` header is recent (not Jul 8)

## PWA Cache Clearing (for returning users)

After the deployment is fixed, users who have visited the old site may need to:
1. Open DevTools → Application → Service Workers
2. Click "Unregister" on the old service worker
3. Hard refresh (Cmd+Shift+R) to load fresh assets
4. Or simply clear site data for the Pages domain
