# Implementation Plan - Project Tracker with JSON Storage

Add a sleek, personal project tracking application to the Next.js Cloudflare Worker template. The application will store project lists, statuses, and detailed activity timelines in a JSON file (with an automatic browser `localStorage` fallback for serverless deployments).

## Design & Aesthetics (Premium Dashboard)
Following our rich design guidelines, the app will feature:
* **Sleek Dark Mode Aesthetic**: Deep slate/zinc backgrounds, vibrant gradients (indigo-to-violet/cyan), and clean white text.
* **Modern Master-Detail Layout**:
  * **Left Sidebar**: Stats counter (Total, Active, Completed), Search bar, and a list of projects with neon status badges (e.g., blinking green for "Active", amber for "On Hold", purple for "Completed").
  * **Main Content Panel**: High-contrast detail card for the selected project, an interactive vertical activity history timeline, and quick-action inputs.
* **Micro-animations**: Smooth hover transitions, fade-in timeline nodes, and springy button presses.
* **Add/Log Functionality**: Ability to create new projects and add activities directly from the dashboard.

---

## Proposed Changes

### 1. Data Layer & API Configuration

#### [NEW] [projects.json](file:///home/kenny/www/nodejs/nextjs-space/src/data/projects.json)
Create a seed JSON file representing the starting database.
```json
[
  {
    "id": "proj-1",
    "name": "ProjectSpace Tracker",
    "description": "Building a premium, interactive personal dashboard to track development progress.",
    "status": "Active",
    "createdAt": "2026-05-26",
    "activities": [
      {
        "id": "act-1",
        "date": "2026-05-26",
        "description": "Created implementation plan and initialized repository structures."
      },
      {
        "id": "act-2",
        "date": "2026-05-26",
        "description": "Configured Next.js route handlers for reading and writing data."
      }
    ]
  },
  {
    "id": "proj-2",
    "name": "Cloudflare Deployment Setup",
    "description": "Configuring wrangler.jsonc and OpenNext for deployment onto global edge servers.",
    "status": "Planning",
    "createdAt": "2026-05-25",
    "activities": [
      {
        "id": "act-3",
        "date": "2026-05-25",
        "description": "Analyzed compatibility flags and verified build pipelines."
      }
    ]
  }
]
```

#### [NEW] [route.ts](file:///home/kenny/www/nodejs/nextjs-space/src/app/api/projects/route.ts)
A Next.js API Route Handler that will:
* **GET**: Read from `src/data/projects.json` (falling back to a default seed if missing).
* **POST**: Receive the updated projects array and write it back to `src/data/projects.json` using Node's `fs/promises`.
* **Resilience**: If the filesystem is read-only (e.g., running inside a deployed Cloudflare Worker), the API will return a descriptive header/response so that the client application can gracefully fallback to syncing edits via browser `localStorage`.

---

### 2. Frontend Interface & UI

#### [MODIFY] [page.tsx](file:///home/kenny/www/nodejs/nextjs-space/src/app/page.tsx)
Replace the starter homepage with the ProjectSpace Tracker Dashboard:
* **State Management**:
  * Loads initial data from `/api/projects`.
  * Checks browser `localStorage` for any updates (if deployed or if local filesystem is read-only).
  * Automatically stores updates locally when filesystem writes are disabled.
* **Components & Layout**:
  * **Layout Wrapper**: A full-bleed dashboard with a modern font (Geist/Sans) and responsive scaling.
  * **Sidebar**:
    * Clean logo: "ProjectSpace" with a glowing purple dot.
    * Mini Statistics Bar: Dynamic counters summarizing Project statuses.
    * Project Search & Filter.
    * List of projects with custom hover cards, active selections, and neon status badges.
    * "New Project" button showing a sleek form.
  * **Main Content Area**:
    * Dynamic detail panel when a project is selected (otherwise shows an elegant "select a project" greeting).
    * Project description and status editor.
    * **Activity Feed (Vertical Timeline)**: An elegant track connecting timeline circles with animated details.
    * **Quick Activity Logger**: An inline textbox to quickly add a new activity description. The date will default to today's date.
* **Modern Styling**: Styled purely with TailwindCSS v4 and native CSS variables, with glassmorphism backdrops (`backdrop-blur-md bg-zinc-900/50 border-zinc-800/50`).

---

## Verification Plan

### Automated & Manual Verification
1. **Local Dev Run**: Run `npm run dev` and open the local preview.
2. **Project Listing**: Verify that the projects from the JSON file are displayed on the home page.
3. **Timeline Inspection**: Select a project and verify its timeline activities show up with correct dates and descriptions.
4. **Interactive testing**:
   * Add a new project and verify it appears in the sidebar.
   * Add a new activity to an existing project and verify it renders instantly in the timeline.
   * Verify that the local JSON file `src/data/projects.json` is successfully updated on the local filesystem.
5. **Typescript Check**: Run `npm run check` to ensure there are no compilation or linter errors.
