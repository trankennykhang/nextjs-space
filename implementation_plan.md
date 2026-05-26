# Implementation Plan - Global Data Persistence with Cloudflare KV

Introduce global database persistence to the personal Project Tracker application. By binding a **Cloudflare KV (Key-Value) Namespace**, your project logs and timeline activities will be stored in Cloudflare's distributed edge network, allowing you to access and modify the same data from any laptop or device.

---

## Technical Approach

We will implement a **hybrid data lifecycle** inside `src/app/api/projects/route.ts` that detects the environment and uses the best available storage medium:
1. **Cloudflare KV (Production/Edge)**: If the Cloudflare binding `PROJECTS_KV` is available, the server will read and write the database JSON directly from/to Cloudflare's global KV store under the key `"projects_data"`.
2. **Local Filesystem (Development)**: If the KV binding is not available (such as during local development using `npm run dev`), the server will read and write to the local `src/data/projects.json` file on disk.
3. **Client LocalStorage (Safety Fallback)**: If both KV and the local filesystem are offline/inaccessible, the client application will preserve changes inside browser `localStorage` and sync them upon recovery.

---

## Proposed Changes

### 1. Configure Cloudflare KV Binding

#### [MODIFY] [wrangler.jsonc](file:///home/kenny/www/nodejs/nextjs-space/wrangler.jsonc)
Add the KV namespace binding to wrangler.
```jsonc
	"kv_namespaces": [
		{
			"binding": "PROJECTS_KV",
			"id": "PLACEHOLDER_KV_ID"
		}
	],
```

---

### 2. Update API Routing Handler

#### [MODIFY] [route.ts](file:///home/kenny/www/nodejs/nextjs-space/src/app/api/projects/route.ts)
Update GET/POST handlers to interface with Cloudflare KV using `getCloudflareContext()` with graceful fallback handling:
* **GET**:
  * Check for KV `PROJECTS_KV` namespace.
  * If KV is present and has the key `"projects_data"`, parse and return it.
  * Otherwise, parse and return the local `src/data/projects.json` file on disk.
* **POST**:
  * Check for KV `PROJECTS_KV` namespace.
  * If KV is present, stringify the payload and store it inside KV.
  * Try writing to the local filesystem file `src/data/projects.json` (which will succeed in local dev and fail harmlessly in production).
  * Respond with `source: "kv"` if stored in KV, or `source: "fs"` if stored locally.

---

## Step-by-Step Activation Instructions

Since this is for your personal deployment, here are the simple commands you'll run to create and activate your Cloudflare KV database:

1. **Create the KV Namespace on Cloudflare**:
   Run this wrangler command in your terminal to create a namespace named `projects-database`:
   ```bash
   npx wrangler kv:namespace create PROJECTS_KV
   ```
   *This command will output two config blocks (one for your standard wrangler.jsonc, and one for preview).*

2. **Add the Binding ID to `wrangler.jsonc`**:
   Copy the `id` returned from that command and paste it inside `wrangler.jsonc` (we will set up the placeholder binding for you).

3. **Deploy to Cloudflare**:
   Redeploy the application so that the Worker has access to the KV namespace:
   ```bash
   npm run deploy
   ```
