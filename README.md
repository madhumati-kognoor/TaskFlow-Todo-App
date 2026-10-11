# TaskFlow — Your productivity, in flow

A responsive, installable productivity workspace built with **HTML5, CSS3, and vanilla JavaScript**. TaskFlow brings a calm, premium dashboard, focused task planning, and device-local persistence together without a backend.

TaskFlow includes a collapsible desktop sidebar, quick mobile navigation, a live deadlines overview, clickable summary metrics, priority-led sorting, multi-criteria filtering, accessible task editing, undoable deletion, and offline PWA support.

---

## 🌟 Key Features

1. **Full-Width Desktop Dashboard**:
   - Replaces narrow card containers with an expansive productivity workspace that makes full use of wide desktop displays.
2. **Fixed-Width Sidebar Navigation**:
   - **Branding**: Checklist logo and branding.
   - **Overview Filters**: Dashboard / My Tasks, Today, Upcoming, and Completed.
   - **Categories**: Dedicated views for **Work**, **Personal**, and **Study**.
   - **Real-Time Badges**: Dynamic counters for every category and filter.
3. **Interactive Metric Summary Cards**:
   - Live summary cards displaying **Total Tasks**, **Completed Tasks** (with % rate), **Pending Tasks**, and **Overdue Tasks**.
   - **One-Click Filtering**: Clicking any metric card (e.g. *Overdue* or *Completed*) instantly filters the board to those items.
4. **Visual Completion Progress Bar**:
   - Animated progress fill calculating real-time completion percentage ($0\%$ to $100\%$) using tabular numbers (`tabular-nums`) to prevent layout jitter.
5. **Multi-Option Sorting**:
   - Dynamic sorting by:
     - **Recently Added** (Newest first)
     - **Due Date** (Earliest deadline first)
     - **Priority** (High $\rightarrow$ Medium $\rightarrow$ Low)
     - **Title** (Alphabetical A–Z)
6. **Task Operations & Safe Deletion**:
   - **Add Task**: Required title, optional description, category, due date, and priority.
   - **Edit Task**: Accessible modal dialog for all task fields with focus management and `Escape` key closing.
   - **Delete with 5-Second Undo Toast**: Eliminates accidental data loss by offering an instant "Undo" button before permanent removal.
   - **Clear Completed**: Quick action to purge all finished tasks.
7. **Real-Time Search & Contextual Empty States**:
   - Instant search by task title or description, with priority and category filters.
   - Context-aware empty state illustrations and tailored copy for searches, categories, overdue, and completed filters.
8. **Accessibility & Design Precision**:
   - Native dark mode form controls (`color-scheme: dark;`) for clean date pickers.
   - Reduced-motion support (`@media (prefers-reduced-motion: reduce)`).
   - Keyboard navigation support (`Tab`, `Enter`, `Escape`) across all controls.
9. **Responsive Drawer for Mobile & Tablet**:
   - Slide-out drawer menu with hamburger button toggle (`☰`) and dark backdrop.
10. **Installable PWA & Offline Support**:
    - Valid `manifest.json`, high-resolution checklist icons ($192\text{px}$, $512\text{px}$, SVG), Service Worker (`sw.js`) caching, and offline status indicator.
11. **Data Persistence**:
    - Automatic browser `localStorage` saving under the existing `syntecxhub_tasks` key, with safe schema normalization and compatible `taskflow_tasks` migration.
    - Tasks remain on the same browser profile and app origin; they do not sync between devices or browsers.

---

## 🎨 Theme & Design System

- **Background Canvas**: Deep space navy (`#060911` and `#0a0f1d`).
- **Surface Elevation**: Dark slate cards (`#10172a` and `#15203b`) with subtle translucent borders (`rgba(255, 255, 255, 0.07)`).
- **Accents**: Restrained cyan-blue (`#38bdf8`) used intentionally for focus rings and active states.
- **Categories**:
  - **Work**: Cyan-Blue (`#38bdf8`)
  - **Personal**: Lavender-Purple (`#a78bfa`)
  - **Study**: Emerald-Green (`#34d399`)
- **Typography**: Optimized system font stack with tabular numerics.

---

## 📁 Project Structure

```text
syntecxhub_todo_list/
│
├── index.html        # Semantic dashboard markup with PWA meta & accessible modals
├── style.css         # Full-width responsive styles, CSS variables, & animations
├── script.js         # Vanilla JS logic, sorting, undo toast, metrics, & PWA
├── sw.js             # Service Worker for offline asset caching
├── manifest.json     # PWA manifest (app name, icons, theme color, standalone)
├── README.md         # Project documentation and submission overview
│
└── icons/            # App icon assets
    ├── icon-192.png         # 192x192 PNG app icon
    ├── icon-512.png         # 512x512 PNG app icon
    ├── favicon-32.png       # 32x32 browser tab favicon
    ├── apple-touch-icon.png # 180x180 iOS home screen icon
    └── icon.svg             # Scalable vector checklist icon
```

---

## 🚀 How to Run and Test Locally

### Option A: VS Code Live Server (Recommended)
1. Open this folder in **Visual Studio Code**.
2. Right-click **`index.html`** and select **"Open with Live Server"**.

### Option B: Python Local Server
Run in PowerShell:
```powershell
python -m http.server 8000
```
Then visit: `http://localhost:8000`

---

---

## 👤 Author & Acknowledgments

- **Intern**: Front-End Development Intern
- **Organization**: [Syntecxhub](https://syntecxhub.com)
- **Project**: Week 2 Front-End Internship Project — Premium TaskFlow Web Application
