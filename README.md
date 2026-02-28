# Omit

A mobile-first productivity app that helps users stay focused by blocking distracting apps and websites during focus sessions. Built with React, Capacitor, and native Android services.

## Features

- **Focus Sessions** — Start timed focus sessions with configurable durations and a visual countdown timer with pause/resume
- **App & Website Blocking** — Block distracting websites (Instagram, TikTok, Twitter, YouTube, Reddit, etc.) and native Android apps during focus sessions or persistently
- **Task Management** — Create, track, and complete tasks with priorities (High/Medium/Low), due dates, and Today/Upcoming views
- **Productivity Stats** — Weekly focus hours charts, focus score, task completion metrics, and deep work breakdowns
- **Strict Mode** — Prevents exiting blocked apps once a session starts
- **Browser Extension Sync** — Communicates with a companion browser extension for cross-platform blocking
- **Notifications** — Task reminders, focus session alerts, and persistent timer notifications
- **Dark Mode** — Full light/dark theme support
- **Authentication** — Email/password and Google OAuth via Supabase

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite 7 |
| Styling | Tailwind CSS, shadcn/ui, Radix UI, Lucide icons |
| State | React Query (TanStack), React Context |
| Forms | React Hook Form, Zod validation |
| Backend | Supabase (PostgreSQL, Auth, Row-Level Security) |
| Mobile | Capacitor 8 (Android) |
| Native | Custom Java Accessibility Service + Overlay Service |
| Charts | Recharts |
| Deployment | Vercel (web), Capacitor (Android APK) |

## Project Structure

```
src/
├── pages/              # Route-level components
│   ├── Dashboard.tsx       # Home screen with focus controls
│   ├── FocusTimer.tsx      # Active session countdown
│   ├── SocialBlocker.tsx   # Configure app/website blocking
│   ├── Tasks.tsx           # Task management
│   ├── Stats.tsx           # Analytics & productivity stats
│   ├── Settings.tsx        # User preferences
│   ├── Blocked.tsx         # Full-screen blocking overlay
│   ├── Login.tsx           # Sign in
│   ├── SignUp.tsx          # Registration
│   └── ...
├── components/         # Reusable UI components
│   ├── AndroidAppBlocker.tsx       # Native Android app blocking UI
│   ├── PersistentBlockerManager.tsx # Syncs blocking state to native
│   ├── ProtectedRoute.tsx          # Auth guard
│   ├── QuickAddTaskModal.tsx       # Quick task creation
│   ├── ui/                         # shadcn/ui primitives (60+ components)
│   └── ...
├── contexts/
│   └── AuthContext.tsx     # Auth state (sign in/up, OAuth, session)
├── hooks/
│   ├── use-mobile.tsx          # Mobile viewport detection
│   ├── useSwipeNavigation.ts   # Swipe gesture routing
│   └── useTaskNotifications.ts # Task reminder scheduling
├── lib/
│   ├── supabase.ts         # Supabase client init
│   ├── api.ts              # React Query hooks (tasks, blocked apps, sessions)
│   ├── storage.ts          # Hybrid storage (Capacitor Preferences + localStorage)
│   ├── app-blocker.ts      # Native Android plugin interface
│   └── extension-sync.ts   # Browser extension communication
└── utils/
    └── notifications.ts    # Notification scheduling & channels

android/
└── app/src/main/java/com/omit/app/
    ├── AppBlockerPlugin.java       # Capacitor plugin bridge
    ├── AppBlockerService.java      # Accessibility service (monitors app switches)
    ├── BlockingOverlayService.java # Overlay service (displays blocking screen)
    └── MainActivity.java
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Android Studio (for mobile builds)

### Installation

```sh
# Clone the repository
git clone https://github.com/<your-username>/Omit-MobileApp.git
cd Omit-MobileApp

# Install dependencies
npm install

# Create a .env file with your Supabase credentials
# VITE_SUPABASE_URL=<your-supabase-url>
# VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>

# Start the dev server
npm run dev
```

The app runs at `http://localhost:5173`.

### Android Build

```sh
# Build the web app
npm run build

# Sync to Android project
npx cap sync android

# Open in Android Studio
npx cap open android
```

**Required Android permissions** (configured in `AndroidManifest.xml`):
- `SYSTEM_ALERT_WINDOW` — Blocking overlay
- `PACKAGE_USAGE_STATS` — App usage monitoring
- `QUERY_ALL_PACKAGES` — Installed app discovery
- `POST_NOTIFICATIONS` — Focus/task notifications
- Accessibility Service — App switch detection

## Database Schema

The app uses four Supabase tables, all protected by Row-Level Security:

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (id, email, username) |
| `tasks` | Tasks with title, description, priority, due date, completion status |
| `blocked_apps` | Blocked websites/apps with name, URL, enabled state, and block mode (`always` or `focus`) |
| `focus_sessions` | Recorded sessions with start time, duration, and apps blocked count |

The migration file is at `supabase_migration.sql`.

## Architecture

```
┌─────────────┐    postMessage    ┌───────────────────┐
│  Browser     │◄────────────────►│  React Web App    │
│  Extension   │                  │  (Vite + React)   │
└─────────────┘                  └────────┬──────────┘
                                          │
                              ┌───────────┼───────────┐
                              │    Capacitor Bridge    │
                              └───────────┬───────────┘
                                          │
                         ┌────────────────┼────────────────┐
                         │          Android Native          │
                         │  ┌──────────────────────────┐   │
                         │  │  Accessibility Service    │   │
                         │  │  (monitors app switches)  │   │
                         │  └────────────┬─────────────┘   │
                         │               │                  │
                         │  ┌────────────▼─────────────┐   │
                         │  │  Overlay Service          │   │
                         │  │  (displays block screen)  │   │
                         │  └──────────────────────────┘   │
                         └─────────────────────────────────┘
                                          │
                                          ▼
                              ┌───────────────────────┐
                              │  Supabase (Postgres)   │
                              │  Auth + RLS + Storage  │
                              └───────────────────────┘
```

**State management strategy:**
- **Global** — React Context for auth session
- **Server** — React Query for tasks, blocked apps, focus sessions (cached, synced with Supabase)
- **Local** — Capacitor Preferences + localStorage for settings and daily stats

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server on port 5173 |
| `npm run build` | Production build to `dist/` |
| `npm run lint` | Run ESLint |

## License

Private project — all rights reserved.
